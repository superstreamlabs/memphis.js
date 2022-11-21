"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Memphis = void 0;
const events = require("events");
const broker = require("nats");
const nats_1 = require("nats");
const protobuf = require("protobufjs");
const fs = require("fs");
const retentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: 'message_age_sec',
    MESSAGES: 'messages',
    BYTES: 'bytes'
};
const storageTypes = {
    DISK: 'file',
    MEMORY: 'memory'
};
const MemphisError = (error) => {
    if (error === null || error === void 0 ? void 0 : error.message) {
        error.message = error.message.replace("NatsError", "memphis");
        error.message = error.message.replace("Nats", "memphis");
        error.message = error.message.replace("nats", "memphis");
    }
    if (error === null || error === void 0 ? void 0 : error.stack) {
        error.stack = error.stack.replace("NatsError", "memphis");
        error.stack = error.stack.replace("Nats:", "memphis");
        error.stack = error.stack.replace("nats:", "memphis");
    }
    if (error === null || error === void 0 ? void 0 : error.name) {
        error.name = error.name.replace("NatsError", "MemphisError");
        error.name = error.name.replace("Nats", "MemphisError");
        error.name = error.name.replace("nats", "MemphisError");
    }
    return error;
};
class Memphis {
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
    connect({ host, port = 6666, username, connectionToken, reconnect = true, maxReconnect = 3, reconnectIntervalMs = 5000, timeoutMs = 15000 }) {
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
                    var e_1, _a;
                    try {
                        for (var _b = __asyncValues(this.brokerManager.status()), _c; _c = await _b.next(), !_c.done;) {
                            const s = _c.value;
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
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                })().then();
                return resolve(this);
            }
            catch (ex) {
                return reject(MemphisError(ex));
            }
        });
    }
    async _scemaUpdatesListener(stationName, schemaUpdateData) {
        try {
            const subName = stationName.replace(/\./g, '#').toLowerCase();
            let schemaUpdateSubscription = this.schemaUpdatesSubs.has(subName);
            if (schemaUpdateSubscription) {
                this.producersPerStation.set(subName, this.producersPerStation.get(subName) + 1);
            }
            else {
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
        }
        catch (err) {
            throw MemphisError(err);
        }
    }
    async _listenForSchemaUpdates(sub, subName) {
        var e_2, _a;
        try {
            for (var sub_1 = __asyncValues(sub), sub_1_1; sub_1_1 = await sub_1.next(), !sub_1_1.done;) {
                const m = sub_1_1.value;
                let data = this.JSONC.decode(m._rdata);
                let shouldDrop = data['init']['schema_name'] === '';
                if (shouldDrop) {
                    this.stationSchemaDataMap.delete(subName);
                    this.meassageDescriptors.delete(subName);
                }
                else {
                    this.stationSchemaDataMap.set(subName, data.init);
                    try {
                        let protoPathName = `${__dirname}/${data['init']['schema_name']}_${data['init']['active_version']['version_number']}.proto`;
                        fs.writeFileSync(protoPathName, data['init']['active_version']['schema_content']);
                        let root = await protobuf.load(protoPathName);
                        fs.unlinkSync(protoPathName);
                        let meassageDescriptor = root.lookupType(`${data['init']['active_version']['message_struct_name']}`);
                        this.meassageDescriptors.set(subName, meassageDescriptor);
                    }
                    catch (err) {
                        throw MemphisError(err);
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (sub_1_1 && !sub_1_1.done && (_a = sub_1.return)) await _a.call(sub_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    _normalizeHost(host) {
        if (host.startsWith('http://'))
            return host.split('http://')[1];
        else if (host.startsWith('https://'))
            return host.split('https://')[1];
        else
            return host;
    }
    _generateConnectionID() {
        return [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    }
    async station({ name, retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS, retentionValue = 604800, storageType = storageTypes.DISK, replicas = 1, dedupEnabled = false, dedupWindowMs = 0 }) {
        var _a;
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
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
                throw MemphisError(new Error(errMsg));
            }
            return new Station(this, name);
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('already exists')) {
                return new Station(this, name.toLowerCase());
            }
            throw MemphisError(ex);
        }
    }
    async producer({ stationName, producerName, genUniqueSuffix = false }) {
        try {
            if (!this.isConnectionActive)
                throw MemphisError(new Error('Connection is dead'));
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
        }
        catch (ex) {
            throw MemphisError(ex);
        }
    }
    async consumer({ stationName, consumerName, consumerGroup = '', pullIntervalMs = 1000, batchSize = 10, batchMaxTimeToWaitMs = 5000, maxAckTimeMs = 30000, maxMsgDeliveries = 10, genUniqueSuffix = false }) {
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
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
        }
        catch (ex) {
            throw MemphisError(ex);
        }
    }
    headers() {
        return new MsgHeaders();
    }
    close() {
        for (let key of this.schemaUpdatesSubs.keys()) {
            let sub = this.schemaUpdatesSubs.get(key);
            if (sub)
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
exports.Memphis = Memphis;
class MsgHeaders {
    constructor() {
        this.headers = (0, nats_1.headers)();
    }
    add(key, value) {
        if (!key.startsWith('$memphis')) {
            this.headers.append(key, value);
        }
        else {
            throw MemphisError(new Error('Keys in headers should not start with $memphis'));
        }
    }
}
class Producer {
    constructor(connection, producerName, stationName) {
        this.connection = connection;
        this.producerName = producerName.toLowerCase();
        this.stationName = stationName.toLowerCase();
        this.internal_station = this.stationName.replace(/\./g, '#').toLowerCase();
    }
    async produce({ message, ackWaitSec = 15, asyncProduce = false, headers = new MsgHeaders() }) {
        try {
            let messageToSend = this._validateMessage(message);
            headers.headers.set('$memphis_connectionId', this.connection.connectionId);
            headers.headers.set('$memphis_producedBy', this.producerName);
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
        }
        catch (ex) {
            if (ex.code === '503') {
                throw MemphisError(new Error('Produce operation has failed, please check whether Station/Producer are still exist'));
            }
            if (ex.message.includes('BAD_PAYLOAD'))
                ex = MemphisError(new Error('Invalid message format, expecting Uint8Array'));
            throw MemphisError(ex);
        }
    }
    _validateMessage(msg) {
        let stationSchemaData = this.connection.stationSchemaDataMap.get(this.internal_station);
        if (stationSchemaData) {
            switch (stationSchemaData['type']) {
                case 'protobuf':
                    let meassageDescriptor = this.connection.meassageDescriptors.get(this.internal_station);
                    if (meassageDescriptor) {
                        if (msg instanceof Uint8Array) {
                            try {
                                meassageDescriptor.decode(msg);
                                return msg;
                            }
                            catch (ex) {
                                if (ex.message.includes('index out of range'))
                                    throw MemphisError(new Error('Schema validation has failed: Invalid message format, expecting protobuf'));
                                throw MemphisError(new Error(`Schema validation has failed: ${ex.message}`));
                            }
                        }
                        else if (msg instanceof Object) {
                            let errMsg = meassageDescriptor.verify(msg);
                            if (errMsg) {
                                throw MemphisError(new Error(`Schema validation has failed: ${errMsg}`));
                            }
                            const protoMsg = meassageDescriptor.create(msg);
                            const messageToSend = meassageDescriptor.encode(protoMsg).finish();
                            return messageToSend;
                        }
                        else {
                            throw MemphisError(new Error('Schema validation has failed: Unsupported message type'));
                        }
                    }
                default:
                    return msg;
            }
        }
        else {
            return msg;
        }
    }
    async destroy() {
        var _a;
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
            const subName = this.stationName.replace(/\./g, '#').toLowerCase();
            let prodNumber = this.connection.producersPerStation.get(subName) - 1;
            this.connection.producersPerStation.set(subName, prodNumber);
            if (prodNumber === 0) {
                let sub = this.connection.schemaUpdatesSubs.get(subName);
                if (sub)
                    sub.unsubscribe();
                this.connection.stationSchemaDataMap.delete(subName);
                this.connection.schemaUpdatesSubs.delete(subName);
                this.connection.meassageDescriptors.delete(subName);
            }
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}
class Consumer {
    constructor(connection, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries) {
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
    on(event, cb) {
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
                .then(async (psub) => {
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
                    else
                        clearInterval(this.pullInterval);
                }, this.pullIntervalMs);
                this.pingConsumerInvterval = setInterval(async () => {
                    if (!this.connection.brokerManager.isClosed()) {
                        this._pingConsumer();
                    }
                    else
                        clearInterval(this.pingConsumerInvterval);
                }, this.pingConsumerInvtervalMs);
                const sub = this.connection.brokerManager.subscribe(`$memphis_dlq_${subject}_${consumerGroup}`, {
                    queue: `$memphis_${subject}_${consumerGroup}`
                });
                this._handleAsyncIterableSubscriber(psub);
                this._handleAsyncIterableSubscriber(sub);
            })
                .catch((error) => this.eventEmitter.emit('error', MemphisError(error)));
        }
        this.eventEmitter.on(event, cb);
    }
    async _handleAsyncIterableSubscriber(iter) {
        var e_3, _a;
        try {
            for (var iter_1 = __asyncValues(iter), iter_1_1; iter_1_1 = await iter_1.next(), !iter_1_1.done;) {
                const m = iter_1_1.value;
                this.eventEmitter.emit('message', new Message(m));
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (iter_1_1 && !iter_1_1.done && (_a = iter_1.return)) await _a.call(iter_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    async _pingConsumer() {
        try {
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            const consumerGroup = this.consumerGroup.replace(/\./g, '#').toLowerCase();
            const consumerName = this.consumerName.replace(/\./g, '#').toLowerCase();
            const durableName = consumerGroup || consumerName;
            await this.connection.brokerStats.consumers.info(stationName, durableName);
        }
        catch (ex) {
            this.eventEmitter.emit('error', MemphisError(new Error('station/consumer were not found')));
        }
    }
    async destroy() {
        var _a;
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
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}
function generateNameSuffix() {
    return [...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}
class Message {
    constructor(message) {
        this.message = message;
    }
    ack() {
        if (this.message.ack)
            this.message.ack();
    }
    getData() {
        return this.message.data;
    }
    getHeaders() {
        const msgHeaders = new Map();
        const hdrs = this.message.headers['headers'];
        for (let [key, value] of hdrs) {
            msgHeaders[key] = value;
        }
        return msgHeaders;
    }
}
class Station {
    constructor(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }
    async destroy() {
        var _a;
        try {
            let removeStationReq = {
                station_name: this.name
            };
            const subName = this.name.replace(/\./g, '#').toLowerCase();
            let sub = this.connection.schemaUpdatesSubs.get(subName);
            if (sub)
                sub.unsubscribe();
            this.connection.stationSchemaDataMap.delete(subName);
            this.connection.schemaUpdatesSubs.delete(subName);
            this.connection.producersPerStation.delete(subName);
            this.connection.meassageDescriptors.delete(subName);
            let data = this.connection.JSONC.encode(removeStationReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_station_destructions', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}
const MemphisInstance = new Memphis();
exports.default = MemphisInstance;
