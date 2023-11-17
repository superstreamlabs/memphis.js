import { Memphis } from ".";
import { MemphisError } from "./utils";
import { parse as parseGraphQl, validate as validateGraphQl } from 'graphql';
const avro = require('avro-js')

export class Station {
    private connection: Memphis;
    public name: string;
    public internalName: string;

    constructor(connection: Memphis, name: string) {
        this.connection = connection;
        this.name = name.toLowerCase();
        this.internalName = this.name.replace(/\./g, '#').toLowerCase();
    }

    private _validateJsonMessage(msg: any): any {
        try {
            let validate = this.connection.jsonSchemas.get(this.internalName);
            let msgObj: Object;
            let msgToSend = new Uint8Array();
            const isBuffer = Buffer.isBuffer(msg);
            if (isBuffer) {
                try {
                    msgObj = JSON.parse(msg.toString());
                } catch (ex) {
                    throw MemphisError(new Error('Expecting Json format: ' + ex));
                }
                msgToSend = msg;
                const valid = validate(msgObj);
                if (!valid) {
                    throw MemphisError(new Error(`${this._parseJsonValidationErrors(validate['errors'])}`));
                }
                return msgToSend;
            } else if (Object.prototype.toString.call(msg) == '[object Object]') {
                msgObj = msg;
                let enc = new TextEncoder();
                const msgString = JSON.stringify(msg);
                msgToSend = enc.encode(msgString);
                const valid = validate(msgObj);
                if (!valid) {
                    throw MemphisError(new Error(`${this._parseJsonValidationErrors(validate['errors'])}`));
                }
                return msgToSend;
            } else {
                throw MemphisError(new Error('Unsupported message type'));
            }
        } catch (ex) {
            throw MemphisError(new Error(`Schema validation has failed: ${ex.message}`));
        }
    }

    private _validateAvroMessage(msg: any): any {
        try {
            let schema = this.connection.avroSchemas.get(this.internalName);
            let msgObj;
            let msgToSend = new Uint8Array();
            const isBuffer = Buffer.isBuffer(msg);
            if (isBuffer) {
                try {
                    msgObj = JSON.parse(msg.toString());
                } catch (ex) {
                    throw MemphisError(new Error('Expecting Avro format: ' + ex));
                }
                msgToSend = msg;
                const type = avro.parse(schema); 
                var buf = type.toBuffer(msgObj);
                const valid = type.isValid(msgObj);
                if (!valid) {
                    throw MemphisError(new Error(`Schema validation has failed: ${type}`));
                }
                return msgToSend;
            } else if (Object.prototype.toString.call(msg) == '[object Object]') {
                msgObj = msg;
                let enc = new TextEncoder();
                const msgString = JSON.stringify(msg);
                msgToSend = enc.encode(msgString);
                const type = avro.parse(schema); 
                var buf = type.toBuffer(msgObj);
                const valid = type.isValid(msgObj);
                if (!valid) {
                    throw MemphisError(new Error(`Schema validation has failed: ${type}`));
                }

                return msgToSend;
            } else {
                throw MemphisError(new Error('Unsupported message type'));
            }
        } catch (ex) {
            throw MemphisError(new Error(`Schema validation has failed: ${ex.message}`));
        }
    }

    private _validateProtobufMessage(msg: any): any {
        let meassageDescriptor = this.connection.meassageDescriptors.get(this.internalName);
        if (meassageDescriptor) {
            if (msg instanceof Uint8Array) {
                try {
                    meassageDescriptor.decode(msg);
                    return msg;
                } catch (ex) {
                    if (ex.message.includes('index out of range') || ex.message.includes('invalid wire type')) {
                        ex = new Error('Schema validation has failed: Invalid message format, expecting protobuf');
                        throw MemphisError(new Error(ex.message));
                    }
                    throw MemphisError(new Error(`Schema validation has failed: ${ex.message}`));
                }
            } else if (msg instanceof Object) {
                let errMsg = meassageDescriptor.verify(msg);
                if (errMsg) {
                    throw MemphisError(new Error(`Schema validation has failed: ${errMsg}`));
                }
                const protoMsg = meassageDescriptor.create(msg);
                const messageToSend = meassageDescriptor.encode(protoMsg).finish();
                return messageToSend;
            } else {
                throw MemphisError(new Error('Schema validation has failed: Unsupported message type'));
            }
        }
    }

    private _validateGraphqlMessage(msg: any): any {
        try {
            let msgToSend: Uint8Array;
            let message: any;
            if (msg instanceof Uint8Array) {
                const msgString = new TextDecoder().decode(msg);
                msgToSend = msg;
                message = parseGraphQl(msgString);
            } else if (typeof msg == 'string') {
                message = parseGraphQl(msg);
                msgToSend = new TextEncoder().encode(msg);
            } else if (msg.kind == 'Document') {
                message = msg;
                const msgStr = msg.loc.source.body.toString();
                msgToSend = new TextEncoder().encode(msgStr);
            } else {
                throw MemphisError(new Error('Unsupported message type'));
            }
            const schema = this.connection.graphqlSchemas.get(this.internalName);
            const validateRes = validateGraphQl(schema, message);
            if (validateRes.length > 0) {
                throw MemphisError(new Error('Schema validation has failed: ' + validateRes));
            }
            return msgToSend;
        } catch (ex) {
            if (ex.message.includes('Syntax Error')) {
                ex = new Error('Schema validation has failed: Invalid message format, expecting GraphQL');
                throw MemphisError(ex);
            }
            throw MemphisError(new Error('Schema validation has failed: ' + ex));
        }
    }

    _validateMessage(msg: any): any {
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
        } else {
            if (Object.prototype.toString.call(msg) == '[object Object]') {
                return Buffer.from(JSON.stringify(msg));
            }
            if (Object.prototype.toString.call(msg) == '[object String]') {
                return Buffer.from(msg);
            }
            if (!Buffer.isBuffer(msg)) {
                throw MemphisError(new Error('Unsupported message type'));
            } else {
                return msg;
            }
        }
    }

    private _parseJsonValidationErrors(errors: any): any {
        const errorsArray = [];
        for (const error of errors) {
            if (error.instancePath) errorsArray.push(`${error.schemaPath} ${error.message}`);
            else errorsArray.push(error.message);
        }
        return errorsArray.join(', ');
    }

    /**
     * Destroy the station.
     */
    async destroy(timeoutRetry:number = 5): Promise<void> {
        try {
            const removeStationReq = {
                station_name: this.name,
                username: this.connection.username,
            };
            const stationName = this.name.replace(/\./g, '#').toLowerCase();
            const sub = this.connection.schemaUpdatesSubs.get(stationName);
            sub?.unsubscribe?.();
            this.connection.stationSchemaDataMap.delete(stationName);
            this.connection.schemaUpdatesSubs.delete(stationName);
            this.connection.clientsPerStation.delete(stationName);
            this.connection.meassageDescriptors.delete(stationName);
            this.connection.jsonSchemas.delete(stationName);
            this.connection.stationFunctionsMap.delete(stationName);
            this.connection.functionsClientsMap.delete(stationName);
            let functionSub = this.connection.functionsUpdateSubs.get(stationName);
            if (functionSub) functionSub.unsubscribe();
            this.connection.functionsUpdateSubs.delete(stationName);
            const data = this.connection.JSONC.encode(removeStationReq);
            const res = await this.connection.request('$memphis_station_destructions', data, timeoutRetry);
            const errMsg = res.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
            this.connection._unSetCachedProducerStation(this.internalName)
            this.connection._unSetCachedConsumerStation(this.internalName)
        } catch (ex) {
            if (ex.message?.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}