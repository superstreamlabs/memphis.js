import { memphis, Memphis } from 'memphis-dev';

(async function () {
    let memphisConnection: Memphis;

    try {
        memphisConnection = await memphis.connect({
            host: '<memphis-host>',
            username: '<application type username>',
            connectionToken: '<broker-token>'
        });

        const producer = await memphisConnection.producer({
            stationName: '<station-name>',
            producerName: '<producer-name>'
        });

            const headers = memphis.headers()
            headers.add('<key>', '<value>');
            await producer.produce({
                message: Buffer.from("Message: Hello world"), // you can also send JS object - {}
                headers: headers
            });

        memphisConnection.close();
    } catch (ex) {
        console.log(ex);
        if (memphisConnection) memphisConnection.close();
    }
})();
