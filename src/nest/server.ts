import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { MemphisConnectionOptions } from './interfaces';
import { memphis, Memphis, Consumer } from '../';

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
            // you never know if the cb doing async job
            await callback();
        }
    }

    public close(): void {
        this.connection?.close?.();
    }

    private async createConsumer(): Promise<void> {
        const channels = [...this.messageHandlers.keys()];

        for (let option of channels) {
            const handler = this.messageHandlers.get(option);
            const consumer = await this.connection.consumer(JSON.parse(option));
            this.bindEventHandlers(consumer, handler);
        }
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
