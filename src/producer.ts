import { parse as parseGraphQl, validate as validateGraphQl } from 'graphql';
import * as broker from 'nats';

import { Memphis, MsgHeaders, RoundRobinProducerConsumerGenerator } from '.';
import { MemphisError, stringToHex } from './utils';
const avro = require('avro-js')

const schemaVFailAlertType = 'schema_validation_fail_alert';

export class Producer {
    private connection: Memphis;
    private producerName: string;
    private stationName: string;
    private internal_station: string;
    private realName: string;
    private partitionsGenerator: RoundRobinProducerConsumerGenerator;

    constructor(connection: Memphis, producerName: string, stationName: string, realName: string, partitions: number[]) {
        this.connection = connection;
        this.producerName = producerName.toLowerCase();
        this.stationName = stationName.toLowerCase();
        this.internal_station = this.stationName.replace(/\./g, '#').toLowerCase();
        this.realName = realName;
        if (partitions?.length > 0){
            this.partitionsGenerator = new RoundRobinProducerConsumerGenerator(partitions);
        }
    }

    _handleHeaders(headers: any): broker.MsgHdrs {
        let type;
        if (headers instanceof MsgHeaders) {
            type = 'memphisHeaders';
        } else if (Object.prototype.toString.call(headers) === '[object Object]') {
            type = 'object';
        } else {
            throw MemphisError(new Error('headers has to be a Javascript object or an instance of MsgHeaders'));
        }

        switch (type) {
            case 'object':
                const msgHeaders = this.connection.headers();
                for (let key in headers) msgHeaders.add(key, headers[key]);
                return msgHeaders.headers;
            case 'memphisHeaders':
                return headers.headers;
        }
    }

    /**
     * Produces a message into a station.
     * @param {Any} message - message to send into the station (Uint8Arrays/object/string/DocumentNode graphql).
     * @param {Number} ackWaitSec - max time in seconds to wait for an ack from memphis.
     * @param {Boolean} asyncProduce - produce operation won't wait for broker acknowledgement
     * @param {Object} headers - Message headers - javascript object or using the memphis interface for headers (memphis.headers()).
     * @param {String} msgId - Message ID - for idempotent message production
     */
    async produce({
        message,
        ackWaitSec = 15,
        asyncProduce = false,
        headers = new MsgHeaders(),
        msgId = null
    }: {
        message: any;
        ackWaitSec?: number;
        asyncProduce?: boolean;
        headers?: any;
        msgId?: string;
    }): Promise<void> {
        try {
            headers = this._handleHeaders(headers);
            let messageToSend = this._validateMessage(message);
            headers.set('$memphis_connectionId', this.connection.connectionId);
            headers.set('$memphis_producedBy', this.producerName);
            if (msgId) headers.set('msg-id', msgId);
            let streamName = `${this.internal_station}`;
            let stationPartitions = this.connection.stationPartitions.get(this.internal_station)
            if (stationPartitions.length === 1){
                let partitionNumber = stationPartitions[0]
                streamName = `${this.internal_station}$${partitionNumber.toString()}`
            }
            else if(stationPartitions != null && stationPartitions.length > 0){
                let partitionNumber = this.partitionsGenerator.Next()
                streamName = `${this.internal_station}$${partitionNumber.toString()}`
            }
            
            if (asyncProduce)
                this.connection.brokerConnection.publish(`${streamName}.final`, messageToSend, {
                    headers: headers,
                    ackWait: ackWaitSec * 1000 * 1000000
                });
            else
                await this.connection.brokerConnection.publish(`${streamName}.final`, messageToSend, {
                    headers: headers,
                    ackWait: ackWaitSec * 1000 * 1000000
                });
        } catch (ex: any) {
            await this._hanldeProduceError(ex, message, headers);
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

    private _validateJsonMessage(msg: any): any {
        try {
            let validate = this.connection.jsonSchemas.get(this.internal_station);
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
            let schema = this.connection.avroSchemas.get(this.internal_station);
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
        let meassageDescriptor = this.connection.meassageDescriptors.get(this.internal_station);
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
            const schema = this.connection.graphqlSchemas.get(this.internal_station);
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

    private _validateMessage(msg: any): any {
        let stationSchemaData = this.connection.stationSchemaDataMap.get(this.internal_station);
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
    
    private async _hanldeProduceError(ex: any, message: any, headers?: MsgHeaders) {
        if (ex.code === '503') {
            throw MemphisError(new Error('Produce operation has failed, please check whether Station/Producer still exist'));
        }
        if (ex.message.includes('BAD_PAYLOAD')) ex = MemphisError(new Error('Invalid message format, expecting Uint8Array'));
        if (ex.message.includes('Schema validation has failed')) {
            let failedMsg = '';
            if (message instanceof Uint8Array) {
                failedMsg = String.fromCharCode.apply(null, message);
            } else {
                failedMsg = JSON.stringify(message);
            }
            if (this.connection.stationSchemaverseToDlsMap.get(this.internal_station)) {
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
                    station_name: this.internal_station,
                    producer: {
                        name: this.producerName,
                        connection_id: this.connection.connectionId
                    },
                    message: {
                        data: stringToHex(failedMsg),
                        headers: headersObject
                    },
                    validation_error: ex.message,
                });
                await this.connection.brokerManager.publish('$memphis_schemaverse_dls', buf);
                if (this.connection.clusterConfigurations.get('send_notification')) {
                    this.connection.sendNotification(
                        'Schema validation has failed',
                        `Station: ${this.stationName}\nProducer: ${this.producerName}\nError: ${ex.message}`,
                        failedMsg,
                        schemaVFailAlertType
                    );
                }
            }
        }
        throw MemphisError(ex);
    }

    /**
     * Destroy the producer.
     */
    async destroy(): Promise<void> {
        try {
            let removeProducerReq = {
                name: this.producerName,
                station_name: this.stationName,
                username: this.connection.username,
                connection_id: this.connection.connectionId,
                req_version: 1,
            };
            let data = this.connection.JSONC.encode(removeProducerReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_producer_destructions', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            let prodNumber = this.connection.producersPerStation.get(stationName) - 1;
            this.connection.producersPerStation.set(stationName, prodNumber);
            if (prodNumber === 0) {
                let sub = this.connection.schemaUpdatesSubs.get(stationName);
                if (sub) sub.unsubscribe();
                this.connection.stationSchemaDataMap.delete(stationName);
                this.connection.schemaUpdatesSubs.delete(stationName);
                this.connection.meassageDescriptors.delete(stationName);
                this.connection.jsonSchemas.delete(stationName);
            }
            this.connection._unSetCachedProducer(this);
        } catch (ex) {
            if (ex.message?.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }

    /**
     * for internal propose
     * @returns {string} producer key
     */
    public _getProducerKey(): string {
        const internalStationName = this.stationName.replace(/\./g, '#').toLowerCase();
        return `${internalStationName}_${this.realName.toLowerCase()}`;
    }

    /**
     * for internal propose
     * @returns {string} producer key
     */
    public _getProducerStation(): string {
        return this.internal_station;
    }
}
