import { EventPattern } from '@nestjs/microservices';
import { MemphisConsumerOption } from './interfaces';

export const consumeMessage = (
  consumer: MemphisConsumerOption,
  context: object
) => {
  return EventPattern(consumer, context);
};
