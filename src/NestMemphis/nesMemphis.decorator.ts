import { Memphis } from '../memphis';

export const consumeMessage = ({
    stationName,
    consumerName,
    consumerGroup,
    pullIntervalMs = 1000,
    batchSize = 10,
    batchMaxTimeToWaitMs = 5000,
    maxAckTimeMs = 30000,
    maxMsgDeliveries = 10
}: {
    stationName: string;
    consumerName: string;
    consumerGroup: string;
    pullIntervalMs?: number;
    batchSize?: number;
    batchMaxTimeToWaitMs?: number;
    maxAckTimeMs?: number;
    maxMsgDeliveries?: number;
}) => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let memphisConnection: Memphis | undefined | Error;
        let originalDescriptor = descriptor.value;

        descriptor.value = async function () {
            try {
                memphisConnection = await originalDescriptor();

                if (memphisConnection instanceof Error) throw Error('error occurred while connecting');

                if (!(memphisConnection instanceof Memphis)) throw new Error('Return value Must be a Memphis Object');

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

                consumer.on('error', (error) => {});
            } catch (error) {
                console.log(error);
                if (memphisConnection instanceof Memphis) memphisConnection.close();
            }
        };
    };
};
