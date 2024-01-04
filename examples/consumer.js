const { memphis } = require('memphis-dev');

(async function () {
    let memphisConnection;

    try {
        /* Javascript and typescript project */
        let memphisConnection = await memphis.connect({
            host: "<memphis-host>",
            username: "memphis-username", // (root/application type user)
            accountId: <memphis-accountId/>, //You can find it on the profile page in the Memphis UI. This field should be sent only on the cloud version of Memphis, otherwise it will be ignored
            password: "<memphis-password>"
        });

        let consumer = await memphis.consumer({
            stationName: "<station-name>",
            consumerName: "<consumer-name>"
        })

        let messages = consumer.fetch()

        console.log(messages.length)
        for (let message of messages){
            const messageObject = JSON.parse(message.getData().toString());
            // Do something with the message
            console.log(messageObject["Hello"]);
            message.ack()
        }

        memphisConnection.close()
    } catch (ex) {
        console.log(ex);
        if (memphisConnection) memphisConnection.close();
    }
})();
