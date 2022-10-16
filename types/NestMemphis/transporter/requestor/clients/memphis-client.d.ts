import { Logger } from '@nestjs/common';
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { ConsumersOptions } from '../../interfaces/memphis-options.interface';
export declare class ClientMemphis extends ClientProxy {
    protected readonly options: ConsumersOptions;
    protected readonly logger: Logger;
    private memphisClient;
    private consumer;
    private connection;
    constructor(options: ConsumersOptions);
    connect(): Promise<any>;
    private createConsumer;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): any;
    protected dispatchEvent(packet: ReadPacket<any>): Promise<any>;
    close(): void;
}
