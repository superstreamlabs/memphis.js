import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { MemphisOptions } from '../../interfaces/faye-options.interface';
export declare class ServerMemphis extends Server implements CustomTransportStrategy {
    private readonly options;
    private memphisClient;
    private producer;
    constructor(options: MemphisOptions);
    listen(callback: () => void): void;
    connect(): Promise<void>;
    close(): void;
    start(callback: any): Promise<void>;
    bindEvents(): void;
    handleMessageProduction(handler: Function): Promise<any>;
    createProducer(): Promise<any>;
    handleError(ex: any): void;
}
