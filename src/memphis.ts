// Copyright 2021-2022 The Memphis Authors
// Licensed under the MIT License (the "License");
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// This license limiting reselling the software itself "AS IS".

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as events from 'events';
import * as broker from 'nats';
import { headers, MsgHdrs } from 'nats';
import * as protobuf from 'protobufjs';
import * as descriptor from 'protobufjs/ext/descriptor';
import * as fs from 'fs';
import * as path from 'path';

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
    FILE: string;
    MEMORY: string;
}

const storageTypes: IStorageTypes = {
    FILE: 'file',
    MEMORY: 'memory'
};

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
                    name: conId_username,
                    maxPingOut: 1
                });
                this.brokerConnection = this.brokerManager.jetstream();
                this.brokerStats = await this.brokerManager.jetstreamManager();
                this.isConnectionActive = true;
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
                return reject(ex);
            }
        });
    }

    private async _scemaUpdatesListener(stationName: string, schemaUpdateData: Object): Promise<void> {
        try {
            const subName = stationName.replace(/\./g, '#');
            let schemaUpdateSubscription = this.schemaUpdatesSubs.has(subName);
            if (schemaUpdateSubscription) {
                this.producersPerStation.set(subName, this.producersPerStation.get(subName) + 1);
            } else {
                let shouldDrop = schemaUpdateData['schema_name'] === '';
                if (!shouldDrop) {
                    let protoPathName = `${__dirname}/${schemaUpdateData['schema_name']}_${schemaUpdateData['active_version']['version_number']}.proto`;
                    this.stationSchemaDataMap.set(subName, schemaUpdateData);
                    fs.writeFileSync(protoPathName, schemaUpdateData['active_version']['schema_content']);
                    let root = await protobuf.load(protoPathName);
                    fs.unlinkSync(protoPathName);
                    let meassageDescriptor = root.lookupType(`${schemaUpdateData['active_version']['message_struct_name']}`);
                    this.meassageDescriptors.set(subName, meassageDescriptor);
                }
                const sub = this.brokerManager.subscribe(`$memphis_schema_updates_${subName}`);
                this.producersPerStation.set(subName, 1);
                this.schemaUpdatesSubs.set(subName, sub);
                this._listenForSchemaUpdates(sub, subName);
            }
        } catch (err) {
            throw err;
        }
    }

    private async _listenForSchemaUpdates(sub: any, subName: string): Promise<void> {
        for await (const m of sub) {
            let data = this.JSONC.decode(m._rdata);
            let shouldDrop = data['init']['schema_name'] === '';
            if (shouldDrop) {
                this.stationSchemaDataMap.delete(subName);
                this.meassageDescriptors.delete(subName);
            } else {
                this.stationSchemaDataMap.set(subName, data.init);
                try {
                    let protoPathName = `${__dirname}/${data['init']['schema_name']}_${data['init']['active_version']['version_number']}.proto`;
                    fs.writeFileSync(protoPathName, data['init']['active_version']['schema_content']);
                    let root = await protobuf.load(protoPathName);
                    fs.unlinkSync(protoPathName);
                    let meassageDescriptor = root.lookupType(`${data['init']['active_version']['message_struct_name']}`);
                    this.meassageDescriptors.set(subName, meassageDescriptor);
                } catch (err) {
                    throw err;
                }
            }
        }
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
     * @param {Memphis.storageTypes} storageType - persistance storage for messages of the station, default is storageTypes.FILE.
     * @param {Number} replicas - number of replicas for the messages of the data, default is 1.
     * @param {Boolean} dedupEnabled - whether to allow dedup mecanism, dedup happens based on message ID, default is false.
     * @param {Number} dedupWindowMs - time frame in which dedup track messages, default is 0.
     */
    async station({
        name,
        retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS,
        retentionValue = 604800,
        storageType = storageTypes.FILE,
        replicas = 1,
        dedupEnabled = false,
        dedupWindowMs = 0
    }: {
        name: string;
        retentionType?: string;
        retentionValue?: number;
        storageType?: string;
        replicas?: number;
        dedupEnabled?: boolean;
        dedupWindowMs?: number;
    }): Promise<Station> {
        try {
            if (!this.isConnectionActive) throw new Error('Connection is dead');
            let createStationReq = {
                name: name,
                retention_type: retentionType,
                retention_value: retentionValue,
                storage_type: storageType,
                replicas: replicas,
                dedup_enabled: dedupEnabled,
                dedup_window_in_ms: dedupWindowMs
            };
            let data = this.JSONC.encode(createStationReq);
            let errMsg = await this.brokerManager.request('$memphis_station_creations', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw new Error(errMsg);
            }
            return new Station(this, name);
        } catch (ex) {
            if (ex.message?.includes('already exists')) {
                return new Station(this, name.toLowerCase());
            }
            throw ex;
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
            if (!this.isConnectionActive) throw new Error('Connection is dead');

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
                throw new Error(createRes.error);
            }

            await this._scemaUpdatesListener(stationName, createRes.schema_update);
            return new Producer(this, producerName, stationName);
        } catch (ex) {
            throw ex;
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
     * @param {Number} `maxAckTimeMs` - max time for ack a message in miliseconds, in case a message not acked in this time period the Memphis broker will resend it untill reaches the maxMsgDeliveries value
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
                throw new Error(errMsg);
            }

            return new Consumer(this, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries);
        } catch (ex) {
            throw ex;
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
            sub.unsubscribe();
            this.stationSchemaDataMap.delete(key);
            this.schemaUpdatesSubs.delete(key);
            this.producersPerStation.delete(key);
            this.meassageDescriptors.delete(key);
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
            throw new Error('Keys in headers should not start with $memphis');
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
        this.internal_station = this.stationName.replace(/\./g, '#');
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
        headers = new MsgHeaders()
    }: {
        message: any;
        ackWaitSec?: number;
        asyncProduce?: boolean;
        headers?: MsgHeaders;
    }): Promise<void> {
        try {
            let messageToSend;
            headers.headers.set('$memphis_connectionId', this.connection.connectionId);
            headers.headers.set('$memphis_producedBy', this.producerName);
            let meassageDescriptor = this.connection.meassageDescriptors.get(this.internal_station);
            if (meassageDescriptor) {
                if (message instanceof Uint8Array) {
                    messageToSend = message;
                    try {
                        meassageDescriptor.decode(messageToSend);
                    } catch (ex) {
                        throw new Error(`Schema validation has failed: ${ex.message}`);
                    }
                } else if (message instanceof Object) {
                    let errMsg = meassageDescriptor.verify(message);
                    if (errMsg) {
                        throw new Error(`Schema validation has failed: ${errMsg}`);
                    }
                    messageToSend = meassageDescriptor.encode(message).finish();
                } else {
                    throw new Error('Schema validation has failed: Unsupported message type');
                }
            }
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
                throw new Error('Produce operation has failed, please check whether Station/Producer are still exist');
            }
            throw ex;
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
                throw new Error(errMsg);
            }
            const subName = this.stationName.replace(/\./g, '#');
            let prodNumber = this.connection.producersPerStation.get(subName) - 1;
            this.connection.producersPerStation.set(subName, prodNumber);
            if (prodNumber === 0) {
                let sub = this.connection.schemaUpdatesSubs.get(subName);
                sub.unsubscribe();
                this.connection.stationSchemaDataMap.delete(subName);
                this.connection.schemaUpdatesSubs.delete(subName);
                this.connection.meassageDescriptors.delete(subName);
            }
        } catch (ex) {
            if (ex.message?.includes('not exist')) {
                return;
            }
            throw ex;
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
            const subject = this.stationName.replace(/\./g, '#');
            const consumerGroup = this.consumerGroup.replace(/\./g, '#');
            const consumerName = this.consumerName.replace(/\./g, '#');
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

                    const sub = this.connection.brokerManager.subscribe(`$memphis_dlq_${subject}_${consumerGroup}`, {
                        queue: `$memphis_${subject}_${consumerGroup}`
                    });
                    this._handleAsyncIterableSubscriber(psub);
                    this._handleAsyncIterableSubscriber(sub);
                })
                .catch((error: any) => this.eventEmitter.emit('error', error));
        }

        this.eventEmitter.on(<string>event, cb);
    }

    private async _handleAsyncIterableSubscriber(iter: any) {
        for await (const m of iter) {
            this.eventEmitter.emit('message', new Message(m));
        }
    }

    private async _pingConsumer() {
        try {
            const stationName = this.stationName.replace(/\./g, '#');
            const consumerGroup = this.consumerGroup.replace(/\./g, '#');
            const consumerName = this.consumerName.replace(/\./g, '#');
            const durableName = consumerGroup || consumerName;
            await this.connection.brokerStats.consumers.info(stationName, durableName);
        } catch (ex) {
            this.eventEmitter.emit('error', 'station/consumer were not found');
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
                throw new Error(errMsg);
            }
        } catch (ex) {
            if (ex.message?.includes('not exist')) {
                return;
            }
            throw ex;
        }
    }
}

function generateNameSuffix(): string {
    return [...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}
class Message {
    private message: broker.JsMsg;

    constructor(message: broker.JsMsg) {
        this.message = message;
    }

    /**
     * Ack a message is done processing.
     */
    ack() {
        if (this.message.ack)
            // for dlq events which are unackable (core NATS messages)
            this.message.ack();
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
    private name: string;

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
            const subName = this.name.replace(/\./g, '#');
            let sub = this.connection.schemaUpdatesSubs.get(subName);
            sub.unsubscribe();
            this.connection.stationSchemaDataMap.delete(subName);
            this.connection.schemaUpdatesSubs.delete(subName);
            this.connection.producersPerStation.delete(subName);
            this.connection.meassageDescriptors.delete(subName);
            let data = this.connection.JSONC.encode(removeStationReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_station_destructions', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw new Error(errMsg);
            }
        } catch (ex) {
            if (ex.message?.includes('not exist')) {
                return;
            }
            throw ex;
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
