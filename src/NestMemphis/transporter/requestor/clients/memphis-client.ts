import { Logger } from '@nestjs/common';
import { ClientProxy, ReadPacket, PacketId, WritePacket } from '@nestjs/microservices';
import { MemphisOptions } from '../../interfaces/faye-options.interface';
import Memphis, { MemphisType as MemphisClient, ConsumerType } from '../../../../memphis';

export class ClientMemphis extends ClientProxy {
    protected readonly logger = new Logger(ClientProxy.name);

    private memphisClient: MemphisClient;
    private consumer: ConsumerType;

    constructor(protected readonly options?: MemphisOptions) {
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
    async createConsumer(): Promise<any> {
        const { consumer } = this.options;
        try {
            this.consumer = await this.memphisClient.consumer(consumer);
        } catch (ex) {
            this.handleError(ex);
        }
    }

    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): any {}

    protected async dispatchEvent(packet: ReadPacket): Promise<any> {
        try {
            if (!this.consumer) {
                this.createConsumer();
                return;
            }

            let data: string;

            await this.consumer.on('message', (message) => {
                let innerData = message.getData().toString();
                console.log(innerData);
                data = innerData;

                message.ack();
            });

            return data;
        } catch (error) {
            if (!this.consumer) {
                this.logger.error(error);
                return;
            }

            this.handleError(this.consumer);
        }
    }

    public parsePacket(content: any): ReadPacket & PacketId {
        try {
            return JSON.parse(content);
        } catch (e) {
            return content;
        }
    }

    public close() {
        this.memphisClient && this.memphisClient.close();
        this.memphisClient = null;
    }

    public handleError(stream: ConsumerType) {
        stream.on('error', (err: any) => {
            this.logger.error(err), this.close();
        });
    }
}
