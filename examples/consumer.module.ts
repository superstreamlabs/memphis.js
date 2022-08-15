import { Module } from "@nestjs/common";
import { MemphisModule, MemphisService } from "memphis-dev/nest"

@Module({
    imports: [MemphisModule.register()],
})

export class ConsumerModule {
    constructor(private memphis: MemphisService) {
    }

    startConsumer() {
        (async function () {
            try {
                await this.memphis.connect({
                    host: "<memphis-host>",
                    username: "<application type username>",
                    connectionToken: "<broker-token>",
                });

                const consumer = await this.memphis.consumer({
                    stationName: "<station-name>",
                    consumerName: "<consumer-name>",
                    consumerGroup: "",
                });

                consumer.on("message", (message) => {
                    console.log(message.getData().toString());
                    message.ack();
                });

                consumer.on("error", (error) => { });
            } catch (ex) {
                console.log(ex);
                this.memphis.close();
            }
        })();
    }
}