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
const uuid_1 = require("uuid");
const retentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: 'message_age_sec',
    MESSAGES: 'messages',
    BYTES: 'bytes'
};
const storageTypes = {
    FILE: 'file',
    MEMORY: 'memory'
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
                return reject(ex);
            }
        });
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
    async factory({ name, description = '' }) {
        var _a;
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            let createFactoryReq = {
                factory_name: name,
                factory_description: description
            };
            let data = this.JSONC.encode(createFactoryReq);
            let errMsg = await this.brokerManager.request('$memphis_factory_creations', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw new Error(errMsg);
            }
            return new Factory(this, name);
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('already exists')) {
                return new Factory(this, name.toLowerCase());
            }
            throw ex;
        }
    }
    async station({ name, factoryName, retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS, retentionValue = 604800, storageType = storageTypes.FILE, replicas = 1, dedupEnabled = false, dedupWindowMs = 0 }) {
        var _a;
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            let createStationReq = {
                name: name,
                factory_name: factoryName,
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
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('already exists')) {
                return new Station(this, name.toLowerCase());
            }
            throw ex;
        }
    }
    async producer({ stationName, producerName }) {
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            let createProducerReq = {
                name: producerName,
                station_name: stationName,
                connection_id: this.connectionId,
                producer_type: 'application'
            };
            let data = this.JSONC.encode(createProducerReq);
            let errMsg = await this.brokerManager.request('$memphis_producer_creations', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw new Error(errMsg);
            }
            return new Producer(this, producerName, stationName);
        }
        catch (ex) {
            throw ex;
        }
    }
    async consumer({ stationName, consumerName, consumerGroup, pullIntervalMs = 1000, batchSize = 10, batchMaxTimeToWaitMs = 5000, maxAckTimeMs = 30000, maxMsgDeliveries = 10 }) {
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
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
        }
        catch (ex) {
            throw ex;
        }
    }
    close() {
        setTimeout(() => {
            this.brokerManager && this.brokerManager.close();
        }, 500);
    }
}
exports.Memphis = Memphis;
class Producer {
    constructor(connection, producerName, stationName) {
        this.connection = connection;
        this.producerName = producerName.toLowerCase();
        this.stationName = stationName.toLowerCase();
    }
    async produce({ message, ackWaitSec = 15 }) {
        try {
            const h = (0, nats_1.headers)();
            h.append('connectionId', this.connection.connectionId);
            h.append('producedBy', this.producerName);
            await this.connection.brokerConnection.publish(`${this.stationName}.final`, message, { msgID: (0, uuid_1.v4)(), headers: h, ackWait: ackWaitSec * 1000 * 1000000 });
        }
        catch (ex) {
            if (ex.code === '503') {
                throw new Error('Produce operation has failed, please check whether Station/Producer are still exist');
            }
            throw ex;
        }
    }
    async destroy() {
        try {
            let removeProducerReq = {
                name: this.producerName,
                station_name: this.stationName
            };
            let data = this.connection.JSONC.encode(removeProducerReq);
            await this.connection.brokerManager.publish('$memphis_producer_destructions', data);
        }
        catch (_) { }
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
            this.connection.brokerConnection
                .pullSubscribe(`${this.stationName}.final`, {
                mack: true,
                config: {
                    durable_name: this.consumerGroup ? this.consumerGroup : this.consumerName,
                    ack_wait: this.maxAckTimeMs
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
                const sub = this.connection.brokerManager.subscribe(`$memphis_dlq_${this.stationName}_${this.consumerGroup}`, {
                    queue: `$memphis_${this.stationName}_${this.consumerGroup}`
                });
                this._handleAsyncIterableSubscriber(psub);
                this._handleAsyncIterableSubscriber(sub);
            })
                .catch((error) => this.eventEmitter.emit('error', error));
        }
        this.eventEmitter.on(event, cb);
    }
    async _handleAsyncIterableSubscriber(iter) {
        var e_2, _a;
        try {
            for (var iter_1 = __asyncValues(iter), iter_1_1; iter_1_1 = await iter_1.next(), !iter_1_1.done;) {
                const m = iter_1_1.value;
                this.eventEmitter.emit('message', new Message(m));
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (iter_1_1 && !iter_1_1.done && (_a = iter_1.return)) await _a.call(iter_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    async _pingConsumer() {
        try {
            const durableName = this.consumerGroup || this.consumerName;
            await this.connection.brokerStats.consumers.info(this.stationName, durableName);
        }
        catch (ex) {
            this.eventEmitter.emit('error', 'station/consumer were not found');
        }
    }
    async destroy() {
        clearInterval(this.pullInterval);
        try {
            let removeConsumerReq = {
                name: this.consumerName,
                station_name: this.stationName
            };
            let data = this.connection.JSONC.encode(removeConsumerReq);
            await this.connection.brokerManager.publish('$memphis_consumer_destructions', data);
        }
        catch (_) { }
    }
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
}
class Factory {
    constructor(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }
    async destroy() {
        try {
            let removeFactoryReq = {
                factory_name: this.name
            };
            let data = this.connection.JSONC.encode(removeFactoryReq);
            await this.connection.brokerManager.publish('$memphis_factory_destructions', data);
        }
        catch (_) { }
    }
}
class Station {
    constructor(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }
    async destroy() {
        try {
            let removeStationReq = {
                station_name: this.name
            };
            let data = this.connection.JSONC.encode(removeStationReq);
            await this.connection.brokerManager.publish('$memphis_station_destructions', data);
        }
        catch (_) { }
    }
}
const MemphisInstance = new Memphis();
exports.default = MemphisInstance;
