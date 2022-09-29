import { Module } from '@nestjs/common';
import { MemphisModule, MemphisService } from 'memphis-dev/nest';
import type { MemphisType } from 'memphis-dev/types';

@Module({
    imports: [MemphisModule.register()]
})
export class ConsumerModule {
    constructor(private memphis: MemphisService) {}

    startConsumer() {
        (async function () {
            let memphisConnection: MemphisType;
            try {
                memphisConnection = await this.memphis.connect({
                    host: '<memphis-host>',
                    username: '<application type username>',
                    connectionToken: '<broker-token>'
                });

                const consumer = await memphisConnection.consumer({
                    stationName: '<station-name>',
                    consumerName: '<consumer-name>',
                    consumerGroup: ''
                });

                consumer.on('message', (message) => {
                    console.log(message.getData().toString());
                    message.ack();
                });

                consumer.on('error', (error) => {});
            } catch (ex) {
                console.log(ex);
                if (memphisConnection) memphisConnection.close();
            }
        })();
    }
}
