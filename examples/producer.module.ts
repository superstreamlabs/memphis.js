import { Module } from "@nestjs/common";
import { Memphis, MemphisModule, MemphisService } from "memphis-dev"

@Module({
    imports: [MemphisModule.register()],
})
export class ProducerModule {
    constructor(private memphis: MemphisService) { }

    startProducer() {
        (async function () {
            let memphisConnection: Memphis;
            
            try {
                memphisConnection = await this.memphis.connect({
                    host: "<memphis-host>",
                    username: "<application type username>",
                    password: 'password',
                    accountId: '<account-id>' // for cloud usage
                });

                const producer = await memphisConnection.producer({
                    stationName: "<station-name>",
                    producerName: "<producer-name>"
                });

                for (let index = 0; index < 100; index++) {
                    await producer.produce({
                        message: Buffer.from(`Message #${index}: Hello world`) // you can also send JS object - {}
                    });
                    console.log("Message sent");
                }

                console.log("All messages sent");
                memphisConnection.close();
            } catch (ex) {
                console.log(ex);
                if (memphisConnection)
                    memphisConnection.close();
            }
        })();
    }
}