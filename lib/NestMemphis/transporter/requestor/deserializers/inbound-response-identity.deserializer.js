"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundResponseIdentityDeserializer = void 0;
const common_1 = require("@nestjs/common");
class InboundResponseIdentityDeserializer {
    constructor() {
        this.logger = new common_1.Logger('InboundResponseIdentityDeserializer');
    }
    deserialize(value) {
        this.logger.verbose(`<<-- deserializing inbound response:\n${JSON.stringify(value)}`);
        return value;
    }
}
exports.InboundResponseIdentityDeserializer = InboundResponseIdentityDeserializer;
