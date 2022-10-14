import { Logger } from '@nestjs/common';
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { ConsumersOptions } from '../../interfaces/memphis-options.interface';
import Memphis, { MemphisClient, ConsumerOptions as Consumer } from '../../../memphis';


export class ClientMemphis extends ClientProxy {
    protected readonly logger = new Logger(ClientProxy.name);

    private memphisClient: MemphisClient;
    private consumer: Consumer;
    private connection: Promise<any>;

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
            // this.connection = await this.connect$(this.memphisClient.brokerConnection, ERROR_EVENT, CONNECT_EVENT).pipe(share()).toPromise();
            return this.memphisClient;
        } catch (ex) {
            console.log(ex);
            this.close();
        }
    }

    /**
     *
     */
    private async createConsumer(pattern: string): Promise<any> {
        const { consumer } = this.options;
        try {
            this.consumer = await this.memphisClient.consumer({ ...consumer, stationName: pattern });
        } catch (ex) {
            console.log(ex);
        }
    }

    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): any { }

    protected async dispatchEvent(packet: ReadPacket<any>): Promise<any> {
        const pattern = this.normalizePattern(packet.pattern);
        await this.createConsumer(pattern);

        const consumer = this.consumer

        return consumer
    }



    public close() {
        this.memphisClient && this.memphisClient.close();
        this.memphisClient = null;
    }
}
