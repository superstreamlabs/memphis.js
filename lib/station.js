"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Station = void 0;
const utils_1 = require("./utils");
const graphql_1 = require("graphql");
const avro = require('avro-js');
class Station {
    constructor(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
        this.internalName = this.name.replace(/\./g, '#').toLowerCase();
    }
    _validateJsonMessage(msg) {
        try {
            let validate = this.connection.jsonSchemas.get(this.internalName);
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
    _validateAvroMessage(msg) {
        try {
            let schema = this.connection.avroSchemas.get(this.internalName);
            let msgObj;
            let msgToSend = new Uint8Array();
            const isBuffer = Buffer.isBuffer(msg);
            if (isBuffer) {
                try {
                    msgObj = JSON.parse(msg.toString());
                }
                catch (ex) {
                    throw (0, utils_1.MemphisError)(new Error('Expecting Avro format: ' + ex));
                }
                msgToSend = msg;
                const type = avro.parse(schema);
                var buf = type.toBuffer(msgObj);
                const valid = type.isValid(msgObj);
                if (!valid) {
                    throw (0, utils_1.MemphisError)(new Error(`Schema validation has failed: ${type}`));
                }
                return msgToSend;
            }
            else if (Object.prototype.toString.call(msg) == '[object Object]') {
                msgObj = msg;
                let enc = new TextEncoder();
                const msgString = JSON.stringify(msg);
                msgToSend = enc.encode(msgString);
                const type = avro.parse(schema);
                var buf = type.toBuffer(msgObj);
                const valid = type.isValid(msgObj);
                if (!valid) {
                    throw (0, utils_1.MemphisError)(new Error(`Schema validation has failed: ${type}`));
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
        let meassageDescriptor = this.connection.meassageDescriptors.get(this.internalName);
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
            const schema = this.connection.graphqlSchemas.get(this.internalName);
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
        let stationSchemaData = this.connection.stationSchemaDataMap.get(this.internalName);
        if (stationSchemaData) {
            switch (stationSchemaData['type']) {
                case 'protobuf':
                    return this._validateProtobufMessage(msg);
                case 'json':
                    return this._validateJsonMessage(msg);
                case 'graphql':
                    return this._validateGraphqlMessage(msg);
                case 'avro':
                    return this._validateAvroMessage(msg);
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
    async destroy(timeoutRetry = 5) {
        var _a, _b;
        try {
            const removeStationReq = {
                station_name: this.name,
                username: this.connection.username,
            };
            const stationName = this.name.replace(/\./g, '#').toLowerCase();
            const sub = this.connection.schemaUpdatesSubs.get(stationName);
            (_a = sub === null || sub === void 0 ? void 0 : sub.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(sub);
            this.connection.stationSchemaDataMap.delete(stationName);
            this.connection.schemaUpdatesSubs.delete(stationName);
            this.connection.clientsPerStation.delete(stationName);
            this.connection.meassageDescriptors.delete(stationName);
            this.connection.jsonSchemas.delete(stationName);
            this.connection.stationFunctionsMap.delete(stationName);
            this.connection.functionsClientsMap.delete(stationName);
            let functionSub = this.connection.functionsUpdateSubs.get(stationName);
            if (functionSub)
                functionSub.unsubscribe();
            this.connection.functionsUpdateSubs.delete(stationName);
            const data = this.connection.JSONC.encode(removeStationReq);
            const res = await this.connection.request('$memphis_station_destructions', data, timeoutRetry);
            const errMsg = res.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
            this.connection._unSetCachedProducerStation(this.internalName);
            this.connection._unSetCachedConsumerStation(this.internalName);
        }
        catch (ex) {
            if ((_b = ex.message) === null || _b === void 0 ? void 0 : _b.includes('not exist')) {
                return;
            }
            throw (0, utils_1.MemphisError)(ex);
        }
    }
}
exports.Station = Station;
