import { memphis, Memphis } from 'memphis-dev';

(async function () {
    let memphisConnection;

    try {    
        /* Javascript and typescript project */
        memphisConnection = await memphis.connect({
            host: "aws-us-east-1.cloud.memphis.dev",
            username: "test_user", // (root/application type user)
            accountId: process.env.memphis_account_id, //You can find it on the profile page in the Memphis UI. This field should be sent only on the cloud version of Memphis, otherwise it will be ignored
            password: process.env.memphis_pass
        });
    
        let producer = await memphis.producer({
            stationName: "test_station",
            producerName: "producer"
        })
    
        for (let i = 0; i < 4; i++){
            await producer.produce({
                message: {
                    "Hello": "World"
                }
            });
        }
    
        memphisConnection.close()
    } catch (ex) {
        console.log(ex);
        if (memphisConnection) memphisConnection.close();
    }
})();
