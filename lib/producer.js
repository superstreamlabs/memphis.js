"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Producer = void 0;
const graphql_1 = require("graphql");
const _1 = require(".");
const utils_1 = require("./utils");
const schemaVFailAlertType = 'schema_validation_fail_alert';
class Producer {
    constructor(connection, producerName, stationName, realName) {
        this.connection = connection;
        this.producerName = producerName.toLowerCase();
        this.stationName = stationName.toLowerCase();
        this.internal_station = this.stationName.replace(/\./g, '#').toLowerCase();
        this.realName = realName;
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
    async produce({ message, ackWaitSec = 15, asyncProduce = false, headers = new _1.MsgHeaders(), msgId = null }) {
        try {
            headers = this._handleHeaders(headers);
            let messageToSend = this._validateMessage(message);
            headers.set('$memphis_connectionId', this.connection.connectionId);
            headers.set('$memphis_producedBy', this.producerName);
            if (msgId)
                headers.set('msg-id', msgId);
            if (asyncProduce)
                this.connection.brokerConnection.publish(`${this.internal_station}.final`, messageToSend, {
                    headers: headers,
                    ackWait: ackWaitSec * 1000 * 1000000
                });
            else
                await this.connection.brokerConnection.publish(`${this.internal_station}.final`, messageToSend, {
                    headers: headers,
                    ackWait: ackWaitSec * 1000 * 1000000
                });
        }
        catch (ex) {
            await this._hanldeProduceError(ex, message, headers);
        }
    }
    _parseJsonValidationErrors(errors) {
        const errorsArray = [];
        for (const error of errors) {
            if (error.instancePath)
                errorsArray.push(`${error.schemaPath} ${error.message}`);
            else
                errorsArray.push(error.message);
        }
        return errorsArray.join(', ');
    }
    _validateJsonMessage(msg) {
        try {
            let validate = this.connection.jsonSchemas.get(this.internal_station);
            let msgObj;
            let msgToSend = new Uint8Array();
            const isBuffer = Buffer.isBuffer(msg);
            if (isBuffer) {
                try {
                    msgObj = JSON.parse(msg.toString());
                }
                catch (ex) {
                    throw (0, utils_1.MemphisError)(new Error('Expecting Json format: ' + ex));
                }
                msgToSend = msg;
                const valid = validate(msgObj);
                if (!valid) {
                    throw (0, utils_1.MemphisError)(new Error(`${this._parseJsonValidationErrors(validate['errors'])}`));
                }
                return msgToSend;
            }
            else if (Object.prototype.toString.call(msg) == '[object Object]') {
                msgObj = msg;
                let enc = new TextEncoder();
                const msgString = JSON.stringify(msg);
                msgToSend = enc.encode(msgString);
                const valid = validate(msgObj);
                if (!valid) {
                    throw (0, utils_1.MemphisError)(new Error(`${this._parseJsonValidationErrors(validate['errors'])}`));
                }
                return msgToSend;
            }
            else {
                throw (0, utils_1.MemphisError)(new Error('Unsupported message type'));
            }
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(new Error(`Schema validation has failed: ${ex.message}`));
        }
    }
    _validateProtobufMessage(msg) {
        let meassageDescriptor = this.connection.meassageDescriptors.get(this.internal_station);
        if (meassageDescriptor) {
            if (msg instanceof Uint8Array) {
                try {
                    meassageDescriptor.decode(msg);
                    return msg;
                }
                catch (ex) {
                    if (ex.message.includes('index out of range') || ex.message.includes('invalid wire type')) {
                        ex = new Error('Schema validation has failed: Invalid message format, expecting protobuf');
                        throw (0, utils_1.MemphisError)(new Error(ex.message));
                    }
                    throw (0, utils_1.MemphisError)(new Error(`Schema validation has failed: ${ex.message}`));
                }
            }
            else if (msg instanceof Object) {
                let errMsg = meassageDescriptor.verify(msg);
                if (errMsg) {
                    throw (0, utils_1.MemphisError)(new Error(`Schema validation has failed: ${errMsg}`));
                }
                const protoMsg = meassageDescriptor.create(msg);
                const messageToSend = meassageDescriptor.encode(protoMsg).finish();
                return messageToSend;
            }
            else {
                throw (0, utils_1.MemphisError)(new Error('Schema validation has failed: Unsupported message type'));
            }
        }
    }
    _validateGraphqlMessage(msg) {
        try {
            let msgToSend;
            let message;
            if (msg instanceof Uint8Array) {
                const msgString = new TextDecoder().decode(msg);
                msgToSend = msg;
                message = (0, graphql_1.parse)(msgString);
            }
            else if (typeof msg == 'string') {
                message = (0, graphql_1.parse)(msg);
                msgToSend = new TextEncoder().encode(msg);
            }
            else if (msg.kind == 'Document') {
                message = msg;
                const msgStr = msg.loc.source.body.toString();
                msgToSend = new TextEncoder().encode(msgStr);
            }
            else {
                throw (0, utils_1.MemphisError)(new Error('Unsupported message type'));
            }
            const schema = this.connection.graphqlSchemas.get(this.internal_station);
            const validateRes = (0, graphql_1.validate)(schema, message);
            if (validateRes.length > 0) {
                throw (0, utils_1.MemphisError)(new Error('Schema validation has failed: ' + validateRes));
            }
            return msgToSend;
        }
        catch (ex) {
            if (ex.message.includes('Syntax Error')) {
                ex = new Error('Schema validation has failed: Invalid message format, expecting GraphQL');
                throw (0, utils_1.MemphisError)(ex);
            }
            throw (0, utils_1.MemphisError)(new Error('Schema validation has failed: ' + ex));
        }
    }
    _validateMessage(msg) {
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
        }
        else {
            if (Object.prototype.toString.call(msg) == '[object Object]') {
                return Buffer.from(JSON.stringify(msg));
            }
            if (Object.prototype.toString.call(msg) == '[object String]') {
                return Buffer.from(msg);
            }
            if (!Buffer.isBuffer(msg)) {
                throw (0, utils_1.MemphisError)(new Error('Unsupported message type'));
            }
            else {
                return msg;
            }
        }
    }
    _getDlsMsgId(stationName, producerName, unixTime) {
        return stationName + '~' + producerName + '~0~' + unixTime;
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
            if (this.connection.stationSchemaverseToDlsMap.get(this.internal_station)) {
                const unixTime = Date.now();
                const id = this._getDlsMsgId(this.internal_station, this.producerName, unixTime.toString());
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
                    _id: id,
                    station_name: this.internal_station,
                    producer: {
                        name: this.producerName,
                        connection_id: this.connection.connectionId
                    },
                    creation_unix: unixTime,
                    message: {
                        data: (0, utils_1.stringToHex)(failedMsg),
                        headers: headersObject
                    },
                    validation_error: ex.message,
                });
                await this.connection.brokerConnection.publish('$memphis-' + this.internal_station + '-dls.schema.' + id, buf);
                if (this.connection.clusterConfigurations.get('send_notification')) {
                    this.connection.sendNotification('Schema validation has failed', `Station: ${this.stationName}\nProducer: ${this.producerName}\nError: ${ex.message}`, failedMsg, schemaVFailAlertType);
                }
            }
        }
        throw (0, utils_1.MemphisError)(ex);
    }
    async destroy() {
        var _a;
        try {
            let removeProducerReq = {
                name: this.producerName,
                station_name: this.stationName,
                username: this.connection.username
            };
            let data = this.connection.JSONC.encode(removeProducerReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_producer_destructions', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            let prodNumber = this.connection.producersPerStation.get(stationName) - 1;
            this.connection.producersPerStation.set(stationName, prodNumber);
            if (prodNumber === 0) {
                let sub = this.connection.schemaUpdatesSubs.get(stationName);
                if (sub)
                    sub.unsubscribe();
                this.connection.stationSchemaDataMap.delete(stationName);
                this.connection.schemaUpdatesSubs.delete(stationName);
                this.connection.meassageDescriptors.delete(stationName);
                this.connection.jsonSchemas.delete(stationName);
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
    _getProducerKey() {
        const internalStationName = this.stationName.replace(/\./g, '#').toLowerCase();
        return `${internalStationName}_${this.realName.toLowerCase()}`;
    }
    _getProducerStation() {
        return this.internal_station;
    }
}
exports.Producer = Producer;
