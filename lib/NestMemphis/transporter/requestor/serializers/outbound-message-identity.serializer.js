"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundMessageIdentitySerializer = void 0;
const common_1 = require("@nestjs/common");
class OutboundMessageIdentitySerializer {
    constructor() {
        this.logger = new common_1.Logger('OutboundMessageIdentitySerializer');
    }
    serialize(value) {
        this.logger.debug(`-->> Serializing outbound message: \n${JSON.stringify(value)}`);
        return value;
    }
}
exports.OutboundMessageIdentitySerializer = OutboundMessageIdentitySerializer;
