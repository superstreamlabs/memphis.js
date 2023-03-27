import { MsgHdrs } from 'nats';
export declare class MsgHeaders {
    headers: MsgHdrs;
    constructor();
    add(key: string, value: string): void;
}
