"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundMessageIdentityDeserializer = void 0;
const common_1 = require("@nestjs/common");
class InboundMessageIdentityDeserializer {
    constructor() {
        this.logger = new common_1.Logger('InboundMessageIdentityDeserializer');
    }
    deserialize(value, options) {
        this.logger.verbose(`<<-- deserializing inbound message:\n${JSON.stringify(value)}\n\twith options: ${JSON.stringify(options)}`);
        return value;
    }
}
exports.InboundMessageIdentityDeserializer = InboundMessageIdentityDeserializer;
