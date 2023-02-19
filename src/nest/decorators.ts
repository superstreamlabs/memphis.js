import { EventPattern } from '@nestjs/microservices';
import { memphis } from 'src';
import { MemphisConsumerOption } from './interfaces';

export const consumeMessage = (
  consumer: MemphisConsumerOption,
  context: object
) => {
  return EventPattern(consumer, context);
};

export const MemphisConsume = (
  options: MemphisConsumerOption,
  context: object = {}
): MethodDecorator => {
  return (_, __, descriptor: PropertyDescriptor) =>
    memphis._setConsumeHandler(options, descriptor.value, context);
};
