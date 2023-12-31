import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { Memphis, memphis } from "../src/memphis";
import { MemphisEnvironment } from "./test/environment";

describe("MemphisProducer", () => {
    let connection: Memphis;

    beforeAll(async () => {
        connection = await memphis.connect({ ...MemphisEnvironment });
    });

    afterAll(async () => {
        await connection.close();
    });

    test.each([
        [ "producer_test_station_a", "producer_test_producer_a", false ],
    ])("create producer", async (stationName, producerName, generateUniqueSuffix) => {

        const params = {
            stationName: stationName,
            producerName: producerName,
            genUniqueSuffix: generateUniqueSuffix
        }
        const producer = await connection.producer(params);
        await producer.destroy();

        expect(producer).toBeTruthy();
    });

    test.each([
        [ "producer_test_station_b", "producer_test_producer_b", false ],
    ])("produce messages with no error", async (stationName, producerName, generateUniqueSuffix) => {

        let noError = true;
        const params = {
            stationName: stationName,
            producerName: producerName,
            genUniqueSuffix: generateUniqueSuffix
        }
        const headers = memphis.headers()
        headers.add('producer-test-key', 'producer-test-value');

        const producer = await connection.producer(params);
        await producer.produce({
            message: Buffer.from("Message from JS producer test"),
            headers: headers
        });

        await producer.destroy();

        expect(noError).toBeTruthy();
    });

    test.each([
        [ ["producer_test_station_c_1", "producer_test_station_c_2", "producer_test_station_c_3"], "producer_test_producer_c", false ],
    ])("produce messages to multiple stations with no error", async (stations, producerName, generateUniqueSuffix) => {

        let noError = true;
        const params = {
            stationName: stations,
            producerName: producerName,
            genUniqueSuffix: generateUniqueSuffix
        }
        const headers = memphis.headers()
        headers.add('producer-test-key', 'producer-test-value');

        const producer = await connection.producer(params);
        await producer.produce({
            message: Buffer.from("Broadcast message from JS producer test"),
            headers: headers
        });

        await producer.destroy();

        expect(noError).toBeTruthy();
    });


    test.each([
        [ "producer_test_station_d", "producer_test_producer_d", false ],
        [ "producer_test_station_e", "producer_test_producer_e", true]
    ])("recreate destroyed producer, and produce messages with no error", async (stationName, producerName, generateUniqueSuffix) => {

        let noError = true;
        const headers = memphis.headers()
        headers.add('producer-test-key', 'producer-test-value');

        for(const i of Array(5).keys()) {
            const params = {
                stationName: stationName,
                producerName: producerName,
                genUniqueSuffix: generateUniqueSuffix
            }
            const producer = await connection.producer(params);
            await producer.produce({
                message: Buffer.from("Message from JS producer test"),
                headers: headers
            });
            await producer.destroy();
        }

        expect(noError).toBeTruthy();
    });

});