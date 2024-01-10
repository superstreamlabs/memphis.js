import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { Memphis, memphis } from "../src/memphis";
import { MemphisEnvironment } from "./test/environment";

describe("MemphisConsumer", () => {
    let connection: Memphis;

    beforeAll(async () => {
        connection = await memphis.connect({ ...MemphisEnvironment });
    });

    afterAll(async () => {
        await connection.close();
    });

    test.each([
        [ "consumer_test_station_a", "consumer_test_consumer_a", "consumer_test_cg" ],
    ])("create consumer", async (stationName, consumerName, consumerGroup) => {

        const params = {
            stationName: stationName,
            consumerName: consumerName,
            consumerGroup: consumerGroup
        }
        const consumer = await connection.consumer(params);
        await consumer.destroy();

        expect(consumer).toBeTruthy();
    });

    test.each([
        [ "consumer_test_station_b", "consumer_test_consumerb", "consumer_test_groupb", "consumer_test_producer_b"],
    ])("consume messages", async (stationName, consumerName, consumerGroup, producerName) => {

        let messagesAreConsumed = false;
        
        const producerParams = {
            stationName: stationName,
            producerName: producerName
        }

        const producer = await connection.producer(producerParams);
        
        const consumerParams = {
            stationName: stationName,
            consumerName: consumerName,
            consumerGroup: consumerGroup
        }
        const consumer = await connection.consumer(consumerParams);
        consumer.on('message', (message, context) => {
            messagesAreConsumed = true;
            message.ack();
        });

        for(let i = 0; i < 10; i++) {
            const headers = memphis.headers()
            headers.add('consumer-test-key', 'consumer-test-value');
            await producer.produce({
                message: Buffer.from(`Message from JS consumer test {i}`),
                headers: headers
            });
        }

        await producer.destroy();
        await consumer.destroy();

        expect(messagesAreConsumed).toBeTruthy();
    });


    test.each([
        [ "consumer_test_station_c", "consumer_test_consumer_c", "consumer_test_cg", "consumer_test_producer_c"],
    ])("fetch messages", async (stationName, consumerName, consumerGroup, producerName) => {

        const producerParams = {
            stationName: stationName,
            producerName: producerName
        }

        const producer = await connection.producer(producerParams);
        
        for(let i = 0; i < 10; i++) {
            const headers = memphis.headers()
            headers.add('consumer-test-key', 'consumer-test-value');
            await producer.produce({
                message: Buffer.from(`Message from JS consumer test {i}`),
                headers: headers
            });
        }

        const consumerParams = {
            stationName: stationName,
            consumerName: consumerName,
            consumerGroup: consumerGroup
        }
        const consumer = await connection.consumer(consumerParams);
        const fetchedMessages = await consumer.fetch({batchSize: 10});

        await producer.destroy();
        await consumer.destroy();

        expect(fetchedMessages).toBeTruthy();
        expect(fetchedMessages.length).toBeGreaterThanOrEqual(10); 
    });

});