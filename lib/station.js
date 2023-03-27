"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Station = void 0;
const utils_1 = require("./utils");
class Station {
    constructor(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
        this.internalName = this.name.replace(/\./g, '#').toLowerCase();
    }
    async destroy() {
        var _a, _b;
        try {
            const removeStationReq = {
                station_name: this.name,
                username: this.connection.username
            };
            const stationName = this.name.replace(/\./g, '#').toLowerCase();
            const sub = this.connection.schemaUpdatesSubs.get(stationName);
            (_a = sub === null || sub === void 0 ? void 0 : sub.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(sub);
            this.connection.stationSchemaDataMap.delete(stationName);
            this.connection.schemaUpdatesSubs.delete(stationName);
            this.connection.producersPerStation.delete(stationName);
            this.connection.meassageDescriptors.delete(stationName);
            this.connection.jsonSchemas.delete(stationName);
            const data = this.connection.JSONC.encode(removeStationReq);
            const res = await this.connection.brokerManager.request('$memphis_station_destructions', data);
            const errMsg = res.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
            this.connection._unSetCachedProducerStation(this.internalName);
            this.connection._unSetCachedConsumerStation(this.internalName);
        }
        catch (ex) {
            if ((_b = ex.message) === null || _b === void 0 ? void 0 : _b.includes('not exist')) {
                return;
            }
            throw (0, utils_1.MemphisError)(ex);
        }
    }
}
exports.Station = Station;
