import { Inject, Module } from '@nestjs/common';
import { MemphisModule, MemphisService, createConsumer } from 'memphis-dev/nest';
import type { MemphisType } from 'memphis-dev/types';
import memphis from 'memphis-dev';
@Module({
    imports: [MemphisModule.register()]
})
export class ConsumerModule {
    // constructor(private memphis: MemphisService) {}

    @createConsumer({
        stationName: '<station-name>',
        consumerName: '<consumer-name>',
        consumerGroup: ''
    })
    async startConsumer(): Promise<MemphisType> {
        let memphisConnection: MemphisType;
        try {
            memphisConnection = await memphis.connect({
                host: '<memphis-host>',
                username: '<application type username>',
                connectionToken: '<broker-token>'
            });
            return memphisConnection;
        } catch (ex) {
            console.log(ex);
            if (memphisConnection) memphisConnection.close();
        }
    }
}
