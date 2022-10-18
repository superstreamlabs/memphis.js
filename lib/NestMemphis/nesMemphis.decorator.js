"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeMessage = void 0;
const memphis_1 = require("../memphis");
const consumeMessage = (connection, consumer) => {
    return function (target, propertyKey, descriptor) {
        let originalDescriptor = descriptor.value;
        descriptor.value = async function () {
            let memphisConnection;
            try {
                let memphisConnection = await memphis_1.default.connect(connection);
                const consumerInstance = await memphisConnection.consumer(consumer);
                originalDescriptor(consumerInstance);
            }
            catch (error) {
                console.log(error);
                if (memphisConnection)
                    memphisConnection.close();
            }
        };
    };
};
exports.consumeMessage = consumeMessage;
