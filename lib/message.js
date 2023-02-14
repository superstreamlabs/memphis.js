"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
class Message {
    constructor(message, connection, cgName) {
        this.message = message;
        this.connection = connection;
        this.cgName = cgName;
    }
    ack() {
        if (this.message.ack)
            this.message.ack();
        else {
            let buf = this.connection.JSONC.encode({
                id: this.message.headers.get('$memphis_pm_id'),
                sequence: this.message.headers.get('$memphis_pm_sequence')
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
}
exports.Message = Message;
