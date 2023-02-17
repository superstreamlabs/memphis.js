"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Consumer = void 0;
const events = require("events");
const message_1 = require("./message");
const utils_1 = require("./utils");
class Consumer {
    constructor(connection, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries, startConsumeFromSequence, lastMessages) {
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
        this.startConsumeFromSequence = startConsumeFromSequence;
        this.lastMessages = lastMessages;
        this.context = {};
    }
    setContext(context) {
        this.context = context;
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
                const sub = this.connection.brokerManager.subscribe(`$memphis_dls_${subject}_${consumerGroup}`, {
                    queue: `$memphis_${subject}_${consumerGroup}`
                });
                this._handleAsyncIterableSubscriber(psub);
                this._handleAsyncIterableSubscriber(sub);
            })
                .catch((error) => this.eventEmitter.emit('error', (0, utils_1.MemphisError)(error)));
        }
        this.eventEmitter.on(event, cb);
    }
    async _handleAsyncIterableSubscriber(iter) {
        var _a, e_1, _b, _c;
        try {
            for (var _d = true, iter_1 = __asyncValues(iter), iter_1_1; iter_1_1 = await iter_1.next(), _a = iter_1_1.done, !_a;) {
                _c = iter_1_1.value;
                _d = false;
                try {
                    const m = _c;
                    this.eventEmitter.emit('message', new message_1.Message(m, this.connection, this.consumerGroup), this.context);
                }
                finally {
                    _d = true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = iter_1.return)) await _b.call(iter_1);
            }
            finally { if (e_1) throw e_1.error; }
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
            this.eventEmitter.emit('error', (0, utils_1.MemphisError)(new Error('station/consumer were not found')));
        }
    }
    async destroy() {
        var _a;
        clearInterval(this.pullInterval);
        try {
            let removeConsumerReq = {
                name: this.consumerName,
                station_name: this.stationName,
                username: this.connection.username
            };
            let data = this.connection.JSONC.encode(removeConsumerReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_consumer_destructions', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                return;
            }
            throw (0, utils_1.MemphisError)(ex);
        }
    }
}
exports.Consumer = Consumer;
