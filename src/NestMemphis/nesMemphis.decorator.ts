import { EventPattern } from '@nestjs/microservices';
import { MemphisConsumerOption } from './memphis.interface';

export const consumeMessage = (consumer: MemphisConsumerOption) => {
    return EventPattern(consumer);
};
