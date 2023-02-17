"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemphisConsume = exports.consumeMessage = void 0;
const microservices_1 = require("@nestjs/microservices");
const src_1 = require("..");
const consumeMessage = (consumer, context) => {
    return (0, microservices_1.EventPattern)(consumer, context);
};
exports.consumeMessage = consumeMessage;
const MemphisConsume = (options, context = {}) => {
    return (_, __, descriptor) => src_1.memphis.setConsumeHandler(options, descriptor.value, context);
};
exports.MemphisConsume = MemphisConsume;
