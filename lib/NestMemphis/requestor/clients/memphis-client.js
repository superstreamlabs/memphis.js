"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientMemphis = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const memphis_1 = require("../../../memphis");
class ClientMemphis extends microservices_1.ClientProxy {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new common_1.Logger(microservices_1.ClientProxy.name);
        this.initializeSerializer(options);
        this.initializeDeserializer(options);
    }
    async connect() {
        try {
            if (this.memphisClient) {
                return this.memphisClient;
            }
            const { connect } = this.options;
            this.memphisClient = await memphis_1.default.connect(connect);
            return this.memphisClient;
        }
        catch (ex) {
            console.log(ex);
            this.close();
        }
    }
    async createConsumer(pattern) {
        const { consumer } = this.options;
        try {
            this.consumer = await this.memphisClient.consumer(Object.assign(Object.assign({}, consumer), { stationName: pattern }));
        }
        catch (ex) {
            console.log(ex);
        }
    }
    publish(partialPacket, callback) { }
    async dispatchEvent(packet) {
        const pattern = this.normalizePattern(packet.pattern);
        await this.createConsumer(pattern);
        const consumer = this.consumer;
        return consumer;
    }
    close() {
        this.memphisClient && this.memphisClient.close();
        this.memphisClient = null;
    }
}
exports.ClientMemphis = ClientMemphis;
