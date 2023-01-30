import { EventPattern } from '@nestjs/microservices';
import { MemphisConsumerOption } from './interfaces';

export const consumeMessage = (consumer: MemphisConsumerOption) => {
    return EventPattern(consumer);
};
