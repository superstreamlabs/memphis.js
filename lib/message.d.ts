import { Memphis } from "./memphis";
import * as broker from 'nats';
export declare class Message {
    private message;
    private connection;
    private cgName;
    private stationName;
    constructor(message: broker.JsMsg, connection: Memphis, cgName: string, stationName: string);
    ack(): void;
    getData(): Uint8Array;
    getDataDeserialized(): any;
    getDataAsJson(): Object;
    getHeaders(): Object;
    getSequenceNumber(): number;
    delay(millis: number): void;
}
