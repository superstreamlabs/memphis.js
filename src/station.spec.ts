import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { Memphis, memphis } from "../src/memphis";
import { MemphisEnvironment } from "./test/environment";

describe("MemphisStation", () => {
    let connection: Memphis;

    beforeAll(async () => {
        connection = await memphis.connect({ ...MemphisEnvironment });
    });

    afterAll(async () => {
        await connection.close();
    });

    test.each([
        [ "station_test_station_a" ],
    ])("create station", async (name) => {

        const station = await connection.station({name});
        await station.destroy();

        expect(station).toBeTruthy();
    });

    test.each([
        [ "station_test_station_b", "station_test_station_b_dls" ],
    ])("create station with dls", async (name, dlsStation) => {

        const station = await connection.station({name, dlsStation });
        await station.destroy();

        expect(station).toBeTruthy();
    });

});