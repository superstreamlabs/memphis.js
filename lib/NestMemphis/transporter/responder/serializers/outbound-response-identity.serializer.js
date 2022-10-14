"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundResponseIdentitySerializer = void 0;
const common_1 = require("@nestjs/common");
class OutboundResponseIdentitySerializer {
    constructor() {
        this.logger = new common_1.Logger('OutboundResponseIdentitySerializer');
    }
    serialize(value) {
        this.logger.debug(`-->> Serializing outbound response: \n${JSON.stringify(value)}`);
        return value;
    }
}
exports.OutboundResponseIdentitySerializer = OutboundResponseIdentitySerializer;
