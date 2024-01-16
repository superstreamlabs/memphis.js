import { headers, MsgHdrs } from 'nats';

import { MemphisError } from './utils';
import { MemphisErrors } from './errors'

export class MsgHeaders {
    headers: MsgHdrs;

    constructor() {
        this.headers = headers();
    }

    /**
     * Add a header.
     * @param {String} key - header key.
     * @param {String} value - header value.
     */
    add(key: string, value: string): void {
        if (!key.startsWith('$memphis')) {
            this.headers.append(key, value);
        } else {
            throw MemphisErrors.InvalidHeaderKeyNameStart;
        }
    }
}