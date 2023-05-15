import { Memphis } from ".";
import { MemphisError } from "./utils";

export class Station {
    private connection: Memphis;
    public name: string;
    public internalName: string;

    constructor(connection: Memphis, name: string) {
        this.connection = connection;
        this.name = name.toLowerCase();
        this.internalName = this.name.replace(/\./g, '#').toLowerCase();
    }

    /**
     * Destroy the station.
     */
    async destroy(): Promise<void> {
        try {
            const removeStationReq = {
                station_name: this.name,
                username: this.connection.username,
                tenant_name: this.connection.tenantName
            };
            const stationName = this.name.replace(/\./g, '#').toLowerCase();
            const sub = this.connection.schemaUpdatesSubs.get(stationName);
            sub?.unsubscribe?.();
            this.connection.stationSchemaDataMap.delete(stationName);
            this.connection.schemaUpdatesSubs.delete(stationName);
            this.connection.producersPerStation.delete(stationName);
            this.connection.meassageDescriptors.delete(stationName);
            this.connection.jsonSchemas.delete(stationName);
            const data = this.connection.JSONC.encode(removeStationReq);
            const res = await this.connection.brokerManager.request('$memphis_station_destructions', data);
            const errMsg = res.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
            this.connection._unSetCachedProducerStation(this.internalName)
            this.connection._unSetCachedConsumerStation(this.internalName)
        } catch (ex) {
            if (ex.message?.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}