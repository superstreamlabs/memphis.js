const memphis = require("memphis-dev");

(async function () {
    try {
        await memphis.connect({
            host: "<host-name>",
            port: 6666,
            brokerHost: "<broker-host>",
            brokerPort: 7766,
            username: "<username (type application)>",
            connectionToken: "<broker-token>",
            reconnect: true, // defaults to true
            maxReconnect: 10, // defaults to 10
            reconnectIntervalMs: 1500, // defaults to 200
            timeoutMs: 1500 // defaults to 1500
        });

        const factory = await memphis.factory({
            name: "<factory-name>",
            description: "" // defaults to ""
        });

        const station = await memphis.station({
            name: "<station-name>",
            factoryName: "<factory-name>",
            retentionType: memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS, // defaults to MAX_MESSAGE_AGE_SECONDS
            retentionValue: 604800, // defaults to 604800
            storageType: memphis.storageTypes.FILE, // defaults to FILE
            replicas: 1, // defaults to 1
            dedupEnabled: false, // defaults to false
            dedupWindowMs: 0 // defaults to 0
        });

        const producer = await memphis.producer({
            stationName: "<station-name>",
            producerName: "<producer-name>"
        });

        const consumer = await memphis.consumer({
            stationName: "<station-name>",
            consumerName: "<consumer-name>",
            consumerGroup: "<group-name>", // defaults to ""
            pullIntervalMs: 1000, // defaults to 1000
            batchSize: 10, // defaults to 10
            batchMaxTimeToWaitMs: 5000 // defaults to 5000
        });

        consumer.on("message", message => {
            console.log(message.getData().toString());
            message.ack();
        });

        consumer.on("error", error => {
            console.log(error);
        });

        await producer.produce({
            message: Buffer.from("Hello world_1"),
            ackWaitSec: 15 // defaults to 15
        });
    } catch (ex) {
        memphis.close()
    }
}());