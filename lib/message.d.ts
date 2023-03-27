import { Memphis } from "./memphis";
import * as broker from 'nats';
export declare class Message {
    private message;
    private connection;
    private cgName;
    constructor(message: broker.JsMsg, connection: Memphis, cgName: string);
    ack(): void;
    getData(): Uint8Array;
    getDataAsJson(): Object;
    getHeaders(): Object;
    getSequenceNumber(): number;
}
