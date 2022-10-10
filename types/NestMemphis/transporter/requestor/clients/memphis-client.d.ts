import { Logger } from '@nestjs/common';
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { MemphisOptions } from '../../interfaces/faye-options.interface';
import { ConsumerType } from '../../../../memphis';
export declare class ClientMemphis extends ClientProxy {
    protected readonly options?: MemphisOptions;
    protected readonly logger: Logger;
    private memphisClient;
    private consumer;
    constructor(options?: MemphisOptions);
    connect(): Promise<any>;
    createConsumer(): Promise<any>;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): any;
    protected dispatchEvent(packet: ReadPacket): Promise<any>;
    close(): void;
    handleError(stream: ConsumerType): void;
}
