import { Memphis } from "./memphis";
import * as broker from 'nats';
export declare class Message {
    private message;
    private connection;
    private cgName;
    private stationName;
    private internal_station;
    private station;
    private partition_number;
    constructor(message: broker.JsMsg, connection: Memphis, cgName: string, internalStationName: string, partition_number: number);
    private _isInDls;
    ack(): void;
    nack(): void;
    deadLetter(reason: string): void;
    getData(): Uint8Array;
    getDataDeserialized(): any;
    getDataAsJson(): Object;
    getHeaders(): Object;
    getSequenceNumber(): number;
    getTimeSent(): Date;
    delay(millis: number): void;
}
