"use strict";
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
// limitations under the License.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var net_1 = __importDefault(require("net"));
var events_1 = __importDefault(require("events"));
var broker = __importStar(require("nats"));
var nats_1 = require("nats");
var uuid_1 = require("uuid");
var httpRequest_1 = require("./httpRequest");
var retentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: "message_age_sec",
    MESSAGES: "messages",
    BYTES: "bytes"
};
var storageTypes = {
    FILE: "file",
    MEMORY: "memory"
};
var Memphis = /** @class */ (function () {
    function Memphis() {
        var _this = this;
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
        this.client = new net_1.default.Socket();
        this.reconnectAttempts = 0;
        this.reconnect = true;
        this.maxReconnect = 3;
        this.reconnectIntervalMs = 200;
        this.timeoutMs = 15000;
        this.brokerConnection = null;
        this.brokerManager = null;
        this.brokerStats = null;
        this.natsConnection = false;
        this.client.on('error', function (error) {
            console.error(error);
        });
        this.client.on('close', function () {
            _this.isConnectionActive = false;
            _this._close();
        });
    }
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
    Memphis.prototype.connect = function (_a) {
        var _this = this;
        var host = _a.host, _b = _a.managementPort, managementPort = _b === void 0 ? 5555 : _b, _c = _a.tcpPort, tcpPort = _c === void 0 ? 6666 : _c, _d = _a.dataPort, dataPort = _d === void 0 ? 7766 : _d, username = _a.username, connectionToken = _a.connectionToken, _e = _a.reconnect, reconnect = _e === void 0 ? true : _e, _f = _a.maxReconnect, maxReconnect = _f === void 0 ? 3 : _f, _g = _a.reconnectIntervalMs, reconnectIntervalMs = _g === void 0 ? 200 : _g, _h = _a.timeoutMs, timeoutMs = _h === void 0 ? 15000 : _h;
        return new Promise(function (resolve, reject) {
            _this.host = _this._normalizeHost(host);
            _this.managementPort = managementPort;
            _this.tcpPort = tcpPort;
            _this.dataPort = dataPort;
            _this.username = username;
            _this.connectionToken = connectionToken;
            _this.reconnect = reconnect;
            _this.maxReconnect = maxReconnect > 9 ? 9 : maxReconnect;
            _this.reconnectIntervalMs = reconnectIntervalMs;
            _this.timeoutMs = timeoutMs;
            _this.client.connect(_this.tcpPort, _this.host, function () {
                _this.client.write(JSON.stringify({
                    username: username,
                    broker_creds: connectionToken,
                    connection_id: _this.connectionId
                }));
                _this.client.on('data', function (data) { return __awaiter(_this, void 0, void 0, function () {
                    var message, _a, _b, ex_1;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                try {
                                    message = JSON.parse(data.toString());
                                }
                                catch (ex) {
                                    return [2 /*return*/, reject(data.toString())];
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
                                if (!!this.natsConnection) return [3 /*break*/, 5];
                                _c.label = 1;
                            case 1:
                                _c.trys.push([1, 4, , 5]);
                                _a = this;
                                return [4 /*yield*/, broker.connect({
                                        servers: "".concat(this.host, ":").concat(this.dataPort),
                                        reconnect: this.reconnect,
                                        maxReconnectAttempts: this.reconnect ? this.maxReconnect : 0,
                                        reconnectTimeWait: this.reconnectIntervalMs,
                                        timeout: this.timeoutMs,
                                        token: this.connectionToken
                                    })];
                            case 2:
                                _a.brokerManager = _c.sent();
                                this.brokerConnection = this.brokerManager.jetstream();
                                _b = this;
                                return [4 /*yield*/, this.brokerManager.jetstreamManager()];
                            case 3:
                                _b.brokerStats = _c.sent();
                                this.natsConnection = true;
                                return [2 /*return*/, resolve(this)];
                            case 4:
                                ex_1 = _c.sent();
                                return [2 /*return*/, reject(ex_1)];
                            case 5: return [2 /*return*/];
                        }
                    });
                }); });
            });
            setTimeout(function () {
                if (!reconnect || _this.reconnectAttempts === maxReconnect || !_this.isConnectionActive)
                    reject(new Error("Connection timeout has reached"));
            }, timeoutMs);
        });
    };
    Memphis.prototype._normalizeHost = function (host) {
        if (host.startsWith("http://"))
            return host.split("http://")[1];
        else if (host.startsWith("https://"))
            return host.split("https://")[1];
        else
            return host;
    };
    Memphis.prototype._keepAcessTokenFresh = function (expiresIn) {
        var _this = this;
        this.accessTokenTimeout = setTimeout(function () {
            if (_this.isConnectionActive)
                _this.client.write(JSON.stringify({
                    resend_access_token: true
                }));
        }, expiresIn);
    };
    Memphis.prototype._pingServer = function (interval) {
        var _this = this;
        this.pingTimeout = setTimeout(function () {
            if (_this.isConnectionActive)
                _this.client.write(JSON.stringify({
                    ping: true
                }));
        }, interval);
    };
    /**
        * Creates a factory.
        * @param {String} name - factory name.
        * @param {String} description - factory description (optional).
    */
    Memphis.prototype.factory = function (_a) {
        var name = _a.name, _b = _a.description, description = _b === void 0 ? "" : _b;
        return __awaiter(this, void 0, void 0, function () {
            var response, ex_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        if (!this.isConnectionActive)
                            throw new Error("Connection is dead");
                        return [4 /*yield*/, (0, httpRequest_1.httpRequest)({
                                method: "POST",
                                url: "http://".concat(this.host, ":").concat(this.managementPort, "/api/factories/createFactory"),
                                headers: {
                                    Authorization: "Bearer " + this.accessToken
                                },
                                bodyParams: { name: name, description: description },
                            })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, new Factory(this, response.name)];
                    case 2:
                        ex_2 = _c.sent();
                        if (typeof (ex_2) == "string") {
                            return [2 /*return*/, new Factory(this, name.toLowerCase())];
                        }
                        throw ex_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
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
    Memphis.prototype.station = function (_a) {
        var name = _a.name, factoryName = _a.factoryName, _b = _a.retentionType, retentionType = _b === void 0 ? retentionTypes.MAX_MESSAGE_AGE_SECONDS : _b, _c = _a.retentionValue, retentionValue = _c === void 0 ? 604800 : _c, _d = _a.storageType, storageType = _d === void 0 ? storageTypes.FILE : _d, _e = _a.replicas, replicas = _e === void 0 ? 1 : _e, _f = _a.dedupEnabled, dedupEnabled = _f === void 0 ? false : _f, _g = _a.dedupWindowMs, dedupWindowMs = _g === void 0 ? 0 : _g;
        return __awaiter(this, void 0, void 0, function () {
            var response, ex_3;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _h.trys.push([0, 2, , 3]);
                        if (!this.isConnectionActive)
                            throw new Error("Connection is dead");
                        return [4 /*yield*/, (0, httpRequest_1.httpRequest)({
                                method: "POST",
                                url: "http://".concat(this.host, ":").concat(this.managementPort, "/api/stations/createStation"),
                                headers: {
                                    Authorization: "Bearer " + this.accessToken
                                },
                                bodyParams: {
                                    name: name,
                                    factory_name: factoryName,
                                    retention_type: retentionType,
                                    retention_value: retentionValue,
                                    storage_type: storageType,
                                    replicas: replicas,
                                    dedup_enabled: dedupEnabled,
                                    dedup_window_in_ms: dedupWindowMs
                                }
                            })];
                    case 1:
                        response = _h.sent();
                        return [2 /*return*/, new Station(this, response.name)];
                    case 2:
                        ex_3 = _h.sent();
                        if (typeof (ex_3) == "string") {
                            return [2 /*return*/, new Station(this, name.toLowerCase())];
                        }
                        throw ex_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
        * Creates a producer.
        * @param {String} stationName - station name to produce messages into.
        * @param {String} producerName - name for the producer.
    */
    Memphis.prototype.producer = function (_a) {
        var stationName = _a.stationName, producerName = _a.producerName;
        return __awaiter(this, void 0, void 0, function () {
            var ex_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        if (!this.isConnectionActive)
                            throw new Error("Connection is dead");
                        return [4 /*yield*/, (0, httpRequest_1.httpRequest)({
                                method: "POST",
                                url: "http://".concat(this.host, ":").concat(this.managementPort, "/api/producers/createProducer"),
                                headers: {
                                    Authorization: "Bearer " + this.accessToken
                                },
                                bodyParams: {
                                    name: producerName,
                                    station_name: stationName,
                                    connection_id: this.connectionId,
                                    producer_type: "application"
                                },
                            })];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, new Producer(this, producerName, stationName)];
                    case 2:
                        ex_4 = _b.sent();
                        throw ex_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
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
    Memphis.prototype.consumer = function (_a) {
        var stationName = _a.stationName, consumerName = _a.consumerName, consumerGroup = _a.consumerGroup, _b = _a.pullIntervalMs, pullIntervalMs = _b === void 0 ? 1000 : _b, _c = _a.batchSize, batchSize = _c === void 0 ? 10 : _c, _d = _a.batchMaxTimeToWaitMs, batchMaxTimeToWaitMs = _d === void 0 ? 5000 : _d, _e = _a.maxAckTimeMs, maxAckTimeMs = _e === void 0 ? 30000 : _e, _f = _a.maxMsgDeliveries, maxMsgDeliveries = _f === void 0 ? 10 : _f;
        return __awaiter(this, void 0, void 0, function () {
            var ex_5;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _g.trys.push([0, 2, , 3]);
                        if (!this.isConnectionActive)
                            throw new Error("Connection is dead");
                        consumerGroup = consumerGroup || consumerName;
                        return [4 /*yield*/, (0, httpRequest_1.httpRequest)({
                                method: "POST",
                                url: "http://".concat(this.host, ":").concat(this.managementPort, "/api/consumers/createConsumer"),
                                headers: {
                                    Authorization: "Bearer " + this.accessToken
                                },
                                bodyParams: {
                                    name: consumerName,
                                    station_name: stationName,
                                    connection_id: this.connectionId,
                                    consumer_type: "application",
                                    consumers_group: consumerGroup,
                                    max_ack_time_ms: maxAckTimeMs,
                                    max_msg_deliveries: maxMsgDeliveries
                                },
                            })];
                    case 1:
                        _g.sent();
                        return [2 /*return*/, new Consumer(this, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries)];
                    case 2:
                        ex_5 = _g.sent();
                        throw ex_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Memphis.prototype._close = function () {
        var _this = this;
        var _a, _b, _c, _d;
        if (this.reconnect && this.reconnectAttempts < this.maxReconnect) {
            this.reconnectAttempts++;
            setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                var ex_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.connect({
                                    host: this.host,
                                    managementPort: this.managementPort,
                                    tcpPort: this.tcpPort,
                                    dataPort: this.dataPort,
                                    username: this.username,
                                    connectionToken: this.connectionToken,
                                    reconnect: this.reconnect,
                                    maxReconnect: this.maxReconnect,
                                    reconnectIntervalMs: this.reconnectIntervalMs,
                                    timeoutMs: this.timeoutMs
                                })];
                        case 1:
                            _a.sent();
                            console.log("Reconnect to memphis has been succeeded");
                            return [3 /*break*/, 3];
                        case 2:
                            ex_6 = _a.sent();
                            console.error("Failed reconnect to memphis");
                            return [2 /*return*/];
                        case 3: return [2 /*return*/];
                    }
                });
            }); }, this.reconnectIntervalMs);
        }
        else {
            (_a = this.client) === null || _a === void 0 ? void 0 : _a.removeAllListeners("data");
            (_b = this.client) === null || _b === void 0 ? void 0 : _b.removeAllListeners("error");
            (_c = this.client) === null || _c === void 0 ? void 0 : _c.removeAllListeners("close");
            (_d = this.client) === null || _d === void 0 ? void 0 : _d.destroy();
            clearTimeout(this.accessTokenTimeout);
            clearTimeout(this.pingTimeout);
            this.reconnectAttempts = 0;
            setTimeout(function () {
                _this.brokerManager && _this.brokerManager.close();
            }, 500);
        }
    };
    /**
        * Close Memphis connection.
    */
    Memphis.prototype.close = function () {
        var _this = this;
        var _a, _b, _c, _d;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.removeAllListeners("data");
        (_b = this.client) === null || _b === void 0 ? void 0 : _b.removeAllListeners("error");
        (_c = this.client) === null || _c === void 0 ? void 0 : _c.removeAllListeners("close");
        (_d = this.client) === null || _d === void 0 ? void 0 : _d.destroy();
        clearTimeout(this.accessTokenTimeout);
        clearTimeout(this.pingTimeout);
        this.reconnectAttempts = 0;
        setTimeout(function () {
            _this.brokerManager && _this.brokerManager.close();
        }, 500);
    };
    return Memphis;
}());
var Producer = /** @class */ (function () {
    function Producer(connection, producerName, stationName) {
        this.connection = connection;
        this.producerName = producerName.toLowerCase();
        this.stationName = stationName.toLowerCase();
    }
    /**
        * Produces a message into a station.
        * @param {Uint8Array} message - message to send into the station.
        * @param {Number} ackWaitSec - max time in seconds to wait for an ack from memphis.
    */
    Producer.prototype.produce = function (_a) {
        var message = _a.message, _b = _a.ackWaitSec, ackWaitSec = _b === void 0 ? 15 : _b;
        return __awaiter(this, void 0, void 0, function () {
            var h, ex_7;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        h = (0, nats_1.headers)();
                        h.append("connectionId", this.connection.connectionId);
                        h.append("producedBy", this.producerName);
                        return [4 /*yield*/, this.connection.brokerConnection.publish("".concat(this.stationName, ".final"), message, { msgID: (0, uuid_1.v4)(), headers: h, ackWait: ackWaitSec * 1000 * 1000000 })];
                    case 1:
                        _c.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        ex_7 = _c.sent();
                        if (ex_7.code === '503') {
                            throw new Error("Produce operation has failed, please check whether Station/Producer are still exist");
                        }
                        throw ex_7;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
        * Destroy the producer.
    */
    Producer.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, httpRequest_1.httpRequest)({
                                method: "DELETE",
                                url: "http://".concat(this.connection.host, ":").concat(this.connection.managementPort, "/api/producers/destroyProducer"),
                                headers: {
                                    Authorization: "Bearer " + this.connection.accessToken
                                },
                                bodyParams: {
                                    name: this.producerName,
                                    station_name: this.stationName
                                },
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _1 = _a.sent();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return Producer;
}());
var Consumer = /** @class */ (function () {
    function Consumer(connection, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries) {
        this.connection = connection;
        this.stationName = stationName.toLowerCase();
        this.consumerName = consumerName.toLowerCase();
        this.consumerGroup = consumerGroup.toLowerCase();
        this.pullIntervalMs = pullIntervalMs;
        this.batchSize = batchSize;
        this.batchMaxTimeToWaitMs = batchMaxTimeToWaitMs;
        this.maxAckTimeMs = maxAckTimeMs;
        this.maxMsgDeliveries = maxMsgDeliveries;
        this.eventEmitter = new events_1.default.EventEmitter();
        this.pullInterval = null;
        this.pingConsumerInvtervalMs = 30000;
        this.pingConsumerInvterval = null;
    }
    /**
        * Creates an event listener.
        * @param {String} event - the event to listen to.
        * @param {Function} cb - a callback function.
    */
    Consumer.prototype.on = function (event, cb) {
        var _this = this;
        if (event === "message") {
            this.connection.brokerConnection.pullSubscribe("".concat(this.stationName, ".final"), {
                mack: true,
                config: {
                    durable_name: this.consumerGroup ? this.consumerGroup : this.consumerName,
                    ack_wait: this.maxAckTimeMs,
                },
            }).then(function (psub) { return __awaiter(_this, void 0, void 0, function () {
                var sub;
                var _this = this;
                return __generator(this, function (_a) {
                    psub.pull({ batch: this.batchSize, expires: this.batchMaxTimeToWaitMs });
                    this.pullInterval = setInterval(function () {
                        if (!_this.connection.brokerManager.isClosed())
                            psub.pull({ batch: _this.batchSize, expires: _this.batchMaxTimeToWaitMs });
                        else
                            clearInterval(_this.pullInterval);
                    }, this.pullIntervalMs);
                    this.pingConsumerInvterval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            if (!this.connection.brokerManager.isClosed()) {
                                this._pingConsumer();
                            }
                            else
                                clearInterval(this.pingConsumerInvterval);
                            return [2 /*return*/];
                        });
                    }); }, this.pingConsumerInvtervalMs);
                    sub = this.connection.brokerManager.subscribe("$memphis_dlq_".concat(this.stationName, "_").concat(this.consumerGroup), { queue: "$memphis_".concat(this.stationName, "_").concat(this.consumerGroup) });
                    this._handleAsyncIterableSubscriber(psub);
                    this._handleAsyncIterableSubscriber(sub);
                    return [2 /*return*/];
                });
            }); }).catch(function (error) { return _this.eventEmitter.emit("error", error); });
        }
        this.eventEmitter.on(event, cb);
    };
    Consumer.prototype._handleAsyncIterableSubscriber = function (iter) {
        var iter_1, iter_1_1;
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function () {
            var m, e_1_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, 6, 11]);
                        iter_1 = __asyncValues(iter);
                        _b.label = 1;
                    case 1: return [4 /*yield*/, iter_1.next()];
                    case 2:
                        if (!(iter_1_1 = _b.sent(), !iter_1_1.done)) return [3 /*break*/, 4];
                        m = iter_1_1.value;
                        this.eventEmitter.emit("message", new Message(m));
                        _b.label = 3;
                    case 3: return [3 /*break*/, 1];
                    case 4: return [3 /*break*/, 11];
                    case 5:
                        e_1_1 = _b.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 11];
                    case 6:
                        _b.trys.push([6, , 9, 10]);
                        if (!(iter_1_1 && !iter_1_1.done && (_a = iter_1.return))) return [3 /*break*/, 8];
                        return [4 /*yield*/, _a.call(iter_1)];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 10: return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    Consumer.prototype._pingConsumer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var durableName, ex_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        durableName = this.consumerGroup || this.consumerName;
                        return [4 /*yield*/, this.connection.brokerStats.consumers.info(this.stationName, durableName)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        ex_8 = _a.sent();
                        this.eventEmitter.emit("error", "station/consumer were not found");
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
        * Destroy the consumer.
    */
    Consumer.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.eventEmitter.removeAllListeners("message");
                        this.eventEmitter.removeAllListeners("error");
                        clearInterval(this.pullInterval);
                        clearInterval(this.pingConsumerInvterval);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, httpRequest_1.httpRequest)({
                                method: "DELETE",
                                url: "http://".concat(this.connection.host, ":").concat(this.connection.managementPort, "/api/consumers/destroyConsumer"),
                                headers: {
                                    Authorization: "Bearer " + this.connection.accessToken
                                },
                                bodyParams: {
                                    name: this.consumerName,
                                    station_name: this.stationName
                                },
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _2 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return Consumer;
}());
var Message = /** @class */ (function () {
    function Message(message) {
        this.message = message;
    }
    /**
        * Ack a message is done processing.
    */
    Message.prototype.ack = function () {
        if (this.message.ack) // for dlq events which are unackable (core NATS messages)
            this.message.ack();
    };
    Message.prototype.getData = function () {
        return this.message.data;
    };
    return Message;
}());
var Factory = /** @class */ (function () {
    function Factory(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }
    /**
        * Destroy the factory.
    */
    Factory.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            var ex_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, httpRequest_1.httpRequest)({
                                method: "DELETE",
                                url: "http://".concat(this.connection.host, ":").concat(this.connection.managementPort, "/api/factories/removeFactory"),
                                headers: {
                                    Authorization: "Bearer " + this.connection.accessToken
                                },
                                bodyParams: {
                                    factory_name: this.name
                                },
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        ex_9 = _a.sent();
                        throw ex_9;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return Factory;
}());
var Station = /** @class */ (function () {
    function Station(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }
    /**
       * Destroy the station.
   */
    Station.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            var ex_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, httpRequest_1.httpRequest)({
                                method: "DELETE",
                                url: "http://".concat(this.connection.host, ":").concat(this.connection.managementPort, "/api/stations/removeStation"),
                                headers: {
                                    Authorization: "Bearer " + this.connection.accessToken
                                },
                                bodyParams: {
                                    station_name: this.name
                                },
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        ex_10 = _a.sent();
                        throw ex_10;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return Station;
}());
var MemphisInstance = new Memphis();
MemphisInstance.retentionTypes = retentionTypes;
MemphisInstance.storageTypes = storageTypes;
module.exports = MemphisInstance;
