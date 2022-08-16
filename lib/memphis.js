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
const net = require("net");
const events = require("events");
const broker = require("nats");
const nats_1 = require("nats");
const uuid_1 = require("uuid");
const httpRequest_1 = require("./httpRequest");
const retentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: "message_age_sec",
    MESSAGES: "messages",
    BYTES: "bytes",
};
const storageTypes = {
    FILE: "file",
    MEMORY: "memory",
};
class Memphis {
    constructor() {
        this.isConnectionActive = false;
        this.connectionId = "";
        this.accessToken = "";
        this.host = "";
        this.managementPort = 5555;
        this.tcpPort = 6666;
        this.dataPort = 7766;
        this.username = "";
        this.connectionToken = "";
        this.accessTokenTimeout = null;
        this.pingTimeout = null;
        this.client = new net.Socket();
        this.reconnectAttempts = 0;
        this.reconnect = true;
        this.maxReconnect = 3;
        this.reconnectIntervalMs = 200;
        this.timeoutMs = 15000;
        this.brokerConnection = null;
        this.brokerManager = null;
        this.brokerStats = null;
        this.natsConnection = false;
        this.retentionTypes = retentionTypes;
        this.storageTypes = storageTypes;
        this.client.on("error", (error) => {
            console.error(error);
        });
        this.client.on("close", () => {
            this.isConnectionActive = false;
            this._close();
        });
    }
    connect({ host, managementPort = 5555, tcpPort = 6666, dataPort = 7766, username, connectionToken, reconnect = true, maxReconnect = 3, reconnectIntervalMs = 200, timeoutMs = 15000, }) {
        return new Promise((resolve, reject) => {
            this.host = this._normalizeHost(host);
            this.managementPort = managementPort;
            this.tcpPort = tcpPort;
            this.dataPort = dataPort;
            this.username = username;
            this.connectionToken = connectionToken;
            this.reconnect = reconnect;
            this.maxReconnect = maxReconnect > 9 ? 9 : maxReconnect;
            this.reconnectIntervalMs = reconnectIntervalMs;
            this.timeoutMs = timeoutMs;
            this.client.connect(this.tcpPort, this.host, () => {
                this.client.write(JSON.stringify({
                    username: username,
                    broker_creds: connectionToken,
                    connection_id: this.connectionId,
                }));
                this.client.on("data", async (data) => {
                    let message;
                    try {
                        message = JSON.parse(data.toString());
                    }
                    catch (ex) {
                        return reject(data.toString());
                    }
                    this.connectionId = message.connection_id;
                    this.isConnectionActive = true;
                    this.reconnectAttempts = 0;
                    if (message.access_token) {
                        this.accessToken = message.access_token;
                        this._keepAcessTokenFresh(message.access_token_exp);
                    }
                    if (message.ping_interval_ms)
                        this._pingServer(message.ping_interval_ms);
                    if (!this.natsConnection) {
                        try {
                            this.brokerManager = await broker.connect({
                                servers: `${this.host}:${this.dataPort}`,
                                reconnect: this.reconnect,
                                maxReconnectAttempts: this.reconnect ? this.maxReconnect : 0,
                                reconnectTimeWait: this.reconnectIntervalMs,
                                timeout: this.timeoutMs,
                                token: this.connectionToken,
                            });
                            this.brokerConnection = this.brokerManager.jetstream();
                            this.brokerStats = await this.brokerManager.jetstreamManager();
                            this.natsConnection = true;
                            return resolve();
                        }
                        catch (ex) {
                            return reject(ex);
                        }
                    }
                });
            });
            setTimeout(() => {
                if (!reconnect ||
                    this.reconnectAttempts === maxReconnect ||
                    !this.isConnectionActive)
                    reject(new Error("Connection timeout has reached"));
            }, timeoutMs);
        });
    }
    _normalizeHost(host) {
        if (host.startsWith("http://"))
            return host.split("http://")[1];
        else if (host.startsWith("https://"))
            return host.split("https://")[1];
        else
            return host;
    }
    _keepAcessTokenFresh(expiresIn) {
        this.accessTokenTimeout = setTimeout(() => {
            if (this.isConnectionActive)
                this.client.write(JSON.stringify({
                    resend_access_token: true,
                }));
        }, expiresIn);
    }
    _pingServer(interval) {
        this.pingTimeout = setTimeout(() => {
            if (this.isConnectionActive)
                this.client.write(JSON.stringify({
                    ping: true,
                }));
        }, interval);
    }
    async factory({ name, description = "", }) {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");
            const response = await (0, httpRequest_1.httpRequest)({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/factories/createFactory`,
                headers: {
                    Authorization: "Bearer " + this.accessToken,
                },
                bodyParams: { name, description },
            });
            return new Factory(this, response.name);
        }
        catch (ex) {
            if (typeof ex == "string") {
                return new Factory(this, name.toLowerCase());
            }
            throw ex;
        }
    }
    async station({ name, factoryName, retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS, retentionValue = 604800, storageType = storageTypes.FILE, replicas = 1, dedupEnabled = false, dedupWindowMs = 0, }) {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");
            const response = await (0, httpRequest_1.httpRequest)({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/stations/createStation`,
                headers: {
                    Authorization: "Bearer " + this.accessToken,
                },
                bodyParams: {
                    name: name,
                    factory_name: factoryName,
                    retention_type: retentionType,
                    retention_value: retentionValue,
                    storage_type: storageType,
                    replicas: replicas,
                    dedup_enabled: dedupEnabled,
                    dedup_window_in_ms: dedupWindowMs,
                },
            });
            return new Station(this, response.name);
        }
        catch (ex) {
            if (typeof ex == "string") {
                return new Station(this, name.toLowerCase());
            }
            throw ex;
        }
    }
    async producer({ stationName, producerName, }) {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");
            await (0, httpRequest_1.httpRequest)({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/producers/createProducer`,
                headers: {
                    Authorization: "Bearer " + this.accessToken,
                },
                bodyParams: {
                    name: producerName,
                    station_name: stationName,
                    connection_id: this.connectionId,
                    producer_type: "application",
                },
            });
            return new Producer(this, producerName, stationName);
        }
        catch (ex) {
            throw ex;
        }
    }
    async consumer({ stationName, consumerName, consumerGroup, pullIntervalMs = 1000, batchSize = 10, batchMaxTimeToWaitMs = 5000, maxAckTimeMs = 30000, maxMsgDeliveries = 10, }) {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");
            consumerGroup = consumerGroup || consumerName;
            await (0, httpRequest_1.httpRequest)({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/consumers/createConsumer`,
                headers: {
                    Authorization: "Bearer " + this.accessToken,
                },
                bodyParams: {
                    name: consumerName,
                    station_name: stationName,
                    connection_id: this.connectionId,
                    consumer_type: "application",
                    consumers_group: consumerGroup,
                    max_ack_time_ms: maxAckTimeMs,
                    max_msg_deliveries: maxMsgDeliveries,
                },
            });
            return new Consumer(this, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries);
        }
        catch (ex) {
            throw ex;
        }
    }
    _close() {
        var _a, _b, _c, _d;
        if (this.reconnect && this.reconnectAttempts < this.maxReconnect) {
            this.reconnectAttempts++;
            setTimeout(async () => {
                try {
                    await this.connect({
                        host: this.host,
                        managementPort: this.managementPort,
                        tcpPort: this.tcpPort,
                        dataPort: this.dataPort,
                        username: this.username,
                        connectionToken: this.connectionToken,
                        reconnect: this.reconnect,
                        maxReconnect: this.maxReconnect,
                        reconnectIntervalMs: this.reconnectIntervalMs,
                        timeoutMs: this.timeoutMs,
                    });
                    console.log("Reconnect to memphis has been succeeded");
                }
                catch (ex) {
                    console.error("Failed reconnect to memphis");
                    return;
                }
            }, this.reconnectIntervalMs);
        }
        else {
            (_a = this.client) === null || _a === void 0 ? void 0 : _a.removeAllListeners("data");
            (_b = this.client) === null || _b === void 0 ? void 0 : _b.removeAllListeners("error");
            (_c = this.client) === null || _c === void 0 ? void 0 : _c.removeAllListeners("close");
            (_d = this.client) === null || _d === void 0 ? void 0 : _d.destroy();
            clearTimeout(this.accessTokenTimeout);
            clearTimeout(this.pingTimeout);
            this.reconnectAttempts = 0;
            setTimeout(() => {
                this.brokerManager && this.brokerManager.close();
            }, 500);
        }
    }
    close() {
        var _a, _b, _c, _d;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.removeAllListeners("data");
        (_b = this.client) === null || _b === void 0 ? void 0 : _b.removeAllListeners("error");
        (_c = this.client) === null || _c === void 0 ? void 0 : _c.removeAllListeners("close");
        (_d = this.client) === null || _d === void 0 ? void 0 : _d.destroy();
        clearTimeout(this.accessTokenTimeout);
        clearTimeout(this.pingTimeout);
        this.reconnectAttempts = 0;
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
    async produce({ message, ackWaitSec = 15, }) {
        try {
            const h = (0, nats_1.headers)();
            h.append("connectionId", this.connection.connectionId);
            h.append("producedBy", this.producerName);
            await this.connection.brokerConnection.publish(`${this.stationName}.final`, message, { msgID: (0, uuid_1.v4)(), headers: h, ackWait: ackWaitSec * 1000 * 1000000 });
        }
        catch (ex) {
            if (ex.code === "503") {
                throw new Error("Produce operation has failed, please check whether Station/Producer are still exist");
            }
            throw ex;
        }
    }
    async destroy() {
        try {
            await (0, httpRequest_1.httpRequest)({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/producers/destroyProducer`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken,
                },
                bodyParams: {
                    name: this.producerName,
                    station_name: this.stationName,
                },
            });
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
        if (event === "message") {
            this.connection.brokerConnection
                .pullSubscribe(`${this.stationName}.final`, {
                mack: true,
                config: {
                    durable_name: this.consumerGroup
                        ? this.consumerGroup
                        : this.consumerName,
                    ack_wait: this.maxAckTimeMs,
                },
            })
                .then(async (psub) => {
                psub.pull({
                    batch: this.batchSize,
                    expires: this.batchMaxTimeToWaitMs,
                });
                this.pullInterval = setInterval(() => {
                    if (!this.connection.brokerManager.isClosed())
                        psub.pull({
                            batch: this.batchSize,
                            expires: this.batchMaxTimeToWaitMs,
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
                const sub = this.connection.brokerManager.subscribe(`$memphis_dlq_${this.stationName}_${this.consumerGroup}`, { queue: `$memphis_${this.stationName}_${this.consumerGroup}` });
                this._handleAsyncIterableSubscriber(psub);
                this._handleAsyncIterableSubscriber(sub);
            })
                .catch((error) => this.eventEmitter.emit("error", error));
        }
        this.eventEmitter.on(event, cb);
    }
    async _handleAsyncIterableSubscriber(iter) {
        var e_1, _a;
        try {
            for (var iter_1 = __asyncValues(iter), iter_1_1; iter_1_1 = await iter_1.next(), !iter_1_1.done;) {
                const m = iter_1_1.value;
                this.eventEmitter.emit("message", new Message(m));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (iter_1_1 && !iter_1_1.done && (_a = iter_1.return)) await _a.call(iter_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    async _pingConsumer() {
        try {
            const durableName = this.consumerGroup || this.consumerName;
            await this.connection.brokerStats.consumers.info(this.stationName, durableName);
        }
        catch (ex) {
            this.eventEmitter.emit("error", "station/consumer were not found");
        }
    }
    async destroy() {
        this.eventEmitter.removeAllListeners("message");
        this.eventEmitter.removeAllListeners("error");
        clearInterval(this.pullInterval);
        clearInterval(this.pingConsumerInvterval);
        try {
            await (0, httpRequest_1.httpRequest)({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/consumers/destroyConsumer`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken,
                },
                bodyParams: {
                    name: this.consumerName,
                    station_name: this.stationName,
                },
            });
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
            await (0, httpRequest_1.httpRequest)({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/factories/removeFactory`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken,
                },
                bodyParams: {
                    factory_name: this.name,
                },
            });
        }
        catch (ex) {
            throw ex;
        }
    }
}
class Station {
    constructor(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }
    async destroy() {
        try {
            await (0, httpRequest_1.httpRequest)({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/stations/removeStation`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken,
                },
                bodyParams: {
                    station_name: this.name,
                },
            });
        }
        catch (ex) {
            throw ex;
        }
    }
}
const MemphisInstance = new Memphis();
exports.default = MemphisInstance;
