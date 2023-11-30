import { GraphQLSchema } from 'graphql';
import * as broker from 'nats';
import * as protobuf from 'protobufjs';
import { Consumer } from './consumer';
import { Message } from './message';
import { MsgHeaders } from './message-header';
import { MemphisConsumerOptions } from './nest/interfaces';
import { Producer } from './producer';
import { Station } from './station';
interface IRetentionTypes {
    MAX_MESSAGE_AGE_SECONDS: string;
    MESSAGES: string;
    BYTES: string;
    ACK_BASED: string;
}
interface IStorageTypes {
    DISK: string;
    MEMORY: string;
}
declare class Memphis {
    private isConnectionActive;
    connectionId: string;
    host: string;
    port: number;
    username: string;
    accountId: number;
    private connectionToken;
    private password;
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
    clientsPerStation: Map<string, number>;
    stationFunctionsMap: Map<string, Map<string, number>>;
    functionsUpdateSubs: Map<string, broker.Subscription>;
    functionsClientsMap: Map<string, number>;
    meassageDescriptors: Map<string, protobuf.Type>;
    jsonSchemas: Map<string, Function>;
    avroSchemas: Map<string, Function>;
    graphqlSchemas: Map<string, GraphQLSchema>;
    clusterConfigurations: Map<string, boolean>;
    stationSchemaverseToDlsMap: Map<string, boolean>;
    private producersMap;
    private consumersMap;
    private consumeHandlers;
    private suppressLogs;
    stationPartitions: Map<string, number[]>;
    seed: number;
    constructor();
    connect({ host, port, username, accountId, connectionToken, password, reconnect, maxReconnect, reconnectIntervalMs, timeoutMs, keyFile, certFile, caFile, suppressLogs }: {
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
    }): Promise<Memphis>;
    private _getBrokerManagerConnection;
    private _compileProtobufSchema;
    private _functionUpdatesListener;
    private _listenForFunctionUpdates;
    private _scemaUpdatesListener;
    private _compileJsonSchema;
    private _compileAvroSchema;
    private _compileGraphQl;
    private _listenForSchemaUpdates;
    private _sdkClientUpdatesListener;
    sendNotification(title: string, msg: string, failedMsg: any, type: string): void;
    private _normalizeHost;
    request(subject: string, data: any, timeoutRetry: number, options?: any): Promise<any>;
    station({ name, retentionType, retentionValue, storageType, replicas, idempotencyWindowMs, schemaName, sendPoisonMsgToDls, sendSchemaFailedMsgToDls, tieredStorageEnabled, partitionsNumber, dlsStation, timeoutRetry }: {
        name: string;
        retentionType?: string;
        retentionValue?: number;
        storageType?: string;
        replicas?: number;
        idempotencyWindowMs?: number;
        schemaName?: string;
        sendPoisonMsgToDls?: boolean;
        sendSchemaFailedMsgToDls?: boolean;
        tieredStorageEnabled?: boolean;
        partitionsNumber?: number;
        dlsStation?: string;
        timeoutRetry?: number;
    }): Promise<Station>;
    attachSchema({ name, stationName }: {
        name: string;
        stationName: string;
    }): Promise<void>;
    enforceSchema({ name, stationName, timeoutRetry }: {
        name: string;
        stationName: string;
        timeoutRetry?: number;
    }): Promise<void>;
    detachSchema({ stationName, timeoutRetry }: {
        stationName: string;
        timeoutRetry?: number;
    }): Promise<void>;
    producer({ stationName, producerName, genUniqueSuffix, timeoutRetry }: {
        stationName: string | string[];
        producerName: string;
        genUniqueSuffix?: boolean;
        timeoutRetry?: number;
    }): Promise<Producer>;
    consumer({ stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries, genUniqueSuffix, startConsumeFromSequence, lastMessages, consumerPartitionKey, consumerPartitionNumber, timeoutRetry }: {
        stationName: string;
        consumerName: string;
        consumerGroup?: string;
        pullIntervalMs?: number;
        batchSize?: number;
        batchMaxTimeToWaitMs?: number;
        maxAckTimeMs?: number;
        maxMsgDeliveries?: number;
        genUniqueSuffix?: boolean;
        startConsumeFromSequence?: number;
        lastMessages?: number;
        consumerPartitionKey?: string;
        consumerPartitionNumber?: number;
        timeoutRetry?: number;
    }): Promise<Consumer>;
    headers(): MsgHeaders;
    produce({ stationName, producerName, genUniqueSuffix, message, ackWaitSec, asyncProduce, headers, msgId, producerPartitionKey, producerPartitionNumber }: {
        stationName: string | string[];
        producerName: string;
        genUniqueSuffix?: boolean;
        message: any;
        ackWaitSec?: number;
        asyncProduce?: boolean;
        headers?: any;
        msgId?: string;
        producerPartitionKey?: string;
        producerPartitionNumber?: number;
    }): Promise<void>;
    fetchMessages({ stationName, consumerName, consumerGroup, genUniqueSuffix, batchSize, maxAckTimeMs, batchMaxTimeToWaitMs, maxMsgDeliveries, startConsumeFromSequence, lastMessages, consumerPartitionKey, consumerPartitionNumber, }: {
        stationName: string;
        consumerName: string;
        consumerGroup?: string;
        genUniqueSuffix?: boolean;
        batchSize?: number;
        maxAckTimeMs?: number;
        batchMaxTimeToWaitMs?: number;
        maxMsgDeliveries?: number;
        startConsumeFromSequence?: number;
        lastMessages?: number;
        consumerPartitionKey?: string;
        consumerPartitionNumber?: number;
    }): Promise<Message[]>;
    private getCachedProducer;
    _getCachedProducer(key: string): Producer;
    private setCachedProducer;
    _unSetCachedProducer(producer: Producer): void;
    _unSetCachedProducerStation(stationName: string): void;
    private getCachedConsumer;
    private setCachedConsumer;
    _unSetCachedConsumer(consumer: Consumer): void;
    _unSetCachedConsumerStation(stationName: string): void;
    close(): Promise<void>;
    isConnected(): boolean;
    _setConsumeHandler(options: MemphisConsumerOptions, handler: (...args: any) => void, context: object): void;
    createSchema({ schemaName, schemaType, schemaFilePath, timeoutRetry }: {
        schemaName: string;
        schemaType: string;
        schemaFilePath: string;
        timeoutRetry?: number;
    }): Promise<void>;
    private log;
    _getPartitionFromKey(key: string, stationName: string): number;
    _validatePartitionNumber(partitionNumber: number, stationName: string): Promise<void>;
}
export declare class RoundRobinProducerConsumerGenerator {
    NumberOfPartitions: number;
    Partitions: number[];
    Current: number;
    constructor(partitions: number[]);
    Next(): number;
}
export declare class MemphisService extends Memphis {
}
export type { Memphis };
export declare const memphis: Memphis;
