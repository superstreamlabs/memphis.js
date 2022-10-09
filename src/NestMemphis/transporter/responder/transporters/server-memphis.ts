import { Server, CustomTransportStrategy, IncomingRequest, ReadPacket, PacketId } from '@nestjs/microservices';
import Memphis, { MemphisType as MemphisClient, ConsumerType, ProducerType } from '../../../../memphis';
import { MemphisOptions } from '../../interfaces/faye-options.interface';

export class ServerMemphis extends Server implements CustomTransportStrategy {
    // Holds our client interface to the Faye broker.
    private memphisClient: MemphisClient;
    private producer: ProducerType;

    constructor(private readonly options: MemphisOptions) {
        super();
        // super class establishes the serializer and deserializer; sets up
        // defaults unless overridden via `options`
        this.initializeSerializer(options);
        this.initializeDeserializer(options);
    }

    /**
     * listen() is required by the `CustomTransportStrategy` interface. It's
     * called by the framework when the transporter is instantiated, and kicks
     * off a lot of the framework machinery.
     */
    public listen(callback: () => void) {
        this.start(callback);
    }

    public async connect() {
        try {
            // Connection Logic
            const { connect, ...options } = this.options;

            this.memphisClient = await Memphis.connect(connect);
        } catch (ex) {
            this.handleError(ex);
        }
    }

    public close() {
        this.memphisClient && this.memphisClient.close();
        this.memphisClient = null;
    }

    // kick things off
    public async start(callback) {
        await this.connect();

        if (!this.memphisClient) {
            callback();
            return;
        }

        await this.createProducer();

        if (!this.producer) {
            return;
        }

        this.bindEvents();
    }

    public bindEvents() {
        const registeredPatterns = [...this.messageHandlers.keys()];
        registeredPatterns.forEach(async (pattern) => {
            const eventHandler = this.messageHandlers.get(pattern);
            await this.handleMessageProduction(eventHandler);
        });
    }

    public async handleMessageProduction(handler: Function): Promise<any> {
        let data = await handler();

        await this.producer.produce({
            message: Buffer.from(data)
        });
        console.log('Message sent');
    }

    public async createProducer(): Promise<any> {
        const { producer, ...options } = this.options;
        try {
            this.producer = await this.memphisClient.producer(producer);
        } catch (ex) {
            this.handleError(ex);
        }
    }

    public handleError(ex: any) {
        console.log(ex);
        if (this.memphisClient) this.close();
    }
}
