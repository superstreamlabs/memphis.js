import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { Memphis, memphis } from "../src/memphis";
import { MemphisEnvironment } from "./test/environment";

describe("Memphis", () => {
    let connection: Memphis;

    beforeAll(async () => {
        connection = await memphis.connect({ ...MemphisEnvironment });
    });

    afterAll(async () => {
        await connection.close();
    });

    test("establish connection", () => {
        expect(connection.isConnected()).toBeTruthy();
    });

    test.each([
        ["client_test_station_1", "client_test_producer_1", false],
        ["client_test_station_2", "client_test_producer_2", true]
    ])("produce messages with no error", async (stationName, producerName, generateUniqueSuffix) => {

        let noError = true;
        const param = {
            stationName: stationName,
            producerName: producerName,
            genUniqueSuffix: generateUniqueSuffix,
            message: Buffer.from("message from JS test")
        }

        await connection.produce(param);

        expect(noError).toBeTruthy();
    });


    test.each([
        [["client_test_broadcast_a_1", "client_test_broadcast_a_2", "client_test_broadcast_a_3"], "client_test_producer_a_1", false],
        [["client_test_broadcast_b_1", "client_test_broadcast_b_2", "client_test_broadcast_b_3"], "client_test_producer_b_2", true]
    ])("produce messages to multiple stations with no error", async (stations, producerName, generateUniqueSuffix) => {

        let noError = true;
        const param = {
            stationName: stations,
            producerName: producerName,
            genUniqueSuffix: generateUniqueSuffix,
            message: Buffer.from("broadcast message from JS test")
        }

        await connection.produce(param);

        expect(noError).toBeTruthy();
    });


    test.each([
        ["client_test_person_schema", "json", "src/test/schema/json/person.json"],
    ])("create schema with no error", async (schemaName, schemaType, schemaFilePath) => {

        if (process.env.GITHUB_ACTIONS)
            return;
        
        let noError = true;

        const param = {
            schemaName,
            schemaType,
            schemaFilePath,
            timeoutRetry: 5
        }

        await connection.createSchema(param);

        expect(noError).toBeTruthy();
    });

});