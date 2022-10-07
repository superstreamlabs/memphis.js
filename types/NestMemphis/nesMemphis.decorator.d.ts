export declare const consumeMessage: ({ stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries }: {
    stationName: string;
    consumerName: string;
    consumerGroup: string;
    pullIntervalMs?: number;
    batchSize?: number;
    batchMaxTimeToWaitMs?: number;
    maxAckTimeMs?: number;
    maxMsgDeliveries?: number;
}) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
