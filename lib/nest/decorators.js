"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeMessage = void 0;
const microservices_1 = require("@nestjs/microservices");
const consumeMessage = (consumer) => {
    return (0, microservices_1.EventPattern)(consumer);
};
exports.consumeMessage = consumeMessage;
