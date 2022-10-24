import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { MemphisConnectionOptions } from './memphis.interface';
export declare class MemphisServer extends Server implements CustomTransportStrategy {
    private connection;
    private readonly options;
    constructor(options: MemphisConnectionOptions);
    listen(callback: () => void): Promise<void>;
    close(): Promise<void>;
    private createConsumer;
    private bindEventHandlers;
}
