import { Memphis } from "./memphis";

import * as broker from 'nats';
import { MemphisError } from "./utils";
import { Station } from "./station";

import { MemphisErrors } from './errors'

export class Message {
    private message: broker.JsMsg;
    private connection: Memphis;
    private cgName: string;
    private stationName: string;
    private internal_station: string;
    private station: Station;
    private partition_number: number;

    constructor(message: broker.JsMsg, connection: Memphis, cgName: string, internalStationName: string, partition_number: number) {
        this.message = message;
        this.connection = connection;
        this.cgName = cgName;
        this.internal_station = internalStationName;
        this.station = new Station(connection, internalStationName);
        this.partition_number = partition_number;
    }

    private _isInDls() {
        return this.partition_number == -1;
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
                id: parseInt(this.message.headers.get('$memphis_pm_id')),
                cg_name: this.message.headers.get('$memphis_pm_cg_name')
            });

            this.connection.brokerManager.publish('$memphis_pm_acks', buf);
        }
    }

    /**
     * nack - not ack for a message, meaning that the message will be redelivered again to the same consumers group without waiting to its ack wait time.
     */
    nack() {
        if (this.message.nak)
            this.message.nak();
    }

    /**
     * deadLetter - Sending the message to the dead-letter station (DLS). the broker won't resend the message again to the same consumers group and will place the message inside the dead-letter station (DLS) with the given reason.
     * The message will still be available to other consumer groups
     * @param reason - the reason for the dead-lettering
     * @returns void
     */
    deadLetter(reason: string) {
        if (this._isInDls())
            return;
        try {
            if (this.message.term)
                this.message.term();
            else
                return;

            const data = {
                station_name: this.internal_station,
                error: reason,
                partition: this.partition_number,
                cg_name: this.cgName,
                seq: this.message.seq
            }
            const requestPayload = this.connection.JSONC.encode(data);
            this.connection.brokerManager.publish('$memphis_nacked_dls', requestPayload);
        }
        catch (ex) {
            throw MemphisError(ex);
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
     * Returns the message payload deserialized.
    */
    getDataDeserialized(): any {
        let stationSchemaData = this.connection.stationSchemaDataMap.get(this.internal_station);

        let message
        const isBuffer = Buffer.isBuffer(this.message.data);
        if (!isBuffer) {
            message = Buffer.from(this.message.data);
        } else {
            message = this.message.data;
        }

        let msgObj
        if (stationSchemaData) {
            try {
                this.station._validateMessage(message)
            }
            catch (ex) {
                throw MemphisErrors.DeserializationFailure(ex);
            }
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

    /**
     * Returns the message payload as json or null in case of an invalid json.
     */
    getDataAsJson(): Object {
        const isBuffer = Buffer.isBuffer(this.message.data);
        let message;
        if (!isBuffer) {
            message = Buffer.from(this.message.data);
        } else {
            message = this.message.data;
        }

        return JSON.parse(message.toString());
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

    /**
     * Returns time when the message was sent.
     */
    getTimeSent() {
        const timestampNanos = this.message.info.timestampNanos;
        let timestampMillis = timestampNanos / 1000000;
        return new Date(timestampMillis);
    }

    /**
     * Delay and resend the message after N milliseconds
     */
    delay(millis: number) {
        if (this.message.nak)
            this.message.nak(millis);
        else
            throw MemphisErrors.CannotDelayDLSMsg;
    }
}
