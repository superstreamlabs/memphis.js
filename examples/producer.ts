import memphis from 'memphis-dev';
import type { Memphis } from 'memphis-dev/types';

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
                message: Buffer.from("Message: Hello world"),
                headers: headers
            });

        memphisConnection.close();
    } catch (ex) {
        console.log(ex);
        if (memphisConnection) memphisConnection.close();
    }
})();
