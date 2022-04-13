const memphis = require("memphisos");

(async function () {
    try {
        await memphis.connect({
            host: "<host-name>",
            port: 9000,
            brokerHost: "<broker-host>",
            brokerPort: 7766,
            username: "<username (type application)>",
            connectionToken: "<broker-token>",
            reconnect: true, // optional
            maxReconnect: 10, // optional
            reconnectIntervalMs: 1500, // optional
            timeoutMs: 1500 // optional
        });

        const factory = await memphis.factory({
            name: "<factory-name>",
            description: "" // optional
        });

        const station = await memphis.station({
            name: "<station-name>",
            factoryName: "<factory-name>",
            retentionType: memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS, // optional
            retentionValue: 604800, // optional
            storageType: memphis.storageTypes.FILE, // optional
            replicas: 1, // optional
            dedupEnabled: false, // optional
            dedupWindowMs: 0 // optional
        });

        const producer = await memphis.producer({
            stationName: "<station-name>",
            producerName: "<producer-name>"
        });

        const consumer = await memphis.consumer({
            stationName: "<station-name>",
            consumerName: "<consumer-name>",
            consumerGroup: "<group-name>", // optional
            pullIntervalMs: 1000, // optional
            batchSize: 10, // optional
            batchMaxTimeToWaitMs: 5000 // optional
        });

        consumer.on("message", message => {
            console.log(message);
            message.ack();
        });

        consumer.on("error", error => {
            console.log(error);
        });

        await station.destroy();
        await factory.destroy();
        await producer.destroy();
        await consumer.destroy();
        memphis.close();
    } catch (ex) {
        console.log(ex)
        memphis.close()
    }
}());