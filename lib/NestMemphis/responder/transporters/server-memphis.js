"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerMemphis = void 0;
const microservices_1 = require("@nestjs/microservices");
const memphis_1 = require("../../../memphis");
class ServerMemphis extends microservices_1.Server {
    constructor(options) {
        super();
        this.options = options;
        this.initializeSerializer(options);
        this.initializeDeserializer(options);
    }
    listen(callback) {
        this.start();
        callback();
    }
    close() {
        this.memphisClient && this.memphisClient.close();
        this.memphisClient = null;
    }
    async start() {
        this.bindEvents();
    }
    bindEvents() {
        const registeredPatterns = [...this.messageHandlers.keys()];
        registeredPatterns.forEach(async (pattern) => {
            const eventHandler = this.messageHandlers.get(pattern);
            const { connect, producerName } = this.options;
            try {
                this.memphisClient = await memphis_1.default.connect(connect);
                const producer = await this.memphisClient.producer({
                    stationName: pattern,
                    producerName: producerName
                });
                let data = await eventHandler('');
                await producer.produce({
                    message: Buffer.from(data)
                });
                console.log('Message sent');
                this.close();
            }
            catch (ex) {
                console.log(ex);
                if (this.memphisClient)
                    this.close();
            }
        });
    }
}
exports.ServerMemphis = ServerMemphis;
