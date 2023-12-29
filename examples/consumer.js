const { memphis } = require('memphis-dev');

(async function () {
    let memphisConnection;

    try {
        /* Javascript and typescript project */
        let memphisConnection = await memphis.connect({
            host: "aws-us-east-1.cloud.memphis.dev",
            username: "test_user", // (root/application type user)
            accountId: process.env.memphis_account_id, //You can find it on the profile page in the Memphis UI. This field should be sent only on the cloud version of Memphis, otherwise it will be ignored
            password: process.env.memphis_pass
        });

        let consumer = await memphis.consumer({
            stationName: "test_station",
            consumerName: "consume"
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
