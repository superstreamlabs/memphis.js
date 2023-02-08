"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeMessage = void 0;
const microservices_1 = require("@nestjs/microservices");
const consumeMessage = (consumer, context) => {
    return (0, microservices_1.EventPattern)(consumer, context);
};
exports.consumeMessage = consumeMessage;
