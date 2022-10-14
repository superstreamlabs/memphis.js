"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeMessage = void 0;
const memphis_1 = require("../memphis");
const consumeMessage = ({ stationName, consumerName, consumerGroup, pullIntervalMs = 1000, batchSize = 10, batchMaxTimeToWaitMs = 5000, maxAckTimeMs = 30000, maxMsgDeliveries = 10 }) => {
    return function (target, propertyKey, descriptor) {
        let memphisConnection;
        let originalDescriptor = descriptor.value;
        descriptor.value = async function () {
            try {
                memphisConnection = await originalDescriptor();
                if (memphisConnection instanceof Error)
                    throw Error('error occurred while connecting');
                if (!(memphisConnection instanceof memphis_1.Memphis))
                    throw new Error('Return value Must be a Memphis Object');
                const consumer = await memphisConnection.consumer({
                    stationName,
                    consumerName,
                    consumerGroup,
                    pullIntervalMs,
                    batchSize,
                    batchMaxTimeToWaitMs,
                    maxAckTimeMs,
                    maxMsgDeliveries
                });
                consumer.on('message', (message) => {
                    console.log(message.getData().toString());
                    message.ack();
                });
                consumer.on('error', (error) => { });
            }
            catch (error) {
                console.log(error);
                if (memphisConnection instanceof memphis_1.Memphis)
                    memphisConnection.close();
            }
        };
    };
};
exports.consumeMessage = consumeMessage;
