import { memphis, Memphis } from 'memphis-dev';

(async function () {
    let memphisConnection: Memphis | null = null;

    try {
        memphisConnection = await memphis.connect({
            host: '<memphis-host>',
            username: '<application type username>',
            password: 'password',
            accountId: '<account-id>' // for cloud usage
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
