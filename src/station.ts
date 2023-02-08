import { Memphis } from ".";
import { MemphisError } from "./utils";

export class Station {
    private connection: Memphis;
    public name: string;

    constructor(connection: Memphis, name: string) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }

    /**
     * Destroy the station.
     */
    async destroy(): Promise<void> {
        try {
            let removeStationReq = {
                station_name: this.name,
                username: this.connection.username
            };
            const stationName = this.name.replace(/\./g, '#').toLowerCase();
            let sub = this.connection.schemaUpdatesSubs.get(stationName);
            if (sub) sub.unsubscribe();
            this.connection.stationSchemaDataMap.delete(stationName);
            this.connection.schemaUpdatesSubs.delete(stationName);
            this.connection.producersPerStation.delete(stationName);
            this.connection.meassageDescriptors.delete(stationName);
            this.connection.jsonSchemas.delete(stationName);
            let data = this.connection.JSONC.encode(removeStationReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_station_destructions', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
        } catch (ex) {
            if (ex.message?.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}