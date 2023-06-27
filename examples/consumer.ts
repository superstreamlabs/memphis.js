import { memphis, Memphis, Message } from 'memphis-dev';

(async function () {
    let memphisConnection: Memphis | null = null;

    try {
        memphisConnection = await memphis.connect({
            host: '<memphis-host>',
            username: '<application type username>',
            connectionToken: '<broker-token>'
        });

        const consumer = await memphisConnection.consumer({
            stationName: '<station-name>',
            consumerName: '<consumer-name>',
            consumerGroup: ''
        });

        consumer.setContext({ key: "value" });
        consumer.on('message', (message: Message, context: object) => {
            console.log(message.getData().toString());
            message.ack();
            const headers = message.getHeaders()
        });

        consumer.on('error', (error) => {
            console.log(error);
        });
    } catch (ex) {
        console.log(ex);
        if (memphisConnection) memphisConnection.close();
    }
})();
