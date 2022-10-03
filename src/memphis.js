"use strict";
// Copyright 2021-2022 The Memphis Authors
// Licensed under the MIT License (the "License");
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Memphis = void 0;
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
var events = require("events");
var broker = require("nats");
var nats_1 = require("nats");
var uuid_1 = require("uuid");
var retentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: 'message_age_sec',
    MESSAGES: 'messages',
    BYTES: 'bytes'
};
var storageTypes = {
    FILE: 'file',
    MEMORY: 'memory'
};
var Memphis = /** @class */ (function () {
    function Memphis() {
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
    Memphis.prototype.connect = function (_a) {
        var _this = this;
        var host = _a.host, _b = _a.port, port = _b === void 0 ? 6666 : _b, username = _a.username, connectionToken = _a.connectionToken, _c = _a.reconnect, reconnect = _c === void 0 ? true : _c, _d = _a.maxReconnect, maxReconnect = _d === void 0 ? 3 : _d, _e = _a.reconnectIntervalMs, reconnectIntervalMs = _e === void 0 ? 5000 : _e, _f = _a.timeoutMs, timeoutMs = _f === void 0 ? 15000 : _f;
        return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
            var conId_username, _a, _b, ex_1;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.host = this._normalizeHost(host);
                        this.port = port;
                        this.username = username;
                        this.connectionToken = connectionToken;
                        this.reconnect = reconnect;
                        this.maxReconnect = maxReconnect > 9 ? 9 : maxReconnect;
                        this.reconnectIntervalMs = reconnectIntervalMs;
                        this.timeoutMs = timeoutMs;
                        conId_username = this.connectionId + '::' + username;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 4, , 5]);
                        _a = this;
                        return [4 /*yield*/, broker.connect({
                                servers: "".concat(this.host, ":").concat(this.port),
                                reconnect: this.reconnect,
                                maxReconnectAttempts: this.reconnect ? this.maxReconnect : 0,
                                reconnectTimeWait: this.reconnectIntervalMs,
                                timeout: this.timeoutMs,
                                token: this.connectionToken,
                                name: conId_username,
                                maxPingOut: 1
                            })];
                    case 2:
                        _a.brokerManager = _c.sent();
                        this.brokerConnection = this.brokerManager.jetstream();
                        _b = this;
                        return [4 /*yield*/, this.brokerManager.jetstreamManager()];
                    case 3:
                        _b.brokerStats = _c.sent();
                        this.isConnectionActive = true;
                        (function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b, s, e_1_1;
                            var e_1, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _d.trys.push([0, 5, 6, 11]);
                                        _a = __asyncValues(this.brokerManager.status());
                                        _d.label = 1;
                                    case 1: return [4 /*yield*/, _a.next()];
                                    case 2:
                                        if (!(_b = _d.sent(), !_b.done)) return [3 /*break*/, 4];
                                        s = _b.value;
                                        switch (s.type) {
                                            case 'update':
                                                console.log("reconnected to memphis successfully");
                                                this.isConnectionActive = true;
                                                break;
                                            case 'reconnecting':
                                                console.log("trying to reconnect to memphis - ".concat(s.data));
                                                break;
                                            case 'disconnect':
                                                console.log("disconnected from memphis - ".concat(s.data));
                                                this.isConnectionActive = false;
                                                break;
                                            default:
                                                this.isConnectionActive = true;
                                        }
                                        _d.label = 3;
                                    case 3: return [3 /*break*/, 1];
                                    case 4: return [3 /*break*/, 11];
                                    case 5:
                                        e_1_1 = _d.sent();
                                        e_1 = { error: e_1_1 };
                                        return [3 /*break*/, 11];
                                    case 6:
                                        _d.trys.push([6, , 9, 10]);
                                        if (!(_b && !_b.done && (_c = _a.return))) return [3 /*break*/, 8];
                                        return [4 /*yield*/, _c.call(_a)];
                                    case 7:
                                        _d.sent();
                                        _d.label = 8;
                                    case 8: return [3 /*break*/, 10];
                                    case 9:
                                        if (e_1) throw e_1.error;
                                        return [7 /*endfinally*/];
                                    case 10: return [7 /*endfinally*/];
                                    case 11: return [2 /*return*/];
                                }
                            });
                        }); })().then();
                        return [2 /*return*/, resolve(this)];
                    case 4:
                        ex_1 = _c.sent();
                        return [2 /*return*/, reject(ex_1)];
                    case 5: return [2 /*return*/];
                }
            });
        }); });
    };
    Memphis.prototype._normalizeHost = function (host) {
        if (host.startsWith('http://'))
            return host.split('http://')[1];
        else if (host.startsWith('https://'))
            return host.split('https://')[1];
        else
            return host;
    };
    Memphis.prototype._generateConnectionID = function () {
        return __spreadArray([], Array(24), true).map(function () { return Math.floor(Math.random() * 16).toString(16); }).join('');
    };
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
    Memphis.prototype.station = function (_a) {
        var _b;
        var name = _a.name, _c = _a.retentionType, retentionType = _c === void 0 ? retentionTypes.MAX_MESSAGE_AGE_SECONDS : _c, _d = _a.retentionValue, retentionValue = _d === void 0 ? 604800 : _d, _e = _a.storageType, storageType = _e === void 0 ? storageTypes.FILE : _e, _f = _a.replicas, replicas = _f === void 0 ? 1 : _f, _g = _a.dedupEnabled, dedupEnabled = _g === void 0 ? false : _g, _h = _a.dedupWindowMs, dedupWindowMs = _h === void 0 ? 0 : _h;
        return __awaiter(this, void 0, void 0, function () {
            var createStationReq, data, errMsg, ex_2;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        _j.trys.push([0, 2, , 3]);
                        if (!this.isConnectionActive)
                            throw new Error('Connection is dead');
                        createStationReq = {
                            name: name,
                            retention_type: retentionType,
                            retention_value: retentionValue,
                            storage_type: storageType,
                            replicas: replicas,
                            dedup_enabled: dedupEnabled,
                            dedup_window_in_ms: dedupWindowMs
                        };
                        data = this.JSONC.encode(createStationReq);
                        return [4 /*yield*/, this.brokerManager.request('$memphis_station_creations', data)];
                    case 1:
                        errMsg = _j.sent();
                        errMsg = errMsg.data.toString();
                        if (errMsg != '') {
                            throw new Error(errMsg);
                        }
                        return [2 /*return*/, new Station(this, name)];
                    case 2:
                        ex_2 = _j.sent();
                        if ((_b = ex_2.message) === null || _b === void 0 ? void 0 : _b.includes('already exists')) {
                            return [2 /*return*/, new Station(this, name.toLowerCase())];
                        }
                        throw ex_2;
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
            var createProducerReq, data, errMsg, ex_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        if (!this.isConnectionActive)
                            throw new Error('Connection is dead');
                        createProducerReq = {
                            name: producerName,
                            station_name: stationName,
                            connection_id: this.connectionId,
                            producer_type: 'application'
                        };
                        data = this.JSONC.encode(createProducerReq);
                        return [4 /*yield*/, this.brokerManager.request('$memphis_producer_creations', data)];
                    case 1:
                        errMsg = _b.sent();
                        errMsg = errMsg.data.toString();
                        if (errMsg != '') {
                            throw new Error(errMsg);
                        }
                        return [2 /*return*/, new Producer(this, producerName, stationName)];
                    case 2:
                        ex_3 = _b.sent();
                        throw ex_3;
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
     * @param {Number} `maxAckTimeMs` - max time for ack a message in miliseconds, in case a message not acked in this time period the Memphis broker will resend it untill reaches the maxMsgDeliveries value
     * @param {Number} maxMsgDeliveries - max number of message deliveries, by default is 10
     */
    Memphis.prototype.consumer = function (_a) {
        var stationName = _a.stationName, consumerName = _a.consumerName, consumerGroup = _a.consumerGroup, _b = _a.pullIntervalMs, pullIntervalMs = _b === void 0 ? 1000 : _b, _c = _a.batchSize, batchSize = _c === void 0 ? 10 : _c, _d = _a.batchMaxTimeToWaitMs, batchMaxTimeToWaitMs = _d === void 0 ? 5000 : _d, _e = _a.maxAckTimeMs, maxAckTimeMs = _e === void 0 ? 30000 : _e, _f = _a.maxMsgDeliveries, maxMsgDeliveries = _f === void 0 ? 10 : _f;
        return __awaiter(this, void 0, void 0, function () {
            var createConsumerReq, data, errMsg, ex_4;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _g.trys.push([0, 2, , 3]);
                        if (!this.isConnectionActive)
                            throw new Error('Connection is dead');
                        consumerGroup = consumerGroup || consumerName;
                        createConsumerReq = {
                            name: consumerName,
                            station_name: stationName,
                            connection_id: this.connectionId,
                            consumer_type: 'application',
                            consumers_group: consumerGroup,
                            max_ack_time_ms: maxAckTimeMs,
                            max_msg_deliveries: maxMsgDeliveries
                        };
                        data = this.JSONC.encode(createConsumerReq);
                        return [4 /*yield*/, this.brokerManager.request('$memphis_consumer_creations', data)];
                    case 1:
                        errMsg = _g.sent();
                        errMsg = errMsg.data.toString();
                        if (errMsg != '') {
                            throw new Error(errMsg);
                        }
                        return [2 /*return*/, new Consumer(this, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries)];
                    case 2:
                        ex_4 = _g.sent();
                        throw ex_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Close Memphis connection.
     */
    Memphis.prototype.close = function () {
        var _this = this;
        setTimeout(function () {
            _this.brokerManager && _this.brokerManager.close();
        }, 500);
    };
    return Memphis;
}());
exports.Memphis = Memphis;
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
            var h, ex_5;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        h = (0, nats_1.headers)();
                        h.append('connectionId', this.connection.connectionId);
                        h.append('producedBy', this.producerName);
                        return [4 /*yield*/, this.connection.brokerConnection.publish("".concat(this.stationName, ".final"), message, { msgID: (0, uuid_1.v4)(), headers: h, ackWait: ackWaitSec * 1000 * 1000000 })];
                    case 1:
                        _c.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        ex_5 = _c.sent();
                        if (ex_5.code === '503') {
                            throw new Error('Produce operation has failed, please check whether Station/Producer are still exist');
                        }
                        throw ex_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Destroy the producer.
     */
    Producer.prototype.destroy = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var removeProducerReq, data, errMsg, ex_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        removeProducerReq = {
                            name: this.producerName,
                            station_name: this.stationName
                        };
                        data = this.connection.JSONC.encode(removeProducerReq);
                        return [4 /*yield*/, this.connection.brokerManager.request('$memphis_producer_destructions', data)];
                    case 1:
                        errMsg = _b.sent();
                        errMsg = errMsg.data.toString();
                        if (errMsg != '') {
                            throw new Error(errMsg);
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        ex_6 = _b.sent();
                        if ((_a = ex_6.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                            return [2 /*return*/];
                        }
                        throw ex_6;
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
    Consumer.prototype.on = function (event, cb) {
        var _this = this;
        if (event === 'message') {
            this.connection.brokerConnection
                .pullSubscribe("".concat(this.stationName, ".final"), {
                mack: true,
                config: {
                    durable_name: this.consumerGroup ? this.consumerGroup : this.consumerName
                }
            })
                .then(function (psub) { return __awaiter(_this, void 0, void 0, function () {
                var sub;
                var _this = this;
                return __generator(this, function (_a) {
                    psub.pull({
                        batch: this.batchSize,
                        expires: this.batchMaxTimeToWaitMs
                    });
                    this.pullInterval = setInterval(function () {
                        if (!_this.connection.brokerManager.isClosed())
                            psub.pull({
                                batch: _this.batchSize,
                                expires: _this.batchMaxTimeToWaitMs
                            });
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
                    sub = this.connection.brokerManager.subscribe("$memphis_dlq_".concat(this.stationName, "_").concat(this.consumerGroup), {
                        queue: "$memphis_".concat(this.stationName, "_").concat(this.consumerGroup)
                    });
                    this._handleAsyncIterableSubscriber(psub);
                    this._handleAsyncIterableSubscriber(sub);
                    return [2 /*return*/];
                });
            }); })
                .catch(function (error) { return _this.eventEmitter.emit('error', error); });
        }
        this.eventEmitter.on(event, cb);
    };
    Consumer.prototype._handleAsyncIterableSubscriber = function (iter) {
        var iter_1, iter_1_1;
        var e_2, _a;
        return __awaiter(this, void 0, void 0, function () {
            var m, e_2_1;
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
                        this.eventEmitter.emit('message', new Message(m));
                        _b.label = 3;
                    case 3: return [3 /*break*/, 1];
                    case 4: return [3 /*break*/, 11];
                    case 5:
                        e_2_1 = _b.sent();
                        e_2 = { error: e_2_1 };
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
                        if (e_2) throw e_2.error;
                        return [7 /*endfinally*/];
                    case 10: return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    Consumer.prototype._pingConsumer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var durableName, ex_7;
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
                        ex_7 = _a.sent();
                        this.eventEmitter.emit('error', 'station/consumer were not found');
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
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var removeConsumerReq, data, errMsg, ex_8;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        clearInterval(this.pullInterval);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        removeConsumerReq = {
                            name: this.consumerName,
                            station_name: this.stationName
                        };
                        data = this.connection.JSONC.encode(removeConsumerReq);
                        return [4 /*yield*/, this.connection.brokerManager.request('$memphis_consumer_destructions', data)];
                    case 2:
                        errMsg = _b.sent();
                        errMsg = errMsg.data.toString();
                        if (errMsg != '') {
                            throw new Error(errMsg);
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        ex_8 = _b.sent();
                        if ((_a = ex_8.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                            return [2 /*return*/];
                        }
                        throw ex_8;
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
        if (this.message.ack)
            // for dlq events which are unackable (core NATS messages)
            this.message.ack();
    };
    Message.prototype.getData = function () {
        return this.message.data;
    };
    return Message;
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
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var removeStationReq, data, errMsg, ex_9;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        removeStationReq = {
                            station_name: this.name
                        };
                        data = this.connection.JSONC.encode(removeStationReq);
                        return [4 /*yield*/, this.connection.brokerManager.request('$memphis_station_destructions', data)];
                    case 1:
                        errMsg = _b.sent();
                        errMsg = errMsg.data.toString();
                        if (errMsg != '') {
                            throw new Error(errMsg);
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        ex_9 = _b.sent();
                        if ((_a = ex_9.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                            return [2 /*return*/];
                        }
                        throw ex_9;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return Station;
}());
var MemphisInstance = new Memphis();
exports.default = MemphisInstance;
