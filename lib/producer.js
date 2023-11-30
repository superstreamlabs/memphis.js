"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Producer = void 0;
const _1 = require(".");
const utils_1 = require("./utils");
const station_1 = require("./station");
const schemaVFailAlertType = 'schema_validation_fail_alert';
class Producer {
    constructor(connection, producerName, stationName, realName, partitions) {
        this.isMultiStationProducer = false;
        this.connection = connection;
        this.producerName = producerName.toLowerCase();
        if (Array.isArray(stationName)) {
            this.stationNames = stationName;
            this.isMultiStationProducer = true;
        }
        if (typeof stationName === 'string') {
            this.stationName = stationName.toLowerCase();
            this.internalStation = this.stationName.replace(/\./g, '#').toLowerCase();
            this.station = new station_1.Station(connection, stationName);
        }
        this.realName = realName;
        if ((partitions === null || partitions === void 0 ? void 0 : partitions.length) > 0) {
            this.partitionsGenerator = new _1.RoundRobinProducerConsumerGenerator(partitions);
        }
    }
    _handleHeaders(headers) {
        let type;
        if (headers instanceof _1.MsgHeaders) {
            type = 'memphisHeaders';
        }
        else if (Object.prototype.toString.call(headers) === '[object Object]') {
            type = 'object';
        }
        else {
            throw (0, utils_1.MemphisError)(new Error('headers has to be a Javascript object or an instance of MsgHeaders'));
        }
        switch (type) {
            case 'object':
                const msgHeaders = this.connection.headers();
                for (let key in headers)
                    msgHeaders.add(key, headers[key]);
                return msgHeaders.headers;
            case 'memphisHeaders':
                return headers.headers;
        }
    }
    async produce({ message, ackWaitSec = 15, asyncProduce = true, headers = new _1.MsgHeaders(), msgId = null, producerPartitionKey = null, producerPartitionNumber = -1 }) {
        if (this.isMultiStationProducer) {
            await this._multiStationProduce({
                message,
                ackWaitSec,
                asyncProduce,
                headers,
                msgId,
                producerPartitionKey,
                producerPartitionNumber
            });
        }
        else {
            await this._singleStationProduce({
                message,
                ackWaitSec,
                asyncProduce,
                headers,
                msgId,
                producerPartitionKey,
                producerPartitionNumber
            });
        }
    }
    async _singleStationProduce({ message, ackWaitSec = 15, asyncProduce = true, headers = new _1.MsgHeaders(), msgId = null, producerPartitionKey = null, producerPartitionNumber = -1 }) {
        try {
            headers = this._handleHeaders(headers);
            let messageToSend = this.station._validateMessage(message);
            headers.set('$memphis_connectionId', this.connection.connectionId);
            headers.set('$memphis_producedBy', this.producerName);
            if (msgId)
                headers.set('msg-id', msgId);
            let streamName = `${this.internalStation}`;
            let stationPartitions = this.connection.stationPartitions.get(this.internalStation);
            if (stationPartitions != null && stationPartitions.length === 1) {
                let partitionNumber = stationPartitions[0];
                streamName = `${this.internalStation}$${partitionNumber.toString()}`;
            }
            else if (stationPartitions != null && stationPartitions.length > 0) {
                if (producerPartitionNumber > 0 && producerPartitionKey != null) {
                    throw (0, utils_1.MemphisError)(new Error('Can not use both partition number and partition key'));
                }
                if (producerPartitionKey != null) {
                    const partitionNumberKey = this.connection._getPartitionFromKey(producerPartitionKey, this.internalStation);
                    streamName = `${this.internalStation}$${partitionNumberKey.toString()}`;
                }
                else if (producerPartitionNumber > 0) {
                    this.connection._validatePartitionNumber(producerPartitionNumber, this.internalStation);
                    streamName = `${this.internalStation}$${producerPartitionNumber.toString()}`;
                }
                else {
                    let partitionNumber = this.partitionsGenerator.Next();
                    streamName = `${this.internalStation}$${partitionNumber.toString()}`;
                }
            }
            let fullSubjectName = '';
            if (this.connection.stationFunctionsMap.has(this.internalStation)) {
                const partitionNumber = streamName.split('$')[1];
                if (this.connection.stationFunctionsMap.get(this.internalStation).has(partitionNumber)) {
                    fullSubjectName = `${streamName}.functions.${this.connection.stationFunctionsMap.get(this.internalStation).get(partitionNumber)}`;
                }
                else {
                    fullSubjectName = `${streamName}.final`;
                }
            }
            else {
                fullSubjectName = `${streamName}.final`;
            }
            if (asyncProduce)
                this.connection.brokerConnection.publish(fullSubjectName, messageToSend, {
                    headers: headers,
                    ackWait: ackWaitSec * 1000 * 1000000
                });
            else
                await this.connection.brokerConnection.publish(fullSubjectName, messageToSend, {
                    headers: headers,
                    ackWait: ackWaitSec * 1000 * 1000000
                });
        }
        catch (ex) {
            await this._hanldeProduceError(ex, message, headers);
        }
    }
    async _multiStationProduce({ message, ackWaitSec = 15, asyncProduce = true, headers = new _1.MsgHeaders(), msgId = null, producerPartitionKey = null, producerPartitionNumber = -1 }) {
        for (const stationName of this.stationNames) {
            await this.connection.produce({
                stationName,
                producerName: this.producerName,
                message,
                ackWaitSec,
                asyncProduce,
                headers,
                msgId,
                producerPartitionKey,
                producerPartitionNumber
            });
        }
    }
    async _hanldeProduceError(ex, message, headers) {
        if (ex.code === '503') {
            throw (0, utils_1.MemphisError)(new Error('Produce operation has failed, please check whether Station/Producer still exist'));
        }
        if (ex.message.includes('BAD_PAYLOAD'))
            ex = (0, utils_1.MemphisError)(new Error('Invalid message format, expecting Uint8Array'));
        if (ex.message.includes('Schema validation has failed')) {
            let failedMsg = '';
            if (message instanceof Uint8Array) {
                failedMsg = String.fromCharCode.apply(null, message);
            }
            else {
                failedMsg = JSON.stringify(message);
            }
            if (this.connection.stationSchemaverseToDlsMap.get(this.internalStation)) {
                const unixTime = Date.now();
                let headersObject = {
                    $memphis_connectionId: this.connection.connectionId,
                    $memphis_producedBy: this.producerName
                };
                const keys = headers.headers.keys();
                for (let key of keys) {
                    const value = headers.headers.get(key);
                    headersObject[key] = value[0];
                }
                const buf = this.connection.JSONC.encode({
                    station_name: this.internalStation,
                    producer: {
                        name: this.producerName,
                        connection_id: this.connection.connectionId
                    },
                    message: {
                        data: (0, utils_1.stringToHex)(failedMsg),
                        headers: headersObject
                    },
                    validation_error: ex.message,
                });
                await this.connection.brokerManager.publish('$memphis_schemaverse_dls', buf);
                if (this.connection.clusterConfigurations.get('send_notification')) {
                    this.connection.sendNotification('Schema validation has failed', `Station: ${this.stationName}\nProducer: ${this.producerName}\nError: ${ex.message}`, failedMsg, schemaVFailAlertType);
                }
            }
        }
        throw (0, utils_1.MemphisError)(ex);
    }
    async destroy(timeoutRetry = 5) {
        if (this.isMultiStationProducer) {
            await this._destroyMultiStationProducer(timeoutRetry);
        }
        else {
            await this._destroySingleStationProducer(timeoutRetry);
        }
    }
    async _destroySingleStationProducer(timeoutRetry) {
        var _a;
        try {
            let removeProducerReq = {
                name: this.producerName,
                station_name: this.stationName,
                username: this.connection.username,
                connection_id: this.connection.connectionId,
                req_version: 1,
            };
            let data = this.connection.JSONC.encode(removeProducerReq);
            let errMsg = await this.connection.request('$memphis_producer_destructions', data, timeoutRetry);
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
            let functionClients = this.connection.functionsClientsMap.get(stationName) - 1;
            this.connection.functionsClientsMap.set(stationName, functionClients);
            if (functionClients === 0) {
                this.connection.stationFunctionsMap.delete(stationName);
                this.connection.functionsClientsMap.delete(stationName);
                let functionSub = this.connection.functionsUpdateSubs.get(stationName);
                if (functionSub)
                    functionSub.unsubscribe();
                this.connection.functionsUpdateSubs.delete(stationName);
            }
            this.connection._unSetCachedProducer(this);
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                return;
            }
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async _destroyMultiStationProducer(timeoutRetry) {
        const internalStationNames = this.stationNames.map(stationName => stationName.replace(/\./g, '#').toLowerCase());
        const producerKeys = internalStationNames.map(internalStationName => `${internalStationName}_${this.realName.toLowerCase()}`);
        const producers = producerKeys
            .map(producerKey => this.connection._getCachedProducer(producerKey))
            .filter(producer => producer);
        for (const producer of producers) {
            await producer._destroySingleStationProducer(timeoutRetry);
        }
    }
    _getProducerKey() {
        const internalStationName = this.stationName.replace(/\./g, '#').toLowerCase();
        return `${internalStationName}_${this.realName.toLowerCase()}`;
    }
    _getProducerStation() {
        return this.internalStation;
    }
}
exports.Producer = Producer;
