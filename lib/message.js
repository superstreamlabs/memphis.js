"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const utils_1 = require("./utils");
class Message {
    constructor(message, connection, cgName, internalStationName) {
        this.message = message;
        this.connection = connection;
        this.cgName = cgName;
        this.internal_station = internalStationName;
    }
    ack() {
        if (this.message.ack)
            this.message.ack();
        else {
            let buf = this.connection.JSONC.encode({
                id: parseInt(this.message.headers.get('$memphis_pm_id')),
                cg_name: this.message.headers.get('$memphis_pm_cg_name')
            });
            this.connection.brokerManager.publish('$memphis_pm_acks', buf);
        }
    }
    getData() {
        const isBuffer = Buffer.isBuffer(this.message.data);
        if (!isBuffer) {
            return Buffer.from(this.message.data);
        }
        else {
            return this.message.data;
        }
    }
    getDataDeserialized() {
        let stationSchemaData = this.connection.stationSchemaDataMap.get(this.internal_station);

        let message;
        const isBuffer = Buffer.isBuffer(this.message.data);
        if (!isBuffer) {
            message = Buffer.from(this.message.data);
        } else {
            message = this.message.data;
        }

        let msgObj
        if (stationSchemaData) {
            switch (stationSchemaData['type']) {
                case 'protobuf':
                    let meassageDescriptor = this.connection.meassageDescriptors.get(this.internal_station);
                    if (meassageDescriptor) {
                        msgObj = meassageDescriptor.decode(message);
                        return msgObj
                    }
                case 'json':
                    msgObj = JSON.parse(message.toString());
                    return msgObj
                case 'graphql':
                    return message.toString()
                case 'avro':
                    msgObj = JSON.parse(message.toString());
                    return msgObj
                default:
                    return message;
            }
        } else {
            return message;
        }
    }
    getDataAsJson() {
        const isBuffer = Buffer.isBuffer(this.message.data);
        let message;
        if (!isBuffer) {
            message = Buffer.from(this.message.data);
        }
        else {
            message = this.message.data;
        }
        return JSON.parse(message.toString());
    }
    getHeaders() {
        const msgHeaders = {};
        const hdrs = this.message.headers['headers'];
        for (let [key, value] of hdrs) {
            if (key.startsWith("$memphis"))
                continue;
            msgHeaders[key] = value[0];
        }
        return msgHeaders;
    }
    getSequenceNumber() {
        return this.message.seq;
    }
    delay(millis) {
        if (this.message.nak)
            this.message.nak(millis);
        else
            throw (0, utils_1.MemphisError)(new Error('cannot delay DLS message'));
    }
}
exports.Message = Message;
