"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FayeContext = void 0;
const base_rpc_context_1 = require("@nestjs/microservices/ctx-host/base-rpc.context");
class FayeContext extends base_rpc_context_1.BaseRpcContext {
    constructor(args) {
        super(args);
    }
    getChannel() {
        return this.args[0];
    }
}
exports.FayeContext = FayeContext;
