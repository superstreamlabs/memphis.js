import { Module } from "@nestjs/common";
import { MemphisModule, MemphisService } from "memphis-dev/nest"

@Module({
    imports: [MemphisModule.register()],
})
export class ProducerModule {
    constructor(private memphis: MemphisService) { }

    startProducer() {
        (async function () {
            try {
                await this.memphis.connect({
                    host: "<memphis-host>",
                    username: "<application type username>",
                    connectionToken: "<broker-token>"
                });

                const producer = await this.memphis.producer({
                    stationName: "<station-name>",
                    producerName: "<producer-name>"
                });

                for (let index = 0; index < 100; index++) {
                    await producer.produce({
                        message: Buffer.from(`Message #${index}: Hello world`)
                    });
                    console.log("Message sent");
                }

                console.log("All messages sent");
                this.memphis.close();
            } catch (ex) {
                console.log(ex);
                this.memphis.close();
            }
        })();
    }
}