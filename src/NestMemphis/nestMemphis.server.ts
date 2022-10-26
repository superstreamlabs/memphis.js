import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { MemphisConnectionOptions } from './memphis.interface';
import memphis, { MemphisType as Memphis, ConsumerType as Consumer } from '../memphis';

export class MemphisServer extends Server implements CustomTransportStrategy {
    private connection: Memphis;

    private readonly options: MemphisConnectionOptions;

    constructor(options: MemphisConnectionOptions) {
        super();
        this.options = options;
    }

    public async listen(callback: () => void): Promise<void> {
        try {
            this.connection = await memphis.connect(this.options);
            this.createConsumer();
        } catch (err) {
            console.log(err);
            this.close();
        } finally {
            callback();
        }
    }

    public async close(): Promise<void> {
        const connectCtx = this.connection;
        if (connectCtx) connectCtx.close();
    }

    private async createConsumer(): Promise<void> {
        const channels = [...this.messageHandlers.keys()];

        channels.forEach(async (option) => {
            const handler = this.messageHandlers.get(option);
            const consumer = await this.connection.consumer(JSON.parse(option));
            this.bindEventHandlers(consumer, handler);
        });
        //await Promise.all(channels.map((channel) => this.subscriber.listenTo(channel)));
    }

    private bindEventHandlers(consumer: Consumer, handler): void {
        consumer.on('message', (message) => {
            handler(message);
        });

        consumer.on('error', (error) => {
            handler(error);
        });
    }
}
