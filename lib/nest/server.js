"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemphisServer = void 0;
const microservices_1 = require("@nestjs/microservices");
const __1 = require("../");
class MemphisServer extends microservices_1.Server {
    constructor(options) {
        super();
        this.options = options;
    }
    async listen(callback) {
        try {
            this.connection = await __1.memphis.connect(this.options);
            this.createConsumer();
        }
        catch (err) {
            console.log(err);
            this.close();
        }
        finally {
            await callback();
        }
    }
    close() {
        var _a, _b;
        (_b = (_a = this.connection) === null || _a === void 0 ? void 0 : _a.close) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    async createConsumer() {
        const channels = [...this.messageHandlers.keys()];
        for (let option of channels) {
            const handler = this.messageHandlers.get(option);
            const consumer = await this.connection.consumer(JSON.parse(option));
            this.bindEventHandlers(consumer, handler);
        }
    }
    bindEventHandlers(consumer, handler) {
        consumer.on('message', (message) => {
            handler(message);
        });
        consumer.on('error', (error) => {
            handler(error);
        });
    }
}
exports.MemphisServer = MemphisServer;
