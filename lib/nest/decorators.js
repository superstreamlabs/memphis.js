"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemphisConsume = void 0;
const src_1 = require("..");
const MemphisConsume = (options, context = {}) => {
    return (_, __, descriptor) => src_1.memphis._setConsumeHandler(options, descriptor.value, context);
};
exports.MemphisConsume = MemphisConsume;
