import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { MemphisConnectionOptions } from './interfaces';
export declare class MemphisServer extends Server implements CustomTransportStrategy {
    private connection;
    private readonly options;
    constructor(options: MemphisConnectionOptions);
    listen(callback: () => void): Promise<void>;
    close(): void;
    private createConsumer;
    private bindEventHandlers;
}
