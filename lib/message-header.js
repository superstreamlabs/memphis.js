"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgHeaders = void 0;
const nats_1 = require("nats");
const utils_1 = require("./utils");
class MsgHeaders {
    constructor() {
        this.headers = (0, nats_1.headers)();
    }
    add(key, value) {
        if (!key.startsWith('$memphis')) {
            this.headers.append(key, value);
        }
        else {
            throw (0, utils_1.MemphisError)(new Error('Keys in headers should not start with $memphis'));
        }
    }
}
exports.MsgHeaders = MsgHeaders;
