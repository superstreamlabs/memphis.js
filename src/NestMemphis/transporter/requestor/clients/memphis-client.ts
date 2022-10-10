import { Logger } from '@nestjs/common';
import { ClientProxy, ReadPacket, PacketId, WritePacket } from '@nestjs/microservices';
import { ConsumersOptions } from '../../interfaces/faye-options.interface';
import Memphis, { MemphisType as MemphisClient, ConsumerType } from '../../../../memphis';
import { send } from 'process';

export class ClientMemphis extends ClientProxy {
    protected readonly logger = new Logger(ClientProxy.name);

    private memphisClient: MemphisClient;
    private consumer: ConsumerType;

    constructor(protected readonly options: ConsumersOptions) {
        super();

        this.initializeSerializer(options);
        this.initializeDeserializer(options);
    }

    async connect(): Promise<any> {
        try {
            // Connection Logic

            if (this.memphisClient) {
                return this.memphisClient;
            }
            const { connect } = this.options;

            this.memphisClient = await Memphis.connect(connect);

            return this.memphisClient;
        } catch (ex) {
            console.log(ex);
            this.close();
        }
    }

    /**
     *
     */
    private async createConsumer(): Promise<any> {
        const { consumer } = this.options;
        try {
            this.consumer = await this.memphisClient.consumer(consumer);
        } catch (ex) {
            console.log(ex);
        }
    }

    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): any {}

    protected async dispatchEvent(packet: ReadPacket<any>): Promise<any> {
        if (!this.consumer) {
            this.createConsumer();
            return;
        }

        let data: string;

        this.consumer.on('message', (message) => {
            let innerData = message.getData().toString();
            console.log(innerData);
            data = innerData;

            message.ack();
        });

        this.consumer.on('error', (err: any) => {
            this.logger.error(err), this.close();
        });

        return data;
    }

    public close() {
        this.memphisClient && this.memphisClient.close();
        this.memphisClient = null;
    }
}
