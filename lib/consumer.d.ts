import { Memphis } from './memphis';
export declare class Consumer {
    private connection;
    private stationName;
    private consumerName;
    private consumerGroup;
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
    constructor(connection: Memphis, stationName: string, consumerName: string, consumerGroup: string, pullIntervalMs: number, batchSize: number, batchMaxTimeToWaitMs: number, maxAckTimeMs: number, maxMsgDeliveries: number, startConsumeFromSequence: number, lastMessages: number);
    setContext(context: Object): void;
    on(event: String, cb: (...args: any[]) => void): void;
    private _handleAsyncIterableSubscriber;
    private _pingConsumer;
    destroy(): Promise<void>;
}
