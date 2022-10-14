import { Server, CustomTransportStrategy, IncomingRequest, ReadPacket, PacketId } from '@nestjs/microservices';
import Memphis, { MemphisClient, ProducerOptions as Producer } from '../../../../memphis';
import { ProducerOptions } from '../../interfaces/faye-options.interface';

export class ServerMemphis extends Server implements CustomTransportStrategy {
    // Holds our client interface to the Faye broker.
    private memphisClient: MemphisClient;
    private producer: Producer;

    constructor(private readonly options: ProducerOptions) {
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
        this.start();
        callback();
    }

    public close() {
        this.memphisClient && this.memphisClient.close();
        this.memphisClient = null;
    }

    // kick things off
    public async start() {
        this.bindEvents();
    }

    public bindEvents() {
        const registeredPatterns = [...this.messageHandlers.keys()];
        registeredPatterns.forEach(async (pattern) => {
            const eventHandler = this.messageHandlers.get(pattern);
            const { connect, producerName } = this.options;
            try {
                this.memphisClient = await Memphis.connect(connect);

                const producer = await this.memphisClient.producer({
                    stationName: pattern,
                    producerName: producerName
                });

                let data = await eventHandler('');

                await producer.produce({
                    message: Buffer.from(data)
                });
                console.log('Message sent');
                this.close();
            } catch (ex) {
                console.log(ex);
                if (this.memphisClient) this.close();
            }
        });
    }
}
