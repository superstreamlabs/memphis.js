import { Memphis } from "./memphis";
import * as broker from 'nats';
export declare class Message {
    private message;
    private connection;
    private cgName;
    private stationName;
    private internal_station;
    private station;
    constructor(message: broker.JsMsg, connection: Memphis, cgName: string, internalStationName: string);
    ack(): void;
    getData(): Uint8Array;
    getDataDeserialized(): any;
    getDataAsJson(): Object;
    getHeaders(): Object;
    getSequenceNumber(): number;
    delay(millis: number): void;
}
