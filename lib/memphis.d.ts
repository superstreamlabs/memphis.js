import { GraphQLSchema } from 'graphql';
import * as broker from 'nats';
import * as protobuf from 'protobufjs';
import { Consumer } from './consumer';
import { MsgHeaders } from './message-header';
import { MemphisConsumerOption } from './nest/interfaces';
import { Producer } from './producer';
import { Station } from './station';
interface IRetentionTypes {
    MAX_MESSAGE_AGE_SECONDS: string;
    MESSAGES: string;
    BYTES: string;
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
    jsonSchemas: Map<string, Function>;
    graphqlSchemas: Map<string, GraphQLSchema>;
    clusterConfigurations: Map<string, boolean>;
    stationSchemaverseToDlsMap: Map<string, boolean>;
    private producersMap;
    private consumeHandlers;
    constructor();
    connect({ host, port, username, connectionToken, reconnect, maxReconnect, reconnectIntervalMs, timeoutMs, keyFile, certFile, caFile }: {
        host: string;
        port?: number;
        username: string;
        connectionToken: string;
        reconnect?: boolean;
        maxReconnect?: number;
        reconnectIntervalMs?: number;
        timeoutMs?: number;
        keyFile?: string;
        certFile?: string;
        caFile?: string;
    }): Promise<Memphis>;
    private _compileProtobufSchema;
    private _scemaUpdatesListener;
    private _compileJsonSchema;
    private _compileGraphQl;
    private _listenForSchemaUpdates;
    private _configurationsListener;
    sendNotification(title: string, msg: string, failedMsg: any, type: string): void;
    private _normalizeHost;
    private _generateConnectionID;
    station({ name, retentionType, retentionValue, storageType, replicas, idempotencyWindowMs, schemaName, sendPoisonMsgToDls, sendSchemaFailedMsgToDls }: {
        name: string;
        retentionType?: string;
        retentionValue?: number;
        storageType?: string;
        replicas?: number;
        idempotencyWindowMs?: number;
        schemaName?: string;
        sendPoisonMsgToDls?: boolean;
        sendSchemaFailedMsgToDls?: boolean;
    }): Promise<Station>;
    attachSchema({ name, stationName }: {
        name: string;
        stationName: string;
    }): Promise<void>;
    detachSchema({ stationName }: {
        stationName: string;
    }): Promise<void>;
    producer({ stationName, producerName, genUniqueSuffix }: {
        stationName: string;
        producerName: string;
        genUniqueSuffix?: boolean;
    }): Promise<Producer>;
    consumer({ stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries, genUniqueSuffix, startConsumeFromSequence, lastMessages }: {
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
    }): Promise<Consumer>;
    headers(): MsgHeaders;
    produce({ stationName, producerName, genUniqueSuffix, message, ackWaitSec, asyncProduce, headers, msgId }: {
        stationName: string;
        producerName: string;
        genUniqueSuffix?: boolean;
        message: any;
        ackWaitSec?: number;
        asyncProduce?: boolean;
        headers?: any;
        msgId?: string;
    }): Promise<void>;
    private getCachedProducer;
    private setCachedProducer;
    _unSetCachedProducer(producer: Producer): void;
    _unSetCachedProducerStation(stationName: string): void;
    close(): void;
    isConnected(): boolean;
    setConsumeHandler(options: MemphisConsumerOption, handler: (...args: any) => void, context: object): void;
}
export declare class MemphisService extends Memphis {
}
export type { Memphis };
export declare const memphis: Memphis;
