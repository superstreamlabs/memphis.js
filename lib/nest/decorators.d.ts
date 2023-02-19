import { MemphisConsumerOptions } from './interfaces';
export declare const consumeMessage: (consumer: MemphisConsumerOptions, context: object) => MethodDecorator;
export declare const MemphisConsume: (options: MemphisConsumerOptions, context?: object) => MethodDecorator;
