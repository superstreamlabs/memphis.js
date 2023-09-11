export interface MemphisConnectionOptions {
    host: string;
    port?: number;
    username: string;
    accountId?: number;
    connectionToken?: string;
    password?: string;
    reconnect?: boolean;
    maxReconnect?: number;
    reconnectIntervalMs?: number;
    timeoutMs?: number;
    keyFile?: string;
    certFile?: string;
    caFile?: string;
    suppressLogs?: boolean;
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
    startConsumeFromSequence?: number,
    lastMessages?: number,
    consumerPartitionKey?: string;
    
}
