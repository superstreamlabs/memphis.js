import * as events from 'events';
import * as broker from 'nats';

import { Memphis } from './memphis'
import { Message } from './message';
import { MemphisError } from './utils'


export class Consumer {
    private connection: Memphis;
    private stationName: string;
    private consumerName: string;
    private consumerGroup: string;
    private pullIntervalMs: number;
    private batchSize: number;
    private batchMaxTimeToWaitMs: number;
    private maxAckTimeMs: number;
    private maxMsgDeliveries: number;
    private eventEmitter: events.EventEmitter;
    private pullInterval: any;
    private pingConsumerInvtervalMs: number;
    private pingConsumerInvterval: any;
    private startConsumeFromSequence: number;
    private lastMessages: number;
    private pullSubscriber: broker.JetStreamPullSubscription;
    private subscription: broker.Subscription;
    public context: object;

    constructor(
        connection: Memphis,
        stationName: string,
        consumerName: string,
        consumerGroup: string,
        pullIntervalMs: number,
        batchSize: number,
        batchMaxTimeToWaitMs: number,
        maxAckTimeMs: number,
        maxMsgDeliveries: number,
        startConsumeFromSequence: number,
        lastMessages: number
    ) {
        this.connection = connection;
        this.stationName = stationName.toLowerCase();
        this.consumerName = consumerName.toLowerCase();
        this.consumerGroup = consumerGroup.toLowerCase();
        this.pullIntervalMs = pullIntervalMs;
        this.batchSize = batchSize;
        this.batchMaxTimeToWaitMs = batchMaxTimeToWaitMs;
        this.maxAckTimeMs = maxAckTimeMs;
        this.maxMsgDeliveries = maxMsgDeliveries;
        this.eventEmitter = new events.EventEmitter();
        this.pullInterval = null;
        this.pingConsumerInvtervalMs = 30000;
        this.pingConsumerInvterval = null;
        this.startConsumeFromSequence = startConsumeFromSequence;
        this.lastMessages = lastMessages;
        this.context = {};

    }

    /**
     * Creates an event listener.
     * @param {Object} context - context object that will be passed with each message.
     */
    setContext(context: Object): void {
        this.context = context;
    }

    /**
     * Creates an event listener.
     * @param {String} event - the event to listen to.
     * @param {Function} cb - a callback function.
     */
    on(event: String, cb: (...args: any[]) => void) {
        if (event === 'message') {
            const subject = this.stationName.replace(/\./g, '#').toLowerCase();
            const consumerGroup = this.consumerGroup.replace(/\./g, '#').toLowerCase();
            const consumerName = this.consumerName.replace(/\./g, '#').toLowerCase();
            this.connection.brokerConnection
                .pullSubscribe(`${subject}.final`, {
                    mack: true,
                    config: {
                        durable_name: this.consumerGroup ? consumerGroup : consumerName
                    }
                })
                .then(async (psub: broker.JetStreamPullSubscription) => {
                    this.pullSubscriber = psub;
                    psub.pull({
                        batch: this.batchSize,
                        expires: this.batchMaxTimeToWaitMs
                    });

                    const sub = this.connection.brokerManager.subscribe(`$memphis_dls_${subject}_${consumerGroup}`, {
                        queue: `$memphis_${subject}_${consumerGroup}`
                    });
                    this.subscription = sub;

                    this.pullInterval = setInterval(() => {
                        if (!this.connection.brokerManager.isClosed() || !this.pullSubscriber || !this.subscription)
                            psub.pull({
                                batch: this.batchSize,
                                expires: this.batchMaxTimeToWaitMs
                            });
                        else clearInterval(this.pullInterval);
                    }, this.pullIntervalMs);

                    this.pingConsumerInvterval = setInterval(async () => {
                        if (!this.connection.brokerManager.isClosed() || !this.pullSubscriber || !this.subscription) {
                            this._pingConsumer();
                        } else clearInterval(this.pingConsumerInvterval);
                    }, this.pingConsumerInvtervalMs);

                    this._handleAsyncIterableSubscriber(psub);
                    this._handleAsyncIterableSubscriber(sub);
                })
                .catch((error: any) => this.eventEmitter.emit('error', MemphisError(error)));
        }

        this.eventEmitter.on(<string>event, cb);
    }

    private async _handleAsyncIterableSubscriber(iter: any) {
        for await (const m of iter) {
            this.eventEmitter.emit('message', new Message(m, this.connection, this.consumerGroup), this.context);
        }
    }

    private async _pingConsumer() {
        try {
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            const consumerGroup = this.consumerGroup.replace(/\./g, '#').toLowerCase();
            const consumerName = this.consumerName.replace(/\./g, '#').toLowerCase();
            const durableName = consumerGroup || consumerName;
            await this.connection.brokerStats.consumers.info(stationName, durableName);
        } catch (ex) {
            this.eventEmitter.emit('error', MemphisError(new Error('station/consumer were not found')));
        }
    }

    public close(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        if (this.pullSubscriber) {
            this.pullSubscriber.unsubscribe();
            this.pullSubscriber = null;
        }
    }

    /**
     * Destroy the consumer.
     */
    async destroy(): Promise<void> {
        clearInterval(this.pullInterval);
        try {
            let removeConsumerReq = {
                name: this.consumerName,
                station_name: this.stationName,
                username: this.connection.username
            };
            const data = this.connection.JSONC.encode(removeConsumerReq);
            const res = await this.connection.brokerManager.request('$memphis_consumer_destructions', data);
            const errMsg = res.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
        } catch (ex) {
            if (ex.message?.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}
