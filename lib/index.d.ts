interface IRetentionTypes {
    MAX_MESSAGE_AGE_SECONDS: string;
    MESSAGES: string;
    BYTES: string;
}
interface IStorageTypes {
    FILE: string;
    MEMORY: string;
}
declare class Memphis {
    private isConnectionActive;
    connectionId: string;
    accessToken: string;
    host: string;
    managementPort: number;
    private tcpPort;
    private dataPort;
    private username;
    private connectionToken;
    private accessTokenTimeout;
    private pingTimeout;
    private client;
    private reconnectAttempts;
    private reconnect;
    private maxReconnect;
    private reconnectIntervalMs;
    private timeoutMs;
    private natsConnection;
    brokerConnection: any;
    brokerManager: any;
    brokerStats: any;
    retentionTypes: IRetentionTypes;
    storageTypes: IStorageTypes;
    constructor();
    /**
        * Creates connection with Memphis.
        * @param {String} host - memphis host.
        * @param {Number} managementPort - management port, default is 5555.
        * @param {Number} tcpPort - tcp port, default is 6666.
        * @param {Number} dataPort - data port, default is 7766 .
        * @param {String} username - user of type root/application.
        * @param {String} connectionToken - broker token.
        * @param {Boolean} reconnect - whether to do reconnect while connection is lost.
        * @param {Number} maxReconnect - The reconnect attempts.
        * @param {Number} reconnectIntervalMs - Interval in miliseconds between reconnect attempts.
        * @param {Number} timeoutMs - connection timeout in miliseconds.
    */
    connect({ host, managementPort, tcpPort, dataPort, username, connectionToken, reconnect, maxReconnect, reconnectIntervalMs, timeoutMs }: {
        host: string;
        managementPort?: number;
        tcpPort?: number;
        dataPort?: number;
        username: string;
        connectionToken: string;
        reconnect?: boolean;
        maxReconnect?: number;
        reconnectIntervalMs?: number;
        timeoutMs?: number;
    }): Promise<Memphis>;
    private _normalizeHost;
    private _keepAcessTokenFresh;
    private _pingServer;
    /**
        * Creates a factory.
        * @param {String} name - factory name.
        * @param {String} description - factory description (optional).
    */
    factory({ name, description }: {
        name: string;
        description?: string;
    }): Promise<Factory>;
    /**
        * Creates a station.
        * @param {String} name - station name.
        * @param {String} factoryName - factory name to link the station with.
        * @param {Memphis.retentionTypes} retentionType - retention type, default is MAX_MESSAGE_AGE_SECONDS.
        * @param {Number} retentionValue - number which represents the retention based on the retentionType, default is 604800.
        * @param {Memphis.storageTypes} storageType - persistance storage for messages of the station, default is storageTypes.FILE.
        * @param {Number} replicas - number of replicas for the messages of the data, default is 1.
        * @param {Boolean} dedupEnabled - whether to allow dedup mecanism, dedup happens based on message ID, default is false.
        * @param {Number} dedupWindowMs - time frame in which dedup track messages, default is 0.
    */
    station({ name, factoryName, retentionType, retentionValue, storageType, replicas, dedupEnabled, dedupWindowMs }: {
        name: string;
        factoryName: string;
        retentionType?: string;
        retentionValue?: number;
        storageType?: string;
        replicas?: number;
        dedupEnabled?: boolean;
        dedupWindowMs?: number;
    }): Promise<Station>;
    /**
        * Creates a producer.
        * @param {String} stationName - station name to produce messages into.
        * @param {String} producerName - name for the producer.
    */
    producer({ stationName, producerName }: {
        stationName: string;
        producerName: string;
    }): Promise<Producer>;
    /**
        * Creates a consumer.
        * @param {String} stationName - station name to consume messages from.
        * @param {String} consumerName - name for the consumer.
        * @param {String} consumerGroup - consumer group name, defaults to the consumer name.
        * @param {Number} pullIntervalMs - interval in miliseconds between pulls, default is 1000.
        * @param {Number} batchSize - pull batch size.
        * @param {Number} batchMaxTimeToWaitMs - max time in miliseconds to wait between pulls, defauls is 5000.
        * @param {Number} maxAckTimeMs - max time for ack a message in miliseconds, in case a message not acked in this time period the Memphis broker will resend it untill reaches the maxMsgDeliveries value
        * @param {Number} maxMsgDeliveries - max number of message deliveries, by default is 10
    */
    consumer({ stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries }: {
        stationName: string;
        consumerName: string;
        consumerGroup: string;
        pullIntervalMs?: number;
        batchSize?: number;
        batchMaxTimeToWaitMs?: number;
        maxAckTimeMs?: number;
        maxMsgDeliveries?: number;
    }): Promise<Consumer>;
    private _close;
    /**
        * Close Memphis connection.
    */
    close(): void;
}
declare class Producer {
    private connection;
    private producerName;
    private stationName;
    constructor(connection: Memphis, producerName: string, stationName: string);
    /**
        * Produces a message into a station.
        * @param {Uint8Array} message - message to send into the station.
        * @param {Number} ackWaitSec - max time in seconds to wait for an ack from memphis.
    */
    produce({ message, ackWaitSec }: {
        message: Uint8Array;
        ackWaitSec?: number;
    }): Promise<void>;
    /**
        * Destroy the producer.
    */
    destroy(): Promise<void>;
}
declare class Consumer {
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
    constructor(connection: Memphis, stationName: string, consumerName: string, consumerGroup: string, pullIntervalMs: number, batchSize: number, batchMaxTimeToWaitMs: number, maxAckTimeMs: number, maxMsgDeliveries: number);
    /**
        * Creates an event listener.
        * @param {String} event - the event to listen to.
        * @param {Function} cb - a callback function.
    */
    on(event: String, cb: (...args: any[]) => void): void;
    private _handleAsyncIterableSubscriber;
    private _pingConsumer;
    /**
        * Destroy the consumer.
    */
    destroy(): Promise<void>;
}
declare class Factory {
    private connection;
    private name;
    constructor(connection: Memphis, name: string);
    /**
        * Destroy the factory.
    */
    destroy(): Promise<void>;
}
declare class Station {
    private connection;
    private name;
    constructor(connection: Memphis, name: string);
    /**
       * Destroy the station.
   */
    destroy(): Promise<void>;
}
declare const MemphisInstance: Memphis;
export = MemphisInstance;
