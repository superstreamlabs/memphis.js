import { MemphisConsumerOption } from './interfaces';
export declare const consumeMessage: (consumer: MemphisConsumerOption, context: object) => MethodDecorator;
export declare const MemphisConsume: (options: MemphisConsumerOption, context?: object) => MethodDecorator;
