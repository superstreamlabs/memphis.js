import memphis from "memphis-dev"

(async function () {
    try {
        await memphis.connect({
            host: "<memphis-host>",
            username: "<application type username>",
            connectionToken: "<broker-token>"
        });

        const producer = await memphis.producer({
            stationName: "<station-name>",
            producerName: "<producer-name>"
        });

        for (let index = 0; index < 100; index++) {
            await producer.produce({
                message: Buffer.from(`Message #${index}: Hello world`)
            });
        }


        memphis.close();
    } catch (ex) {
        memphis.close();
    }
})();
