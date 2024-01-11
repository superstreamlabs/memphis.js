"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgHeaders = void 0;
const nats_1 = require("nats");
const errors_1 = require("./errors");
class MsgHeaders {
    constructor() {
        this.headers = (0, nats_1.headers)();
    }
    add(key, value) {
        if (!key.startsWith('$memphis')) {
            this.headers.append(key, value);
        }
        else {
            throw errors_1.MemphisErrors.InvalidHeaderKeyNameStart;
        }
    }
}
exports.MsgHeaders = MsgHeaders;
