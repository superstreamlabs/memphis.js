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

        const headers = new Headers();
        headers.add('<key>', '<value>');
        for (let index = 0; index < 100; index++) {
            await producer.produce({
                message: Buffer.from(`Message #${index}: Hello world`),
                headers: headers
            });
            console.log('Message sent');
        }

        console.log('All messages sent');
        memphisConnection.close();
    } catch (ex) {
        console.log(ex);
        if (memphisConnection) memphisConnection.close();
    }
})();
