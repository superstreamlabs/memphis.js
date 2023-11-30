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
const memphis_1 = require("./memphis");
const message_1 = require("./message");
const utils_1 = require("./utils");
const maxBatchSize = 5000;
class Consumer {
    constructor(connection, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries, startConsumeFromSequence, lastMessages, realName, partitions, consumerPartitionKey, consumerPartitionNumber) {
        this.connection = connection;
        this.stationName = stationName.toLowerCase();
        this.internalStationName = this.stationName.replace(/\./g, '#');
        this.consumerName = consumerName.toLowerCase();
        this.internalConsumerName = this.consumerName.replace(/\./g, '#');
        this.consumerGroup = consumerGroup.toLowerCase();
        this.internalConsumerGroupName = this.consumerGroup.replace(/\./g, '#');
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
        this.realName = realName;
        this.dlsMessages = [];
        this.dlsCurrentIndex = 0;
        this.consumerPartitionKey = consumerPartitionKey;
        this.consumerPartitionNumber = consumerPartitionNumber;
        let partitionsLen = 1;
        if (partitions !== null) {
            partitionsLen = partitions.length;
        }
        if (partitions.length > 0) {
            this.partitionsGenerator = new memphis_1.RoundRobinProducerConsumerGenerator(partitions);
        }
        this.subscription = this.connection.brokerManager
            .subscribe(`$memphis_dls_${this.internalStationName}_${this.internalConsumerGroupName}`, {
            queue: `$memphis_${this.internalStationName}_${this.internalConsumerGroupName}`
        });
        this._handleAsyncIterableSubscriber(this.subscription, true);
    }
    setContext(context) {
        this.context = context;
    }
    on(event, cb) {
        if (event === 'message') {
            const fetchAndHandleMessages = async () => {
                try {
                    const messages = await this.fetch({ batchSize: this.batchSize, consumerPartitionKey: this.consumerPartitionKey, consumerPartitionNumber: this.consumerPartitionNumber });
                    this._handleAsyncConsumedMessages(messages, false);
                }
                catch (error) {
                    this.eventEmitter.emit('error', (0, utils_1.MemphisError)(error));
                }
            };
            fetchAndHandleMessages();
            this.pullInterval = setInterval(fetchAndHandleMessages, this.pullIntervalMs);
            this.pingConsumerInvterval = setInterval(async () => {
                var _a;
                if (((_a = this === null || this === void 0 ? void 0 : this.connection) === null || _a === void 0 ? void 0 : _a.brokerManager) && !this.connection.brokerManager.isClosed()) {
                    this._pingConsumer();
                }
                else {
                    clearInterval(this.pingConsumerInvterval);
                }
            }, this.pingConsumerInvtervalMs);
        }
        this.eventEmitter.on(event, cb);
    }
    async fetch({ batchSize = 10, consumerPartitionKey = null, consumerPartitionNumber = -1 }) {
        var _a, e_1, _b, _c;
        try {
            if (batchSize > maxBatchSize) {
                throw (0, utils_1.MemphisError)(new Error(`Batch size can not be greater than ${maxBatchSize}`));
            }
            let streamName = `${this.internalStationName}`;
            let stationPartitions = this.connection.stationPartitions.get(this.internalStationName);
            if (stationPartitions != null && stationPartitions.length === 1) {
                let partitionNumber = stationPartitions[0];
                streamName = `${this.internalStationName}$${partitionNumber.toString()}`;
            }
            else if (stationPartitions != null && stationPartitions.length > 0) {
                if (consumerPartitionNumber > 0 && consumerPartitionKey != null) {
                    throw (0, utils_1.MemphisError)(new Error('Can not use both partition number and partition key'));
                }
                if (consumerPartitionKey != null) {
                    const partitionNumberKey = this.connection._getPartitionFromKey(consumerPartitionKey, this.internalStationName);
                    streamName = `${this.internalStationName}$${partitionNumberKey.toString()}`;
                }
                else if (consumerPartitionNumber > 0) {
                    this.connection._validatePartitionNumber(consumerPartitionNumber, this.internalStationName);
                    streamName = `${this.internalStationName}$${consumerPartitionNumber.toString()}`;
                }
                else {
                    let partitionNumber = this.partitionsGenerator.Next();
                    streamName = `${this.internalStationName}$${partitionNumber.toString()}`;
                }
            }
            this.batchSize = batchSize;
            let messages = [];
            if (this.dlsMessages.length > 0) {
                if (this.dlsMessages.length <= batchSize) {
                    messages = this.dlsMessages;
                    this.dlsMessages = [];
                    this.dlsCurrentIndex = 0;
                }
                else {
                    messages = this.dlsMessages.splice(0, batchSize);
                    this.dlsCurrentIndex -= messages.length;
                }
                return messages;
            }
            const durableName = this.consumerGroup ? this.internalConsumerGroupName : this.internalConsumerName;
            const batch = await this.connection.brokerConnection.fetch(streamName, durableName, { batch: batchSize, expires: this.batchMaxTimeToWaitMs });
            try {
                for (var _d = true, batch_1 = __asyncValues(batch), batch_1_1; batch_1_1 = await batch_1.next(), _a = batch_1_1.done, !_a;) {
                    _c = batch_1_1.value;
                    _d = false;
                    try {
                        const m = _c;
                        messages.push(new message_1.Message(m, this.connection, this.consumerGroup, this.internalStationName));
                    }
                    finally {
                        _d = true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = batch_1.return)) await _b.call(batch_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return messages;
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async _handleAsyncIterableSubscriber(iter, isDls) {
        var _a, e_2, _b, _c;
        try {
            for (var _d = true, iter_1 = __asyncValues(iter), iter_1_1; iter_1_1 = await iter_1.next(), _a = iter_1_1.done, !_a;) {
                _c = iter_1_1.value;
                _d = false;
                try {
                    const m = _c;
                    if (isDls) {
                        let indexToInsert = this.dlsCurrentIndex;
                        if (this.dlsCurrentIndex >= 10000) {
                            indexToInsert %= 10000;
                        }
                        this.dlsMessages[indexToInsert] = new message_1.Message(m, this.connection, this.consumerGroup, this.internalStationName);
                        this.dlsCurrentIndex++;
                    }
                    this.eventEmitter.emit('message', new message_1.Message(m, this.connection, this.consumerGroup, this.internalStationName), this.context);
                }
                finally {
                    _d = true;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = iter_1.return)) await _b.call(iter_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    async _handleAsyncConsumedMessages(messages, isDls) {
        var _a, e_3, _b, _c;
        try {
            for (var _d = true, messages_1 = __asyncValues(messages), messages_1_1; messages_1_1 = await messages_1.next(), _a = messages_1_1.done, !_a;) {
                _c = messages_1_1.value;
                _d = false;
                try {
                    const m = _c;
                    this.eventEmitter.emit('message', m, this.context);
                }
                finally {
                    _d = true;
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = messages_1.return)) await _b.call(messages_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    async _pingConsumer() {
        try {
            let stationPartitions = this.connection.stationPartitions.get(this.internalStationName);
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            const consumerGroup = this.consumerGroup.replace(/\./g, '#').toLowerCase();
            const consumerName = this.consumerName.replace(/\./g, '#').toLowerCase();
            const durableName = consumerGroup || consumerName;
            if (stationPartitions != null && stationPartitions.length > 0) {
                for (const p of stationPartitions) {
                    await this.connection.brokerStats.consumers.info(`${stationName}$${p}`, durableName);
                }
            }
            else {
                await this.connection.brokerStats.consumers.info(stationName, durableName);
            }
        }
        catch (ex) {
            if (ex.message.includes('consumer not found') || ex.message.includes('stream not found')) {
                this.eventEmitter.emit('error', (0, utils_1.MemphisError)(new Error('station/consumer were not found')));
            }
        }
    }
    stop() {
        clearInterval(this.pullInterval);
        clearInterval(this.pingConsumerInvterval);
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
    async destroy(timeoutRetry = 5) {
        var _a;
        clearInterval(this.pullInterval);
        clearInterval(this.pingConsumerInvterval);
        try {
            let removeConsumerReq = {
                name: this.consumerName,
                station_name: this.stationName,
                username: this.connection.username,
                connection_id: this.connection.connectionId,
                req_version: 1,
            };
            let data = this.connection.JSONC.encode(removeConsumerReq);
            let errMsg = await this.connection.request('$memphis_consumer_destructions', data, timeoutRetry);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            let clientNumber = this.connection.clientsPerStation.get(stationName) - 1;
            this.connection.clientsPerStation.set(stationName, clientNumber);
            if (clientNumber === 0) {
                let sub = this.connection.schemaUpdatesSubs.get(stationName);
                if (sub)
                    sub.unsubscribe();
                this.connection.stationSchemaDataMap.delete(stationName);
                this.connection.schemaUpdatesSubs.delete(stationName);
                this.connection.meassageDescriptors.delete(stationName);
                this.connection.jsonSchemas.delete(stationName);
            }
            this.connection._unSetCachedConsumer(this);
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                return;
            }
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    _getConsumerKey() {
        const internalStationName = this.stationName.replace(/\./g, '#').toLowerCase();
        return `${internalStationName}_${this.realName}`;
    }
    _getConsumerStation() {
        return this.internalStationName;
    }
}
exports.Consumer = Consumer;
