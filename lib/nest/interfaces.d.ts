export interface MemphisConnectionOptions {
    host: string;
    port?: number;
    username: string;
    connectionToken: string;
    reconnect?: boolean;
    maxReconnect?: number;
    reconnectIntervalMs?: number;
    timeoutMs?: number;
}
export interface MemphisPattern<TPattern = string> {
    transport: string;
    pattern: TPattern;
}
export interface MemphisConsumerOptions {
    stationName: string;
    consumerName: string;
    consumerGroup?: string;
    pullIntervalMs?: number;
    batchSize?: number;
    batchMaxTimeToWaitMs?: number;
    maxAckTimeMs?: number;
    maxMsgDeliveries?: number;
    genUniqueSuffix?: boolean;
}
