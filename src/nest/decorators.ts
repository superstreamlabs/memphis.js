import { EventPattern } from '@nestjs/microservices';
import { memphis } from 'src';
import { MemphisConsumerOptions } from './interfaces';

export const consumeMessage = (
  consumer: MemphisConsumerOptions,
  context: object
) => {
  return EventPattern(consumer, context);
};

export const MemphisConsume = (
  options: MemphisConsumerOptions,
  context: object = {}
): MethodDecorator => {
  return (_, __, descriptor: PropertyDescriptor) =>
    memphis._setConsumeHandler(options, descriptor.value, context);
};
