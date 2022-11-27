import * as broker from 'nats';
import { MsgHdrs } from 'nats';
import * as protobuf from 'protobufjs';
interface IRetentionTypes {
    MAX_MESSAGE_AGE_SECONDS: string;
    MESSAGES: string;
    BYTES: string;
}
interface IStorageTypes {
    DISK: string;
    MEMORY: string;
}
export declare class Memphis {
    private isConnectionActive;
    connectionId: string;
    host: string;
    port: number;
    username: string;
    private connectionToken;
    private reconnect;
    private maxReconnect;
    private reconnectIntervalMs;
    private timeoutMs;
    brokerConnection: any;
    brokerManager: any;
    brokerStats: any;
    retentionTypes: IRetentionTypes;
    storageTypes: IStorageTypes;
    JSONC: any;
    stationSchemaDataMap: Map<string, Object>;
    schemaUpdatesSubs: Map<string, broker.Subscription>;
    producersPerStation: Map<string, number>;
    meassageDescriptors: Map<string, protobuf.Type>;
    constructor();
    connect({ host, port, username, connectionToken, reconnect, maxReconnect, reconnectIntervalMs, timeoutMs }: {
        host: string;
        port?: number;
        username: string;
        connectionToken: string;
        reconnect?: boolean;
        maxReconnect?: number;
        reconnectIntervalMs?: number;
        timeoutMs?: number;
    }): Promise<Memphis>;
    private _scemaUpdatesListener;
    private _listenForSchemaUpdates;
    private _normalizeHost;
    private _generateConnectionID;
    station({ name, retentionType, retentionValue, storageType, replicas, idempotencyWindowMs }: {
        name: string;
        retentionType?: string;
        retentionValue?: number;
        storageType?: string;
        replicas?: number;
        idempotencyWindowMs?: number;
    }): Promise<Station>;
    producer({ stationName, producerName, genUniqueSuffix }: {
        stationName: string;
        producerName: string;
        genUniqueSuffix?: boolean;
    }): Promise<Producer>;
    consumer({ stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries, genUniqueSuffix }: {
        stationName: string;
        consumerName: string;
        consumerGroup?: string;
        pullIntervalMs?: number;
        batchSize?: number;
        batchMaxTimeToWaitMs?: number;
        maxAckTimeMs?: number;
        maxMsgDeliveries?: number;
        genUniqueSuffix?: boolean;
    }): Promise<Consumer>;
    headers(): MsgHeaders;
    close(): void;
}
declare class MsgHeaders {
    headers: MsgHdrs;
    constructor();
    add(key: string, value: string): void;
}
declare class Producer {
    private connection;
    private producerName;
    private stationName;
    private internal_station;
    constructor(connection: Memphis, producerName: string, stationName: string);
    produce({ message, ackWaitSec, asyncProduce, headers, msgId }: {
        message: any;
        ackWaitSec?: number;
        asyncProduce?: boolean;
        headers?: MsgHeaders;
        msgId?: string;
    }): Promise<void>;
    private _validateMessage;
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
    on(event: String, cb: (...args: any[]) => void): void;
    private _handleAsyncIterableSubscriber;
    private _pingConsumer;
    destroy(): Promise<void>;
}
declare class Message {
    private message;
    constructor(message: broker.JsMsg);
    ack(): void;
    getData(): Uint8Array;
    getHeaders(): Map<string, string[]>;
}
declare class Station {
    private connection;
    private name;
    constructor(connection: Memphis, name: string);
    destroy(): Promise<void>;
}
interface MemphisType extends Memphis {
}
interface StationType extends Station {
}
interface ProducerType extends Producer {
}
interface ConsumerType extends Consumer {
}
interface MessageType extends Message {
}
interface MsgHeadersType extends MsgHeaders {
}
declare const MemphisInstance: MemphisType;
export type { MemphisType, StationType, ProducerType, ConsumerType, MessageType, MsgHeadersType };
export default MemphisInstance;
