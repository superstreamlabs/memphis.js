// Credit for The NATS.IO Authors
// Copyright 2021-2022 The Memphis Authors
// Licensed under the Apache License, Version 2.0 (the “License”);
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an “AS IS” BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.package server

import * as events from 'events';
import * as broker from 'nats';
import { headers, MsgHdrs } from 'nats';
import * as protobuf from 'protobufjs';
import * as fs from 'fs';
import Ajv from 'ajv';
import jsonSchemaDraft04 from 'ajv-draft-04';
import draft7MetaSchema from 'ajv/dist/refs/json-schema-draft-07.json';
import draft6MetaSchema from 'ajv/dist/refs/json-schema-draft-06.json';
import Ajv2020 from 'ajv/dist/2020';
import { buildSchema as buildGraphQlSchema, GraphQLSchema, parse as parseGraphQl, validate as validateGraphQl } from 'graphql';

interface IRetentionTypes {
    MAX_MESSAGE_AGE_SECONDS: string;
    MESSAGES: string;
    BYTES: string;
}

const retentionTypes: IRetentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: 'message_age_sec',
    MESSAGES: 'messages',
    BYTES: 'bytes'
};

interface IStorageTypes {
    DISK: string;
    MEMORY: string;
}

const storageTypes: IStorageTypes = {
    DISK: 'file',
    MEMORY: 'memory'
};

const MemphisError = (error: Error): Error => {
    if (error?.message) {
        error.message = error.message.replace('NatsError', 'memphis');
        error.message = error.message.replace('Nats', 'memphis');
        error.message = error.message.replace('nats', 'memphis');
    }
    if (error?.stack) {
        error.stack = error.stack.replace('NatsError', 'memphis');
        error.stack = error.stack.replace('Nats:', 'memphis');
        error.stack = error.stack.replace('nats:', 'memphis');
    }
    if (error?.name) {
        error.name = error.name.replace('NatsError', 'MemphisError');
        error.name = error.name.replace('Nats', 'MemphisError');
        error.name = error.name.replace('nats', 'MemphisError');
    }
    return error;
};

const schemaVFailAlertType = 'schema_validation_fail_alert';

export class Memphis {
    private isConnectionActive: boolean;
    public connectionId: string;
    public host: string;
    public port: number;
    public username: string;
    private connectionToken: string;
    private reconnect: boolean;
    private maxReconnect: number;
    private reconnectIntervalMs: number;
    private timeoutMs: number;
    public brokerConnection: any;
    public brokerManager: any;
    public brokerStats: any;
    public retentionTypes!: IRetentionTypes;
    public storageTypes!: IStorageTypes;
    public JSONC: any;
    public stationSchemaDataMap: Map<string, Object>;
    public schemaUpdatesSubs: Map<string, broker.Subscription>;
    public producersPerStation: Map<string, number>;
    public meassageDescriptors: Map<string, protobuf.Type>;
    public jsonSchemas: Map<string, Function>;
    public graphqlSchemas: Map<string, GraphQLSchema>;
    public clusterConfigurations: Map<string, boolean>;
    public stationSchemaverseToDlsMap: Map<string, boolean>;

    constructor() {
        this.isConnectionActive = false;
        this.host = '';
        this.port = 6666;
        this.username = '';
        this.connectionToken = '';
        this.reconnect = true;
        this.maxReconnect = 3;
        this.reconnectIntervalMs = 200;
        this.timeoutMs = 15000;
        this.brokerConnection = null;
        this.brokerManager = null;
        this.brokerStats = null;
        this.retentionTypes = retentionTypes;
        this.storageTypes = storageTypes;
        this.JSONC = broker.JSONCodec();
        this.connectionId = this._generateConnectionID();
        this.stationSchemaDataMap = new Map();
        this.schemaUpdatesSubs = new Map();
        this.producersPerStation = new Map();
        this.meassageDescriptors = new Map();
        this.jsonSchemas = new Map();
        this.graphqlSchemas = new Map();
        this.clusterConfigurations = new Map();
        this.stationSchemaverseToDlsMap = new Map();
    }

    /**
     * Creates connection with Memphis.
     * @param {String} host - memphis host.
     * @param {Number} port - broker port, default is 6666.
     * @param {String} username - user of type root/application.
     * @param {String} connectionToken - broker token.
     * @param {Boolean} reconnect - whether to do reconnect while connection is lost.
     * @param {Number} maxReconnect - The reconnect attempts.
     * @param {Number} reconnectIntervalMs - Interval in miliseconds between reconnect attempts.
     * @param {Number} timeoutMs - connection timeout in miliseconds.
     */

    connect({
        host,
        port = 6666,
        username,
        connectionToken,
        reconnect = true,
        maxReconnect = 3,
        reconnectIntervalMs = 5000,
        timeoutMs = 15000
    }: {
        host: string;
        port?: number;
        username: string;
        connectionToken: string;
        reconnect?: boolean;
        maxReconnect?: number;
        reconnectIntervalMs?: number;
        timeoutMs?: number;
    }): Promise<Memphis> {
        return new Promise(async (resolve, reject) => {
            this.host = this._normalizeHost(host);
            this.port = port;
            this.username = username;
            this.connectionToken = connectionToken;
            this.reconnect = reconnect;
            this.maxReconnect = maxReconnect > 9 ? 9 : maxReconnect;
            this.reconnectIntervalMs = reconnectIntervalMs;
            this.timeoutMs = timeoutMs;

            let conId_username = this.connectionId + '::' + username;
            try {
                this.brokerManager = await broker.connect({
                    servers: `${this.host}:${this.port}`,
                    reconnect: this.reconnect,
                    maxReconnectAttempts: this.reconnect ? this.maxReconnect : 0,
                    reconnectTimeWait: this.reconnectIntervalMs,
                    timeout: this.timeoutMs,
                    token: this.connectionToken,
                    name: conId_username
                });
                this.brokerConnection = this.brokerManager.jetstream();
                this.brokerStats = await this.brokerManager.jetstreamManager();
                this.isConnectionActive = true;
                this._configurationsListener();
                (async () => {
                    for await (const s of this.brokerManager.status()) {
                        switch (s.type) {
                            case 'update':
                                console.log(`reconnected to memphis successfully`);
                                this.isConnectionActive = true;
                                break;
                            case 'reconnecting':
                                console.log(`trying to reconnect to memphis - ${s.data}`);
                                break;
                            case 'disconnect':
                                console.log(`disconnected from memphis - ${s.data}`);
                                this.isConnectionActive = false;
                                break;
                            default:
                                this.isConnectionActive = true;
                        }
                    }
                })().then();
                return resolve(this);
            } catch (ex) {
                return reject(MemphisError(ex));
            }
        });
    }

    private async _compileProtobufSchema(stationName: string) {
        let stationSchemaData = this.stationSchemaDataMap.get(stationName);
        let protoPathName = `${__dirname}/${stationSchemaData['schema_name']}_${stationSchemaData['active_version']['version_number']}.proto`;
        fs.writeFileSync(protoPathName, stationSchemaData['active_version']['schema_content']);
        let root = await protobuf.load(protoPathName);
        fs.unlinkSync(protoPathName);
        let meassageDescriptor = root.lookupType(`${stationSchemaData['active_version']['message_struct_name']}`);
        this.meassageDescriptors.set(stationName, meassageDescriptor);
    }

    private async _scemaUpdatesListener(stationName: string, schemaUpdateData: Object): Promise<void> {
        try {
            const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
            let schemaUpdateSubscription = this.schemaUpdatesSubs.has(internalStationName);
            if (schemaUpdateSubscription) {
                this.producersPerStation.set(internalStationName, this.producersPerStation.get(internalStationName) + 1);
            } else {
                let shouldDrop = schemaUpdateData['schema_name'] === '';
                if (!shouldDrop) {
                    this.stationSchemaDataMap.set(internalStationName, schemaUpdateData);
                    switch (schemaUpdateData['type']) {
                        case 'protobuf':
                            await this._compileProtobufSchema(internalStationName);
                            break;
                        case 'json':
                            const jsonSchema = this._compileJsonSchema(internalStationName);
                            this.jsonSchemas.set(internalStationName, jsonSchema);
                            break;
                        case 'graphql':
                            const graphQlSchema = this._compileGraphQl(stationName);
                            this.graphqlSchemas.set(internalStationName, graphQlSchema);
                            break;
                    }
                }
                const sub = this.brokerManager.subscribe(`$memphis_schema_updates_${internalStationName}`);
                this.producersPerStation.set(internalStationName, 1);
                this.schemaUpdatesSubs.set(internalStationName, sub);
                this._listenForSchemaUpdates(sub, internalStationName);
            }
        } catch (err) {
            throw MemphisError(err);
        }
    }

    private _compileJsonSchema(stationName: string): any {
        const ajv = new Ajv();
        let stationSchemaData = this.stationSchemaDataMap.get(stationName);
        const schema = stationSchemaData['active_version']['schema_content'];
        const schemaObj = JSON.parse(schema);
        let validate: any;
        try {
            validate = ajv.compile(schemaObj);
            return validate;
        } catch (error) {
            try {
                ajv.addMetaSchema(draft7MetaSchema);
                validate = ajv.compile(schemaObj);
                return validate;
            } catch (error) {
                try {
                    const ajv = new jsonSchemaDraft04();
                    validate = ajv.compile(schemaObj);
                    return validate;
                } catch (error) {
                    try {
                        const ajv = new Ajv2020();
                        validate = ajv.compile(schemaObj);
                        return validate;
                    } catch (error) {
                        try {
                            ajv.addMetaSchema(draft6MetaSchema);
                            return validate;
                        } catch (error) {
                            throw MemphisError(new Error('invalid json schema'));
                        }
                    }
                }
            }
        }
    }

    private _compileGraphQl(stationName: string): GraphQLSchema {
        let stationSchemaData = this.stationSchemaDataMap.get(stationName);
        const schemaContent = stationSchemaData['active_version']['schema_content'];
        const graphQlSchema = buildGraphQlSchema(schemaContent);
        return graphQlSchema;
    }

    private async _listenForSchemaUpdates(sub: any, stationName: string): Promise<void> {
        for await (const m of sub) {
            let data = this.JSONC.decode(m._rdata);
            let shouldDrop = data['init']['schema_name'] === '';
            if (shouldDrop) {
                this.stationSchemaDataMap.delete(stationName);
                this.meassageDescriptors.delete(stationName);
                this.jsonSchemas.delete(stationName);
            } else {
                this.stationSchemaDataMap.set(stationName, data.init);
                try {
                    switch (data['init']['type']) {
                        case 'protobuf':
                            await this._compileProtobufSchema(stationName);
                            break;
                        case 'json':
                            const jsonSchema = this._compileJsonSchema(stationName);
                            this.jsonSchemas.set(stationName, jsonSchema);
                            break;
                        case 'graphql':
                            const graphQlSchema = this._compileGraphQl(stationName);
                            this.graphqlSchemas.set(stationName, graphQlSchema);
                            break;
                    }
                } catch (err) {
                    throw MemphisError(err);
                }
            }
        }
    }

    private async _configurationsListener(): Promise<void> {
        try {
            const sub = this.brokerManager.subscribe(`$memphis_configurations_updates`);
            for await (const m of sub) {
                let data = this.JSONC.decode(m._rdata);
                switch (data['type']) {
                    case 'send_notification':
                        this.clusterConfigurations.set(data['type'], data['update']);
                        break;
                    case 'schemaverse_to_dls':
                        this.stationSchemaverseToDlsMap.set(data['station_name'], data['update']);
                    default:
                        break;
                }
            }
        } catch (err) {
            throw MemphisError(err);
        }
    }

    public sendNotification(title: string, msg: string, failedMsg: any, type: string) {
        const buf = this.JSONC.encode({
            title: title,
            msg: msg,
            type: type,
            code: failedMsg
        });
        this.brokerManager.publish('$memphis_notifications', buf);
    }

    private _normalizeHost(host: string): string {
        if (host.startsWith('http://')) return host.split('http://')[1];
        else if (host.startsWith('https://')) return host.split('https://')[1];
        else return host;
    }

    private _generateConnectionID(): string {
        return [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    }

    /**
     * Creates a station.
     * @param {String} name - station name.
     * @param {Memphis.retentionTypes} retentionType - retention type, default is MAX_MESSAGE_AGE_SECONDS.
     * @param {Number} retentionValue - number which represents the retention based on the retentionType, default is 604800.
     * @param {Memphis.storageTypes} storageType - persistance storage for messages of the station, default is storageTypes.DISK.
     * @param {Number} replicas - number of replicas for the messages of the data, default is 1.
     * @param {Number} idempotencyWindowMs - time frame in which idempotent messages will be tracked, happens based on message ID Defaults to 120000.
     * @param {String} schemaName - schema name.
     */
    async station({
        name,
        retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS,
        retentionValue = 604800,
        storageType = storageTypes.DISK,
        replicas = 1,
        idempotencyWindowMs = 120000,
        schemaName = '',
        sendPoisonMsgToDls = true,
        sendSchemaFailedMsgToDls = true
    }: {
        name: string;
        retentionType?: string;
        retentionValue?: number;
        storageType?: string;
        replicas?: number;
        idempotencyWindowMs?: number;
        schemaName?: string;
        sendPoisonMsgToDls?: boolean;
        sendSchemaFailedMsgToDls?: boolean;
    }): Promise<Station> {
        try {
            if (!this.isConnectionActive) throw new Error('Connection is dead');
            let createStationReq = {
                name: name,
                retention_type: retentionType,
                retention_value: retentionValue,
                storage_type: storageType,
                replicas: replicas,
                idempotency_window_in_ms: idempotencyWindowMs,
                schema_name: schemaName,
                dls_configuration: {
                    poison: sendPoisonMsgToDls,
                    Schemaverse: sendSchemaFailedMsgToDls
                }
            };
            let data = this.JSONC.encode(createStationReq);
            let errMsg = await this.brokerManager.request('$memphis_station_creations', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
            let station = new Station(this, name);
            return station;
        } catch (ex) {
            if (ex.message?.includes('already exists')) {
                return new Station(this, name.toLowerCase());
            }
            throw MemphisError(ex);
        }
    }

    /**
     * Attaches a schema to an existing station.
     * @param {String} name - schema name.
     * @param {String} stationName - station name to attach schema to.
     */
    async attachSchema({ name, stationName }: { name: string; stationName: string }): Promise<void> {
        try {
            if (!this.isConnectionActive) throw new Error('Connection is dead');
            if (name === '' || stationName === '') {
                throw new Error('name and station name can not be empty');
            }
            let attachSchemaReq = {
                name: name,
                station_name: stationName
            };
            let data = this.JSONC.encode(attachSchemaReq);
            let errMsg = await this.brokerManager.request('$memphis_schema_attachments', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
        } catch (ex) {
            throw MemphisError(ex);
        }
    }

    /**
     * Detaches a schema from station.
     * @param {String} stationName - station name to attach schema to.
     */
    async detachSchema({ stationName }: { stationName: string }): Promise<void> {
        try {
            if (!this.isConnectionActive) throw new Error('Connection is dead');
            if (stationName === '') {
                throw new Error('station name is missing');
            }
            let detachSchemaReq = {
                station_name: stationName
            };
            let data = this.JSONC.encode(detachSchemaReq);
            let errMsg = await this.brokerManager.request('$memphis_schema_detachments', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
        } catch (ex) {
            throw MemphisError(ex);
        }
    }

    /**
     * Creates a producer.
     * @param {String} stationName - station name to produce messages into.
     * @param {String} producerName - name for the producer.
     * @param {String} genUniqueSuffix - Indicates memphis to add a unique suffix to the desired producer name.
     */
    async producer({ stationName, producerName, genUniqueSuffix = false }: { stationName: string; producerName: string; genUniqueSuffix?: boolean }): Promise<Producer> {
        try {
            if (!this.isConnectionActive) throw MemphisError(new Error('Connection is dead'));

            producerName = genUniqueSuffix ? producerName + '_' + generateNameSuffix() : producerName;
            let createProducerReq = {
                name: producerName,
                station_name: stationName,
                connection_id: this.connectionId,
                producer_type: 'application',
                req_version: 1
            };
            let data = this.JSONC.encode(createProducerReq);
            let createRes = await this.brokerManager.request('$memphis_producer_creations', data);
            createRes = this.JSONC.decode(createRes.data);
            if (createRes.error != '') {
                throw MemphisError(new Error(createRes.error));
            }

            await this._scemaUpdatesListener(stationName, createRes.schema_update);
            return new Producer(this, producerName, stationName);
        } catch (ex) {
            throw MemphisError(ex);
        }
    }

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
     * @param {String} genUniqueSuffix - Indicates memphis to add a unique suffix to the desired producer name.
     */
    async consumer({
        stationName,
        consumerName,
        consumerGroup = '',
        pullIntervalMs = 1000,
        batchSize = 10,
        batchMaxTimeToWaitMs = 5000,
        maxAckTimeMs = 30000,
        maxMsgDeliveries = 10,
        genUniqueSuffix = false
    }: {
        stationName: string;
        consumerName: string;
        consumerGroup?: string;
        pullIntervalMs?: number;
        batchSize?: number;
        batchMaxTimeToWaitMs?: number;
        maxAckTimeMs?: number;
        maxMsgDeliveries?: number;
        genUniqueSuffix?: boolean;
    }): Promise<Consumer> {
        try {
            if (!this.isConnectionActive) throw new Error('Connection is dead');

            consumerName = genUniqueSuffix ? consumerName + '_' + generateNameSuffix() : consumerName;
            consumerGroup = consumerGroup || consumerName;
            let createConsumerReq = {
                name: consumerName,
                station_name: stationName,
                connection_id: this.connectionId,
                consumer_type: 'application',
                consumers_group: consumerGroup,
                max_ack_time_ms: maxAckTimeMs,
                max_msg_deliveries: maxMsgDeliveries
            };
            let data = this.JSONC.encode(createConsumerReq);
            let errMsg = await this.brokerManager.request('$memphis_consumer_creations', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }

            return new Consumer(this, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries);
        } catch (ex) {
            throw MemphisError(ex);
        }
    }

    headers() {
        return new MsgHeaders();
    }

    /**
     * Close Memphis connection.
     */
    close() {
        for (let key of this.schemaUpdatesSubs.keys()) {
            let sub = this.schemaUpdatesSubs.get(key);
            if (sub) sub.unsubscribe();
            this.stationSchemaDataMap.delete(key);
            this.schemaUpdatesSubs.delete(key);
            this.producersPerStation.delete(key);
            this.meassageDescriptors.delete(key);
            this.jsonSchemas.delete(key);
        }
        setTimeout(() => {
            this.brokerManager && this.brokerManager.close();
        }, 500);
    }
}

class MsgHeaders {
    headers: MsgHdrs;

    constructor() {
        this.headers = headers();
    }

    /**
     * Add a header.
     * @param {String} key - header key.
     * @param {String} value - header value.
     */
    add(key: string, value: string): void {
        if (!key.startsWith('$memphis')) {
            this.headers.append(key, value);
        } else {
            throw MemphisError(new Error('Keys in headers should not start with $memphis'));
        }
    }
}

class Producer {
    private connection: Memphis;
    private producerName: string;
    private stationName: string;
    private internal_station: string;

    constructor(connection: Memphis, producerName: string, stationName: string) {
        this.connection = connection;
        this.producerName = producerName.toLowerCase();
        this.stationName = stationName.toLowerCase();
        this.internal_station = this.stationName.replace(/\./g, '#').toLowerCase();
    }

    /**
     * Produces a message into a station.
     * @param {any} message - message to send into the station (Uint8Arrays / object-in case your station is schema validated).
     * @param {Number} ackWaitSec - max time in seconds to wait for an ack from memphis.
     * @param {Boolean} asyncProduce - produce operation won't wait for broker acknowledgement
     * @param {MsgHeaders} headers - Message headers.
     */
    async produce({
        message,
        ackWaitSec = 15,
        asyncProduce = false,
        headers = new MsgHeaders(),
        msgId = null
    }: {
        message: any;
        ackWaitSec?: number;
        asyncProduce?: boolean;
        headers?: MsgHeaders;
        msgId?: string;
    }): Promise<void> {
        try {
            let messageToSend = this._validateMessage(message);
            headers.headers.set('$memphis_connectionId', this.connection.connectionId);
            headers.headers.set('$memphis_producedBy', this.producerName);
            if (msgId) headers.headers.set('msg-id', msgId);
            if (asyncProduce)
                this.connection.brokerConnection.publish(`${this.internal_station}.final`, messageToSend, {
                    headers: headers.headers,
                    ackWait: ackWaitSec * 1000 * 1000000
                });
            else
                await this.connection.brokerConnection.publish(`${this.internal_station}.final`, messageToSend, {
                    headers: headers.headers,
                    ackWait: ackWaitSec * 1000 * 1000000
                });
        } catch (ex: any) {
            if (ex.code === '503') {
                throw MemphisError(new Error('Produce operation has failed, please check whether Station/Producer still exist'));
            }
            if (ex.message.includes('BAD_PAYLOAD')) ex = MemphisError(new Error('Invalid message format, expecting Uint8Array'));
            if (ex.message.includes('Schema validation has failed')) {
                let failedMsg = '';
                if (message instanceof Uint8Array) {
                    failedMsg = String.fromCharCode.apply(null, message);
                } else {
                    failedMsg = JSON.stringify(message);
                }
                if (this.connection.stationSchemaverseToDlsMap.get(this.internal_station)) {
                    const unixTime = Date.now().toString();
                    const id = this.internal_station + '~' + this.producerName + '~0~' + unixTime;
                    const buf = this.connection.JSONC.encode({
                        _id: id,
                        station_name: this.internal_station,
                        producer: {
                            name: this.producerName,
                            connection_id: this.connection.connectionId
                        },
                        creation_unix: unixTime,
                        message: {
                            data: failedMsg
                        }
                    });
                    await this.connection.brokerConnection.publish('$memphis-' + this.internal_station + '-dls.schema.' + id, buf);
                    if (this.connection.clusterConfigurations.get('send_notification')) {
                        this.connection.sendNotification(
                            'Schema validation has failed',
                            `Station: ${this.stationName}\nProducer: ${this.producerName}\nError: ${ex.message}`,
                            failedMsg,
                            schemaVFailAlertType
                        );
                    }
                }
            }
            throw MemphisError(ex);
        }
    }

    private _parseJsonValidationErrors(errors: any): any {
        const errorsArray = [];
        for (const error of errors) {
            if (error.instancePath) errorsArray.push(`${error.schemaPath} ${error.message}`);
            else errorsArray.push(error.message);
        }
        return errorsArray.join(', ');
    }

    private _validateJsonMessage(msg: any): any {
        try {
            let validate = this.connection.jsonSchemas.get(this.internal_station);
            let msgObj: Object;
            let msgToSend = new Uint8Array();
            const isBuffer = Buffer.isBuffer(msg);
            if (isBuffer) {
                msgObj = JSON.parse(msg.toString());
                msgToSend = msg;
                const valid = validate(msgObj);
                if (!valid) {
                    throw MemphisError(new Error(`Schema validation has failed: ${this._parseJsonValidationErrors(validate['errors'])}`));
                }
                return msgToSend;
            } else if (Object.prototype.toString.call(msg) == '[object Object]') {
                msgObj = msg;
                let enc = new TextEncoder();
                const msgString = JSON.stringify(msg);
                msgToSend = enc.encode(msgString);
                const valid = validate(msgObj);
                if (!valid) {
                    throw MemphisError(new Error(`Schema validation has failed: ${this._parseJsonValidationErrors(validate['errors'])}`));
                }
                return msgToSend;
            } else {
                throw MemphisError(new Error('Schema validation has failed: Unsupported message type'));
            }
        } catch (ex) {
            throw MemphisError(new Error(ex.message));
        }
    }

    private _validateProtobufMessage(msg: any): any {
        let meassageDescriptor = this.connection.meassageDescriptors.get(this.internal_station);
        if (meassageDescriptor) {
            if (msg instanceof Uint8Array) {
                try {
                    meassageDescriptor.decode(msg);
                    return msg;
                } catch (ex) {
                    if (ex.message.includes('index out of range') || ex.message.includes('invalid wire type')) {
                        ex = new Error('Invalid message format, expecting protobuf');
                    }
                    throw MemphisError(new Error(`Schema validation has failed: ${ex.message}`));
                }
            } else if (msg instanceof Object) {
                let errMsg = meassageDescriptor.verify(msg);
                if (errMsg) {
                    throw MemphisError(new Error(`Schema validation has failed: ${errMsg}`));
                }
                const protoMsg = meassageDescriptor.create(msg);
                const messageToSend = meassageDescriptor.encode(protoMsg).finish();
                return messageToSend;
            } else {
                throw MemphisError(new Error('Schema validation has failed: Unsupported message type'));
            }
        }
    }

    private _validateGraphqlMessage(msg: any): any {
        try {
            let msgToSend: Uint8Array;
            let message: any;
            if (msg instanceof Uint8Array) {
                const msgString = new TextDecoder().decode(msg);
                msgToSend = msg;
                message = parseGraphQl(msgString);
            } else if (typeof msg == 'string') {
                message = parseGraphQl(msg);
                msgToSend = new TextEncoder().encode(msg);
            } else if (msg.kind == 'Document') {
                message = msg;
                const msgStr = msg.loc.source.body.toString();
                msgToSend = new TextEncoder().encode(msgStr);
            } else {
                throw MemphisError(new Error('Unsupported message type'));
            }
            const schema = this.connection.graphqlSchemas.get(this.stationName);
            const validate_res = validateGraphQl(schema, message);
            if (validate_res.length > 0) {
                throw MemphisError(new Error('Schema validation has failed: ' + validate_res));
            }
            return msgToSend;
        } catch (e) {
            throw MemphisError(new Error('Schema validation has failed: ' + e));
        }
    }

    private _validateMessage(msg: any): any {
        let stationSchemaData = this.connection.stationSchemaDataMap.get(this.internal_station);
        if (stationSchemaData) {
            switch (stationSchemaData['type']) {
                case 'protobuf':
                    return this._validateProtobufMessage(msg);
                case 'json':
                    return this._validateJsonMessage(msg);
                case 'graphql':
                    return this._validateGraphqlMessage(msg);
                default:
                    return msg;
            }
        } else {
            if (!Buffer.isBuffer(msg)) {
                throw MemphisError(new Error('Schema validation has failed: Unsupported message type'));
            } else {
                return msg;
            }
        }
    }

    /**
     * Destroy the producer.
     */
    async destroy(): Promise<void> {
        try {
            let removeProducerReq = {
                name: this.producerName,
                station_name: this.stationName
            };
            let data = this.connection.JSONC.encode(removeProducerReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_producer_destructions', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            let prodNumber = this.connection.producersPerStation.get(stationName) - 1;
            this.connection.producersPerStation.set(stationName, prodNumber);
            if (prodNumber === 0) {
                let sub = this.connection.schemaUpdatesSubs.get(stationName);
                if (sub) sub.unsubscribe();
                this.connection.stationSchemaDataMap.delete(stationName);
                this.connection.schemaUpdatesSubs.delete(stationName);
                this.connection.meassageDescriptors.delete(stationName);
                this.connection.jsonSchemas.delete(stationName);
            }
        } catch (ex) {
            if (ex.message?.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}

class Consumer {
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

    constructor(
        connection: Memphis,
        stationName: string,
        consumerName: string,
        consumerGroup: string,
        pullIntervalMs: number,
        batchSize: number,
        batchMaxTimeToWaitMs: number,
        maxAckTimeMs: number,
        maxMsgDeliveries: number
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
                .then(async (psub: any) => {
                    psub.pull({
                        batch: this.batchSize,
                        expires: this.batchMaxTimeToWaitMs
                    });
                    this.pullInterval = setInterval(() => {
                        if (!this.connection.brokerManager.isClosed())
                            psub.pull({
                                batch: this.batchSize,
                                expires: this.batchMaxTimeToWaitMs
                            });
                        else clearInterval(this.pullInterval);
                    }, this.pullIntervalMs);

                    this.pingConsumerInvterval = setInterval(async () => {
                        if (!this.connection.brokerManager.isClosed()) {
                            this._pingConsumer();
                        } else clearInterval(this.pingConsumerInvterval);
                    }, this.pingConsumerInvtervalMs);

                    const sub = this.connection.brokerManager.subscribe(`$memphis_dls_${subject}_${consumerGroup}`, {
                        queue: `$memphis_${subject}_${consumerGroup}`
                    });
                    this._handleAsyncIterableSubscriber(psub);
                    this._handleAsyncIterableSubscriber(sub);
                })
                .catch((error: any) => this.eventEmitter.emit('error', MemphisError(error)));
        }

        this.eventEmitter.on(<string>event, cb);
    }

    private async _handleAsyncIterableSubscriber(iter: any) {
        for await (const m of iter) {
            this.eventEmitter.emit('message', new Message(m, this.connection, this.consumerGroup));
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

    /**
     * Destroy the consumer.
     */
    async destroy(): Promise<void> {
        clearInterval(this.pullInterval);
        try {
            let removeConsumerReq = {
                name: this.consumerName,
                station_name: this.stationName
            };
            let data = this.connection.JSONC.encode(removeConsumerReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_consumer_destructions', data);
            errMsg = errMsg.data.toString();
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

function generateNameSuffix(): string {
    return [...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}
class Message {
    private message: broker.JsMsg;
    private connection: Memphis;
    private cgName: string;
    constructor(message: broker.JsMsg, connection: Memphis, cgName: string) {
        this.message = message;
        this.connection = connection;
        this.cgName = cgName;
    }

    /**
     * Ack a message is done processing.
     */
    ack() {
        if (this.message.ack)
            // for dls events which are unackable (core NATS messages)
            this.message.ack();
        else {
            let buf = this.connection.JSONC.encode({
                id: this.message.headers.get('$memphis_pm_id'),
                sequence: this.message.headers.get('$memphis_pm_sequence')
            });

            this.connection.brokerManager.publish('$memphis_pm_acks', buf);
        }
    }

    /**
     * Returns the message payload.
     */
    getData(): Uint8Array {
        return this.message.data;
    }

    /**
     * Returns the message headers.
     */
    getHeaders(): Map<string, string[]> {
        const msgHeaders = new Map<string, string[]>();
        const hdrs = this.message.headers['headers'];

        for (let [key, value] of hdrs) {
            msgHeaders[key] = value;
        }
        return msgHeaders;
    }
}

class Station {
    private connection: Memphis;
    public name: string;

    constructor(connection: Memphis, name: string) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }

    /**
     * Destroy the station.
     */
    async destroy(): Promise<void> {
        try {
            let removeStationReq = {
                station_name: this.name
            };
            const stationName = this.name.replace(/\./g, '#').toLowerCase();
            let sub = this.connection.schemaUpdatesSubs.get(stationName);
            if (sub) sub.unsubscribe();
            this.connection.stationSchemaDataMap.delete(stationName);
            this.connection.schemaUpdatesSubs.delete(stationName);
            this.connection.producersPerStation.delete(stationName);
            this.connection.meassageDescriptors.delete(stationName);
            this.connection.jsonSchemas.delete(stationName);
            let data = this.connection.JSONC.encode(removeStationReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_station_destructions', data);
            errMsg = errMsg.data.toString();
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

interface MemphisType extends Memphis {}
interface StationType extends Station {}
interface ProducerType extends Producer {}
interface ConsumerType extends Consumer {}
interface MessageType extends Message {}
interface MsgHeadersType extends MsgHeaders {}

const MemphisInstance: MemphisType = new Memphis();

export type { MemphisType, StationType, ProducerType, ConsumerType, MessageType, MsgHeadersType };

export default MemphisInstance;
