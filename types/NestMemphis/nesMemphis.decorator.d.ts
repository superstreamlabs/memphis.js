import { connectOption, consumerOption } from './interface';
export declare const consumeMessage: (connection: connectOption, consumer: consumerOption) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
