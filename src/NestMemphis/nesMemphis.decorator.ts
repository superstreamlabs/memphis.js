import memphis, { MemphisType } from '../memphis';
import { connectOption, consumerOption } from './interface';

export const consumeMessage = (connection: connectOption, consumer: consumerOption) => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let originalDescriptor = descriptor.value;

        descriptor.value = async function () {
            let memphisConnection: MemphisType;
            try {
                let memphisConnection = await memphis.connect(connection);
                const consumerInstance = await memphisConnection.consumer(consumer);
                originalDescriptor(consumerInstance);
            } catch (error) {
                console.log(error);
                if (memphisConnection) memphisConnection.close();
            }
        };
    };
};
