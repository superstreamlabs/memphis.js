import memphis from "memphis-dev"


(async function () {
    try {
        await memphis.connect({
            host: "<memphis-host>",
            username: "<application type username>",
            connectionToken: "<broker-token>"
        });

        const consumer = await memphis.consumer({
            stationName: "<station-name>",
            consumerName: "<consumer-name>",
            consumerGroup: ""
        });

        consumer.on("message", message => {
            message.ack();
        });

        consumer.on("error", error => {

        });
    } catch (ex) {
        memphis.close();
    }
}());