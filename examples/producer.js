const memphis = require("memphis-dev");

(async function () {
    try {
        await memphis.connect({
            host: "<control-plane>",
            brokerHost: "<broker>",
            username: "<application type username>",
            connectionToken: "<broker-token>"
        });

        const producer = await memphis.producer({
            stationName: "<station-name>",
            producerName: "<producer-name>"
        });

        const promises = [];
        for (let index = 0; index < 100; index++)
            promises.push(producer.produce({
                message: Buffer.from(`Message #${index}: Hello world`)
            }));

        await Promise.all(promises);
    } catch (ex) {
        console.log(ex);
        memphis.close();
    }
}());