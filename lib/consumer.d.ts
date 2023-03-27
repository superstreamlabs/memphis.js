import { Memphis } from './memphis';
import { Message } from './message';
export declare class Consumer {
    private connection;
    private stationName;
    private internalStationName;
    private consumerName;
    private internalConsumerName;
    private consumerGroup;
    private internalConsumerGroupName;
    private pullIntervalMs;
    private batchSize;
    private batchMaxTimeToWaitMs;
    private maxAckTimeMs;
    private maxMsgDeliveries;
    private eventEmitter;
    private pullInterval;
    private pingConsumerInvtervalMs;
    private pingConsumerInvterval;
    private startConsumeFromSequence;
    private lastMessages;
    context: object;
    private realName;
    private dlsMessages;
    private dlsCurrentIndex;
    constructor(connection: Memphis, stationName: string, consumerName: string, consumerGroup: string, pullIntervalMs: number, batchSize: number, batchMaxTimeToWaitMs: number, maxAckTimeMs: number, maxMsgDeliveries: number, startConsumeFromSequence: number, lastMessages: number, realName: string);
    setContext(context: Object): void;
    on(event: String, cb: (...args: any[]) => void): void;
    fetch({ batchSize }: {
        batchSize?: number;
    }): Promise<Message[]>;
    private _handleAsyncIterableSubscriber;
    private _pingConsumer;
    destroy(): Promise<void>;
    _getConsumerKey(): string;
    _getConsumerStation(): string;
}