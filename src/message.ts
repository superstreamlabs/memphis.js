import { Memphis } from "./memphis";

import * as broker from 'nats';

export class Message {
    private message: broker.JsMsg;
    private connection: Memphis;
    private cgName: string;
    constructor(message: broker.JsMsg, connection: Memphis, cgName: string) {
        this.message = message;
        this.connection = connection;
        this.cgName = cgName;
    }

    /**
     * Ack a message is done processing.
     */
    ack() {
        if (this.message.ack)
            // for dls events which are unackable (core NATS messages)
            this.message.ack();
        else {
            let buf = this.connection.JSONC.encode({
                id: this.message.headers.get('$memphis_pm_id'),
                sequence: this.message.headers.get('$memphis_pm_sequence')
            });

            this.connection.brokerManager.publish('$memphis_pm_acks', buf);
        }
    }

    /**
     * Returns the message payload.
     */
    getData(): Uint8Array {
        const isBuffer = Buffer.isBuffer(this.message.data);
        if (!isBuffer) {
            return Buffer.from(this.message.data);
        } else {
            return this.message.data;
        }
    }

    /**
     * Returns the message headers.
     */
    getHeaders(): Object {
        const msgHeaders = {}
        const hdrs = this.message.headers['headers'];

        for (let [key, value] of hdrs) {
            if (key.startsWith("$memphis"))
                continue;
            msgHeaders[key] = value[0];
        }
        return msgHeaders;
    }

    /**
     * Returns the message sequence number.
     */
    getSequenceNumber(): number {
        return this.message.seq;
    }
}