"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemphisServer = void 0;
const microservices_1 = require("@nestjs/microservices");
const memphis_1 = require("../memphis");
class MemphisServer extends microservices_1.Server {
    constructor(options) {
        super();
        this.options = options;
    }
    async listen(callback) {
        try {
            this.connection = await memphis_1.memphis.connect(this.options);
            this.createConsumer();
        }
        catch (err) {
            console.log(err);
            this.close();
        }
        finally {
            callback();
        }
    }
    async close() {
        const connectCtx = this.connection;
        if (connectCtx)
            connectCtx.close();
    }
    async createConsumer() {
        const channels = [...this.messageHandlers.keys()];
        channels.forEach(async (option) => {
            const handler = this.messageHandlers.get(option);
            const consumer = await this.connection.consumer(JSON.parse(option));
            this.bindEventHandlers(consumer, handler);
        });
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
