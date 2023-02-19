"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memphis = exports.MemphisService = void 0;
const common_1 = require("@nestjs/common");
const ajv_1 = require("ajv");
const ajv_draft_04_1 = require("ajv-draft-04");
const _2020_1 = require("ajv/dist/2020");
const json_schema_draft_06_json_1 = require("ajv/dist/refs/json-schema-draft-06.json");
const json_schema_draft_07_json_1 = require("ajv/dist/refs/json-schema-draft-07.json");
const fs = require("fs");
const graphql_1 = require("graphql");
const broker = require("nats");
const protobuf = require("protobufjs");
const _1 = require(".");
const utils_1 = require("./utils");
const retentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: 'message_age_sec',
    MESSAGES: 'messages',
    BYTES: 'bytes'
};
const storageTypes = {
    DISK: 'file',
    MEMORY: 'memory'
};
class Memphis {
    constructor() {
        this.isConnectionActive = false;
        this.host = '';
        this.port = 6666;
        this.username = '';
        this.connectionToken = '';
        this.reconnect = true;
        this.maxReconnect = 3;
        this.reconnectIntervalMs = 200;
        this.timeoutMs = 15000;
        this.brokerConnection = null;
        this.brokerManager = null;
        this.brokerStats = null;
        this.retentionTypes = retentionTypes;
        this.storageTypes = storageTypes;
        this.JSONC = broker.JSONCodec();
        this.connectionId = this._generateConnectionID();
        this.stationSchemaDataMap = new Map();
        this.schemaUpdatesSubs = new Map();
        this.producersPerStation = new Map();
        this.meassageDescriptors = new Map();
        this.jsonSchemas = new Map();
        this.graphqlSchemas = new Map();
        this.clusterConfigurations = new Map();
        this.stationSchemaverseToDlsMap = new Map();
        this.producersMap = new Map();
        this.consumersMap = new Map();
    }
    connect({ host, port = 6666, username, connectionToken, reconnect = true, maxReconnect = 3, reconnectIntervalMs = 5000, timeoutMs = 15000, keyFile = '', certFile = '', caFile = '' }) {
        return new Promise(async (resolve, reject) => {
            this.host = this._normalizeHost(host);
            this.port = port;
            this.username = username;
            this.connectionToken = connectionToken;
            this.reconnect = reconnect;
            this.maxReconnect = maxReconnect > 9 ? 9 : maxReconnect;
            this.reconnectIntervalMs = reconnectIntervalMs;
            this.timeoutMs = timeoutMs;
            let conId_username = this.connectionId + '::' + username;
            try {
                let connectionOpts = {
                    servers: `${this.host}:${this.port}`,
                    reconnect: this.reconnect,
                    maxReconnectAttempts: this.reconnect ? this.maxReconnect : 0,
                    reconnectTimeWait: this.reconnectIntervalMs,
                    timeout: this.timeoutMs,
                    token: this.connectionToken,
                    name: conId_username
                };
                if (keyFile !== '' || certFile !== '' || caFile !== '') {
                    if (keyFile === '') {
                        return reject((0, utils_1.MemphisError)(new Error('Must provide a TLS key file')));
                    }
                    if (certFile === '') {
                        return reject((0, utils_1.MemphisError)(new Error('Must provide a TLS cert file')));
                    }
                    if (caFile === '') {
                        return reject((0, utils_1.MemphisError)(new Error('Must provide a TLS ca file')));
                    }
                    let tlsOptions = {
                        keyFile: keyFile,
                        certFile: certFile,
                        caFile: caFile
                    };
                    connectionOpts['tls'] = tlsOptions;
                }
                this.brokerManager = await broker.connect(connectionOpts);
                this.brokerConnection = this.brokerManager.jetstream();
                this.brokerStats = await this.brokerManager.jetstreamManager();
                this.isConnectionActive = true;
                this._configurationsListener();
                (async () => {
                    var e_1, _a;
                    try {
                        for (var _b = __asyncValues(this.brokerManager.status()), _c; _c = await _b.next(), !_c.done;) {
                            const s = _c.value;
                            switch (s.type) {
                                case 'update':
                                    console.log(`reconnected to memphis successfully`);
                                    this.isConnectionActive = true;
                                    break;
                                case 'reconnecting':
                                    console.log(`trying to reconnect to memphis - ${s.data}`);
                                    break;
                                case 'disconnect':
                                    console.log(`disconnected from memphis - ${s.data}`);
                                    this.isConnectionActive = false;
                                    break;
                                default:
                                    this.isConnectionActive = true;
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                })().then();
                return resolve(this);
            }
            catch (ex) {
                return reject((0, utils_1.MemphisError)(ex));
            }
        });
    }
    async _compileProtobufSchema(stationName) {
        const stationSchemaData = this.stationSchemaDataMap.get(stationName);
        const protoPathName = `${__dirname}/${stationSchemaData['schema_name']}_${stationSchemaData['active_version']['version_number']}.proto`;
        fs.writeFileSync(protoPathName, stationSchemaData['active_version']['schema_content']);
        const root = await protobuf.load(protoPathName);
        fs.unlinkSync(protoPathName);
        const meassageDescriptor = root.lookupType(`${stationSchemaData['active_version']['message_struct_name']}`);
        this.meassageDescriptors.set(stationName, meassageDescriptor);
    }
    async _scemaUpdatesListener(stationName, schemaUpdateData) {
        try {
            const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
            let schemaUpdateSubscription = this.schemaUpdatesSubs.has(internalStationName);
            if (schemaUpdateSubscription) {
                this.producersPerStation.set(internalStationName, this.producersPerStation.get(internalStationName) + 1);
                return;
            }
            if (schemaUpdateData['schema_name'] !== '') {
                this.stationSchemaDataMap.set(internalStationName, schemaUpdateData);
                switch (schemaUpdateData['type']) {
                    case 'protobuf':
                        await this._compileProtobufSchema(internalStationName);
                        break;
                    case 'json':
                        const jsonSchema = this._compileJsonSchema(internalStationName);
                        this.jsonSchemas.set(internalStationName, jsonSchema);
                        break;
                    case 'graphql':
                        const graphQlSchema = this._compileGraphQl(internalStationName);
                        this.graphqlSchemas.set(internalStationName, graphQlSchema);
                        break;
                }
            }
            const sub = this.brokerManager.subscribe(`$memphis_schema_updates_${internalStationName}`);
            this.producersPerStation.set(internalStationName, 1);
            this.schemaUpdatesSubs.set(internalStationName, sub);
            this._listenForSchemaUpdates(sub, internalStationName);
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    _compileJsonSchema(stationName) {
        const ajv = new ajv_1.default();
        let stationSchemaData = this.stationSchemaDataMap.get(stationName);
        const schema = stationSchemaData['active_version']['schema_content'];
        const schemaObj = JSON.parse(schema);
        let validate;
        try {
            validate = ajv.compile(schemaObj);
            return validate;
        }
        catch (ex) {
            try {
                ajv.addMetaSchema(json_schema_draft_07_json_1.default);
                validate = ajv.compile(schemaObj);
                return validate;
            }
            catch (ex) {
                try {
                    const ajv = new ajv_draft_04_1.default();
                    validate = ajv.compile(schemaObj);
                    return validate;
                }
                catch (ex) {
                    try {
                        const ajv = new _2020_1.default();
                        validate = ajv.compile(schemaObj);
                        return validate;
                    }
                    catch (ex) {
                        try {
                            ajv.addMetaSchema(json_schema_draft_06_json_1.default);
                            return validate;
                        }
                        catch (ex) {
                            throw (0, utils_1.MemphisError)(new Error('invalid json schema'));
                        }
                    }
                }
            }
        }
    }
    _compileGraphQl(stationName) {
        const stationSchemaData = this.stationSchemaDataMap.get(stationName);
        const schemaContent = stationSchemaData['active_version']['schema_content'];
        const graphQlSchema = (0, graphql_1.buildSchema)(schemaContent);
        return graphQlSchema;
    }
    async _listenForSchemaUpdates(sub, stationName) {
        var e_2, _a;
        try {
            for (var sub_1 = __asyncValues(sub), sub_1_1; sub_1_1 = await sub_1.next(), !sub_1_1.done;) {
                const m = sub_1_1.value;
                const data = this.JSONC.decode(m._rdata);
                if (data['init']['schema_name'] === '') {
                    this.stationSchemaDataMap.delete(stationName);
                    this.meassageDescriptors.delete(stationName);
                    this.jsonSchemas.delete(stationName);
                    return;
                }
                this.stationSchemaDataMap.set(stationName, data.init);
                try {
                    switch (data['init']['type']) {
                        case 'protobuf':
                            await this._compileProtobufSchema(stationName);
                            break;
                        case 'json':
                            const jsonSchema = this._compileJsonSchema(stationName);
                            this.jsonSchemas.set(stationName, jsonSchema);
                            break;
                        case 'graphql':
                            const graphQlSchema = this._compileGraphQl(stationName);
                            this.graphqlSchemas.set(stationName, graphQlSchema);
                            break;
                    }
                }
                catch (ex) {
                    throw (0, utils_1.MemphisError)(ex);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (sub_1_1 && !sub_1_1.done && (_a = sub_1.return)) await _a.call(sub_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    async _configurationsListener() {
        var e_3, _a;
        try {
            const sub = this.brokerManager.subscribe(`$memphis_sdk_configurations_updates`);
            try {
                for (var sub_2 = __asyncValues(sub), sub_2_1; sub_2_1 = await sub_2.next(), !sub_2_1.done;) {
                    const m = sub_2_1.value;
                    let data = this.JSONC.decode(m._rdata);
                    switch (data['type']) {
                        case 'send_notification':
                            this.clusterConfigurations.set(data['type'], data['update']);
                            break;
                        case 'schemaverse_to_dls':
                            this.stationSchemaverseToDlsMap.set(data['station_name'], data['update']);
                        default:
                            break;
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (sub_2_1 && !sub_2_1.done && (_a = sub_2.return)) await _a.call(sub_2);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    sendNotification(title, msg, failedMsg, type) {
        const buf = this.JSONC.encode({
            title: title,
            msg: msg,
            type: type,
            code: failedMsg
        });
        this.brokerManager.publish('$memphis_notifications', buf);
    }
    _normalizeHost(host) {
        if (host.startsWith('http://'))
            return host.split('http://')[1];
        else if (host.startsWith('https://'))
            return host.split('https://')[1];
        else
            return host;
    }
    _generateConnectionID() {
        return [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    }
    async station({ name, retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS, retentionValue = 604800, storageType = storageTypes.DISK, replicas = 1, idempotencyWindowMs = 120000, schemaName = '', sendPoisonMsgToDls = true, sendSchemaFailedMsgToDls = true, tieredStorageEnabled = false }) {
        var _a;
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            const createStationReq = {
                name: name,
                retention_type: retentionType,
                retention_value: retentionValue,
                storage_type: storageType,
                replicas: replicas,
                idempotency_window_in_ms: idempotencyWindowMs,
                schema_name: schemaName,
                dls_configuration: {
                    poison: sendPoisonMsgToDls,
                    Schemaverse: sendSchemaFailedMsgToDls
                },
                username: this.username,
                tiered_storage_enabled: tieredStorageEnabled
            };
            const data = this.JSONC.encode(createStationReq);
            const res = await this.brokerManager.request('$memphis_station_creations', data);
            const errMsg = res.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
            return new _1.Station(this, name);
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('already exists')) {
                return new _1.Station(this, name.toLowerCase());
            }
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async attachSchema({ name, stationName }) {
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            if (name === '' || stationName === '') {
                throw new Error('name and station name can not be empty');
            }
            const attachSchemaReq = {
                name: name,
                station_name: stationName,
                username: this.username
            };
            const data = this.JSONC.encode(attachSchemaReq);
            const res = await this.brokerManager.request('$memphis_schema_attachments', data);
            const errMsg = res.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async detachSchema({ stationName }) {
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            if (stationName === '') {
                throw new Error('station name is missing');
            }
            let detachSchemaReq = {
                station_name: stationName,
                username: this.username
            };
            let data = this.JSONC.encode(detachSchemaReq);
            let errMsg = await this.brokerManager.request('$memphis_schema_detachments', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async producer({ stationName, producerName, genUniqueSuffix = false }) {
        try {
            if (!this.isConnectionActive)
                throw (0, utils_1.MemphisError)(new Error('Connection is dead'));
            const realName = producerName.toLowerCase();
            producerName = genUniqueSuffix ? (0, utils_1.generateNameSuffix)(`${producerName}_`) : producerName;
            const createProducerReq = {
                name: producerName,
                station_name: stationName,
                connection_id: this.connectionId,
                producer_type: 'application',
                req_version: 1,
                username: this.username
            };
            const data = this.JSONC.encode(createProducerReq);
            let createRes = await this.brokerManager.request('$memphis_producer_creations', data);
            createRes = this.JSONC.decode(createRes.data);
            if (createRes.error != '') {
                throw (0, utils_1.MemphisError)(new Error(createRes.error));
            }
            const internal_station = stationName.replace(/\./g, '#').toLowerCase();
            this.stationSchemaverseToDlsMap.set(internal_station, createRes.schemaverse_to_dls);
            this.clusterConfigurations.set('send_notification', createRes.send_notification);
            await this._scemaUpdatesListener(stationName, createRes.schema_update);
            const producer = new _1.Producer(this, producerName, stationName);
            this.setCachedProducer(producer);
            return producer;
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async consumer({ stationName, consumerName, consumerGroup = '', pullIntervalMs = 1000, batchSize = 10, batchMaxTimeToWaitMs = 5000, maxAckTimeMs = 30000, maxMsgDeliveries = 10, genUniqueSuffix = false, startConsumeFromSequence = 1, lastMessages = -1 }) {
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            consumerName = genUniqueSuffix ? (0, utils_1.generateNameSuffix)(`${consumerName}_`) : consumerName;
            consumerGroup = consumerGroup || consumerName;
            if (startConsumeFromSequence <= 0) {
                throw (0, utils_1.MemphisError)(new Error('startConsumeFromSequence has to be a positive number'));
            }
            if (lastMessages < -1) {
                throw (0, utils_1.MemphisError)(new Error('min value for LastMessages is -1'));
            }
            if (startConsumeFromSequence > 1 && lastMessages > -1) {
                throw (0, utils_1.MemphisError)(new Error("Consumer creation options can't contain both startConsumeFromSequence and lastMessages"));
            }
            const createConsumerReq = {
                name: consumerName,
                station_name: stationName,
                connection_id: this.connectionId,
                consumer_type: 'application',
                consumers_group: consumerGroup,
                max_ack_time_ms: maxAckTimeMs,
                max_msg_deliveries: maxMsgDeliveries,
                start_consume_from_sequence: startConsumeFromSequence,
                last_messages: lastMessages,
                req_version: 1,
                username: this.username
            };
            const data = this.JSONC.encode(createConsumerReq);
            const res = await this.brokerManager.request('$memphis_consumer_creations', data);
            const errMsg = res.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
            const consumer = new _1.Consumer(this, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries, startConsumeFromSequence, lastMessages);
            this.setCachedConsumer(consumer);
            return consumer;
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    headers() {
        return new _1.MsgHeaders();
    }
    async produce({ stationName, producerName, genUniqueSuffix = false, message, ackWaitSec, asyncProduce, headers, msgId }) {
        let producer;
        if (!this.isConnectionActive)
            throw (0, utils_1.MemphisError)(new Error('Cant produce a message without being connected!'));
        const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
        const producerMapKey = `${internalStationName}_${producerName.toLowerCase()}`;
        producer = this.getCachedProducer(producerMapKey);
        if (producer)
            return await producer.produce({ message, ackWaitSec, asyncProduce, headers, msgId });
        producer = await this.producer({ stationName, producerName, genUniqueSuffix });
        return await producer.produce({ message, ackWaitSec, asyncProduce, headers, msgId });
    }
    async fetchMessages({ stationName, consumerName, consumerGroup = '', genUniqueSuffix = false, batchSize = 10, maxAckTimeMs = 30000, maxMsgDeliveries = 10, startConsumeFromSequence = 1, lastMessages = -1 }) {
        let consumer;
        if (!this.isConnectionActive)
            throw (0, utils_1.MemphisError)(new Error('Cant fetch messages without being connected!'));
        const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
        const consumerMapKey = `${internalStationName}_${consumerName.toLowerCase()}`;
        consumer = this.getCachedConsumer(consumerMapKey);
        if (consumer)
            return await consumer.fetch();
        consumer = await this.consumer({
            stationName,
            consumerName,
            genUniqueSuffix,
            consumerGroup,
            batchSize,
            maxAckTimeMs,
            maxMsgDeliveries,
            startConsumeFromSequence,
            lastMessages
        });
        return await consumer.fetch();
    }
    getCachedProducer(key) {
        if (key === '' || key === null)
            return null;
        return this.producersMap.get(key);
    }
    setCachedProducer(producer) {
        if (!this.getCachedProducer(producer._getProducerKey()))
            this.producersMap.set(producer._getProducerKey(), producer);
    }
    _unSetCachedProducer(producer) {
        if (!this.getCachedProducer(producer._getProducerKey()))
            this.producersMap.delete(producer._getProducerKey());
    }
    _unSetCachedProducerStation(stationName) {
        this.producersMap.forEach((producer, key) => {
            if (producer._getProducerStation() === stationName) {
                this.producersMap.delete(key);
            }
        });
    }
    getCachedConsumer(key) {
        if (key === '' || key === null)
            return null;
        return this.consumersMap.get(key);
    }
    setCachedConsumer(consumer) {
        if (!this.getCachedConsumer(consumer._getConsumerKey()))
            this.consumersMap.set(consumer._getConsumerKey(), consumer);
    }
    _unSetCachedConsumer(consumer) {
        if (!this.getCachedConsumer(consumer._getConsumerKey()))
            this.consumersMap.delete(consumer._getConsumerKey());
    }
    _unSetCachedConsumerStation(stationName) {
        this.consumersMap.forEach((consumer, key) => {
            if (consumer._getConsumerStation() === stationName) {
                this.consumersMap.delete(key);
            }
        });
    }
    close() {
        var _a;
        for (let key of this.schemaUpdatesSubs.keys()) {
            const sub = this.schemaUpdatesSubs.get(key);
            (_a = sub === null || sub === void 0 ? void 0 : sub.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(sub);
            this.stationSchemaDataMap.delete(key);
            this.schemaUpdatesSubs.delete(key);
            this.producersPerStation.delete(key);
            this.meassageDescriptors.delete(key);
            this.jsonSchemas.delete(key);
        }
        setTimeout(() => {
            var _a, _b;
            (_b = (_a = this.brokerManager) === null || _a === void 0 ? void 0 : _a.close) === null || _b === void 0 ? void 0 : _b.call(_a);
            this.brokerManager = null;
        }, 500);
        this.producersMap = new Map();
        this.consumersMap = new Map();
    }
    isConnected() {
        return !this.brokerManager.isClosed();
    }
}
let MemphisService = class MemphisService extends Memphis {
};
MemphisService = __decorate([
    (0, common_1.Injectable)({})
], MemphisService);
exports.MemphisService = MemphisService;
exports.memphis = new Memphis();
