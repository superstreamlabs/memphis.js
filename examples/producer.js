const memphis = require("memphis-dev");

(async function () {
    let memphisConnection

    try {
        memphisConnection = await memphis.connect({
            host: "localhost",
            username: "root",
            connectionToken: "memphis"
        });

        const producer = await memphisConnection.producer({
            stationName: "someStations",
            producerName: "markBook"
        });

        for (let index = 0; index < 100; index++) {
            await producer.produce({
                message: Buffer.from(`Message #${index}: Hello world`)
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