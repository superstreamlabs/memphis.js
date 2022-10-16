import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { ProducerOptions } from '../../interfaces/memphis-options.interface';
export declare class ServerMemphis extends Server implements CustomTransportStrategy {
    private readonly options;
    private memphisClient;
    private producer;
    constructor(options: ProducerOptions);
    listen(callback: () => void): void;
    close(): void;
    start(): Promise<void>;
    bindEvents(): void;
}
