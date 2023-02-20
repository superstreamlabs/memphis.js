import { EventPattern } from '@nestjs/microservices';
import { memphis } from 'src';
import { MemphisConsumerOptions } from './interfaces';

export const MemphisConsume = (
  options: MemphisConsumerOptions,
  context: object = {}
): MethodDecorator => {
  return (_, __, descriptor: PropertyDescriptor) =>
    memphis._setConsumeHandler(options, descriptor.value, context);
};
