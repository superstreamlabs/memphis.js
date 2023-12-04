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
exports.memphis = exports.MemphisService = exports.RoundRobinProducerConsumerGenerator = void 0;
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
const uuid_1 = require("uuid");
const consumer_1 = require("./consumer");
const message_header_1 = require("./message-header");
const producer_1 = require("./producer");
const station_1 = require("./station");
const utils_1 = require("./utils");
const avro = require('avro-js');
const murmurhash = require('murmurhash');
const appId = (0, uuid_1.v4)();
const retentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: 'message_age_sec',
    MESSAGES: 'messages',
    BYTES: 'bytes',
    ACK_BASED: 'ack_based'
};
const storageTypes = {
    DISK: 'file',
    MEMORY: 'memory'
};
const maxBatchSize = 5000;
class Memphis {
    constructor() {
        this.isConnectionActive = false;
        this.host = '';
        this.port = 6666;
        this.username = '';
        this.accountId = 1;
        this.connectionToken = '';
        this.reconnect = true;
        this.maxReconnect = 10;
        this.reconnectIntervalMs = 1500;
        this.timeoutMs = 15000;
        this.brokerConnection = null;
        this.brokerManager = null;
        this.brokerStats = null;
        this.retentionTypes = retentionTypes;
        this.storageTypes = storageTypes;
        this.JSONC = broker.JSONCodec();
        this.stationSchemaDataMap = new Map();
        this.schemaUpdatesSubs = new Map();
        this.clientsPerStation = new Map();
        this.stationFunctionsMap = new Map();
        this.functionsUpdateSubs = new Map();
        this.functionsClientsMap = new Map();
        this.meassageDescriptors = new Map();
        this.jsonSchemas = new Map();
        this.avroSchemas = new Map();
        this.graphqlSchemas = new Map();
        this.clusterConfigurations = new Map();
        this.stationSchemaverseToDlsMap = new Map();
        this.consumeHandlers = [];
        this.suppressLogs = false;
        this.stationPartitions = new Map();
        this.seed = 31;
    }
    connect({ host, port = 6666, username, accountId = 1, connectionToken = '', password = '', reconnect = true, maxReconnect = 10, reconnectIntervalMs = 1500, timeoutMs = 2000, keyFile = '', certFile = '', caFile = '', suppressLogs = false }) {
        return new Promise(async (resolve, reject) => {
            this.host = this._normalizeHost(host);
            this.port = port;
            this.username = username;
            this.accountId = accountId;
            this.connectionToken = connectionToken;
            this.password = password;
            this.reconnect = reconnect;
            this.maxReconnect = maxReconnect > 9 ? 9 : maxReconnect;
            this.reconnectIntervalMs = reconnectIntervalMs;
            this.timeoutMs = timeoutMs;
            this.suppressLogs = suppressLogs;
            this.connectionId = (0, uuid_1.v4)().toString();
            this.producersMap = new Map();
            this.consumersMap = new Map();
            let conId_username = this.connectionId + '::' + username;
            let connectionOpts;
            try {
                connectionOpts = {
                    servers: `${this.host}:${this.port}`,
                    reconnect: this.reconnect,
                    maxReconnectAttempts: this.reconnect ? this.maxReconnect : 0,
                    reconnectTimeWait: this.reconnectIntervalMs,
                    timeout: this.timeoutMs,
                    name: conId_username
                };
                if (this.connectionToken != '' && this.password != '') {
                    return reject((0, utils_1.MemphisError)(new Error(`You have to connect with one of the following methods: connection token / password`)));
                }
                if (this.connectionToken == '' && this.password == '') {
                    return reject((0, utils_1.MemphisError)(new Error('You have to connect with one of the following methods: connection token / password')));
                }
                if (this.connectionToken != '') {
                    connectionOpts['token'] = this.connectionToken;
                }
                else {
                    connectionOpts['pass'] = this.password;
                    connectionOpts['user'] = this.username + "$" + this.accountId;
                }
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
                this.brokerManager = await this._getBrokerManagerConnection(connectionOpts);
                this.brokerConnection = this.brokerManager.jetstream();
                this.brokerStats = await this.brokerManager.jetstreamManager();
                this.isConnectionActive = true;
                this._sdkClientUpdatesListener();
                for (const { options, handler, context } of this.consumeHandlers) {
                    const consumer = await this.consumer(options);
                    consumer.setContext(context);
                    consumer.on('message', handler);
                    consumer.on('error', handler);
                }
                (async () => {
                    var _a, e_1, _b, _c;
                    try {
                        for (var _d = true, _e = __asyncValues(this.brokerManager.status()), _f; _f = await _e.next(), _a = _f.done, !_a;) {
                            _c = _f.value;
                            _d = false;
                            try {
                                const s = _c;
                                switch (s.type) {
                                    case 'update':
                                        this.log(`reconnected to memphis successfully`);
                                        this.isConnectionActive = true;
                                        break;
                                    case 'reconnecting':
                                        this.log(`trying to reconnect to memphis - ${(0, utils_1.MemphisErrorString)(s.data)}`);
                                        break;
                                    case 'disconnect':
                                        this.log(`disconnected from memphis - ${(0, utils_1.MemphisErrorString)(s.data)}`);
                                        this.isConnectionActive = false;
                                        break;
                                    case 'error':
                                        let err = s.data;
                                        if (err.includes("AUTHORIZATION_VIOLATION")) {
                                            this.log("to continue using Memphis, please upgrade your plan to a paid plan");
                                        }
                                        else {
                                            this.log((0, utils_1.MemphisErrorString)(err));
                                        }
                                        this.isConnectionActive = false;
                                        await this.brokerManager.close();
                                        break;
                                    default:
                                        this.isConnectionActive = true;
                                }
                            }
                            finally {
                                _d = true;
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (!_d && !_a && (_b = _e.return)) await _b.call(_e);
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
    async _getBrokerManagerConnection(connectionOpts) {
        var _a, _b;
        if (connectionOpts['user'] != '') {
            const pingConnectionOpts = JSON.parse(JSON.stringify(connectionOpts));
            pingConnectionOpts['reconnect'] = false;
            let connection;
            try {
                connection = await broker.connect(pingConnectionOpts);
                await connection.close();
            }
            catch (ex) {
                if (ex.message.includes('Authorization Violation') && !ex.message.includes('upgrade your plan')) {
                    try {
                        if ((_a = connectionOpts['servers']) === null || _a === void 0 ? void 0 : _a.includes("localhost"))
                            await (0, utils_1.sleep)(1000);
                        pingConnectionOpts['user'] = this.username;
                        connection = await broker.connect(pingConnectionOpts);
                        await connection.close();
                        connectionOpts['user'] = this.username;
                    }
                    catch (ex) {
                        throw (0, utils_1.MemphisError)(ex);
                    }
                }
                else {
                    throw (0, utils_1.MemphisError)(ex);
                }
            }
        }
        if ((_b = connectionOpts['servers']) === null || _b === void 0 ? void 0 : _b.includes("localhost"))
            await (0, utils_1.sleep)(1000);
        return await broker.connect(connectionOpts);
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
    async _functionUpdatesListener(stationName, functionUpdateData) {
        try {
            const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
            let functionUpdateSubscription = this.functionsUpdateSubs.has(internalStationName);
            if (functionUpdateSubscription) {
                this.functionsClientsMap.set(internalStationName, this.functionsClientsMap.get(internalStationName) + 1);
                return;
            }
            this.stationFunctionsMap.set(internalStationName, functionUpdateData);
            const sub = this.brokerManager.subscribe(`$memphis_functions_updates_${internalStationName}`);
            this.functionsClientsMap.set(internalStationName, 1);
            this.functionsUpdateSubs.set(internalStationName, sub);
            this._listenForFunctionUpdates(sub, internalStationName);
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async _listenForFunctionUpdates(sub, stationName) {
        var _a, e_2, _b, _c;
        try {
            for (var _d = true, sub_1 = __asyncValues(sub), sub_1_1; sub_1_1 = await sub_1.next(), _a = sub_1_1.done, !_a;) {
                _c = sub_1_1.value;
                _d = false;
                try {
                    const m = _c;
                    const data = this.JSONC.decode(m._rdata);
                    const station_partitions_first_functions = data.functions;
                    const stationMap = new Map();
                    for (const key of Object.keys(station_partitions_first_functions)) {
                        stationMap.set(key, station_partitions_first_functions[key]);
                    }
                    this.stationFunctionsMap.set(stationName, stationMap);
                }
                finally {
                    _d = true;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = sub_1.return)) await _b.call(sub_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    async _scemaUpdatesListener(stationName, schemaUpdateData) {
        try {
            const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
            let schemaUpdateSubscription = this.schemaUpdatesSubs.has(internalStationName);
            if (schemaUpdateSubscription) {
                this.clientsPerStation.set(internalStationName, this.clientsPerStation.get(internalStationName) + 1);
                return;
            }
            if (schemaUpdateData && schemaUpdateData['schema_name'] !== '') {
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
                    case 'avro':
                        const avroSchema = this._compileAvroSchema(internalStationName);
                        this.avroSchemas.set(internalStationName, avroSchema);
                        break;
                }
            }
            const sub = this.brokerManager.subscribe(`$memphis_schema_updates_${internalStationName}`);
            this.clientsPerStation.set(internalStationName, 1);
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
    _compileAvroSchema(stationName) {
        let stationSchemaData = this.stationSchemaDataMap.get(stationName);
        const schema = stationSchemaData['active_version']['schema_content'];
        let validate;
        try {
            validate = avro.parse(schema);
            return validate;
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(new Error('invalid avro schema'));
        }
    }
    _compileGraphQl(stationName) {
        const stationSchemaData = this.stationSchemaDataMap.get(stationName);
        const schemaContent = stationSchemaData['active_version']['schema_content'];
        const graphQlSchema = (0, graphql_1.buildSchema)(schemaContent);
        return graphQlSchema;
    }
    async _listenForSchemaUpdates(sub, stationName) {
        var _a, e_3, _b, _c;
        try {
            for (var _d = true, sub_2 = __asyncValues(sub), sub_2_1; sub_2_1 = await sub_2.next(), _a = sub_2_1.done, !_a;) {
                _c = sub_2_1.value;
                _d = false;
                try {
                    const m = _c;
                    const data = this.JSONC.decode(m._rdata);
                    if (data['init']['schema_name'] === '') {
                        this.stationSchemaDataMap.delete(stationName);
                        this.meassageDescriptors.delete(stationName);
                        this.jsonSchemas.delete(stationName);
                        continue;
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
                            case 'avro':
                                const avroSchema = this._compileAvroSchema(stationName);
                                this.avroSchemas.set(stationName, avroSchema);
                                break;
                        }
                    }
                    catch (ex) {
                        throw (0, utils_1.MemphisError)(ex);
                    }
                }
                finally {
                    _d = true;
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = sub_2.return)) await _b.call(sub_2);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    async _sdkClientUpdatesListener() {
        var _a, e_4, _b, _c;
        try {
            const sub = this.brokerManager.subscribe(`$memphis_sdk_clients_updates`);
            try {
                for (var _d = true, sub_3 = __asyncValues(sub), sub_3_1; sub_3_1 = await sub_3.next(), _a = sub_3_1.done, !_a;) {
                    _c = sub_3_1.value;
                    _d = false;
                    try {
                        const m = _c;
                        let data = this.JSONC.decode(m._rdata);
                        switch (data['type']) {
                            case 'send_notification':
                                this.clusterConfigurations.set(data['type'], data['update']);
                                break;
                            case 'schemaverse_to_dls':
                                this.stationSchemaverseToDlsMap.set(data['station_name'], data['update']);
                                break;
                            case 'remove_station':
                                this._unSetCachedProducerStation(data['station_name']);
                                this._unSetCachedConsumerStation(data['station_name']);
                            default:
                                break;
                        }
                    }
                    finally {
                        _d = true;
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = sub_3.return)) await _b.call(sub_3);
                }
                finally { if (e_4) throw e_4.error; }
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
    async request(subject, data, timeoutRetry, options) {
        var _a;
        try {
            return await this.brokerManager.request(subject, data, options);
        }
        catch (ex) {
            if (timeoutRetry > 0 && ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('timeout'))) {
                return await this.request(subject, data, timeoutRetry - 1, options);
            }
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async station({ name, retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS, retentionValue = 3600, storageType = storageTypes.DISK, replicas = 1, idempotencyWindowMs = 120000, schemaName = '', sendPoisonMsgToDls = true, sendSchemaFailedMsgToDls = true, tieredStorageEnabled = false, partitionsNumber = 1, dlsStation = '', timeoutRetry = 5 }) {
        var _a;
        try {
            if (partitionsNumber < 1) {
                partitionsNumber = 1;
            }
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
                tiered_storage_enabled: tieredStorageEnabled,
                partitions_number: partitionsNumber,
                dls_station: dlsStation,
            };
            const data = this.JSONC.encode(createStationReq);
            const res = await this.request('$memphis_station_creations', data, timeoutRetry, { timeout: 20000 });
            const errMsg = res.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
            return new station_1.Station(this, name);
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('already exists')) {
                return new station_1.Station(this, name.toLowerCase());
            }
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async attachSchema({ name, stationName }) {
        await this.enforceSchema({ name: name, stationName: stationName });
    }
    async enforceSchema({ name, stationName, timeoutRetry = 5 }) {
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            if (name === '' || stationName === '') {
                throw new Error('name and station name can not be empty');
            }
            const enforceSchemaReq = {
                name: name,
                station_name: stationName,
                username: this.username,
            };
            const data = this.JSONC.encode(enforceSchemaReq);
            const res = await this.request('$memphis_schema_attachments', data, timeoutRetry, { timeout: 20000 });
            const errMsg = res.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async detachSchema({ stationName, timeoutRetry = 5 }) {
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            if (stationName === '') {
                throw new Error('station name is missing');
            }
            let detachSchemaReq = {
                station_name: stationName,
                username: this.username,
            };
            let data = this.JSONC.encode(detachSchemaReq);
            let errMsg = await this.request('$memphis_schema_detachments', data, timeoutRetry, { timeout: 20000 });
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw (0, utils_1.MemphisError)(new Error(errMsg));
            }
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async producer({ stationName, producerName, genUniqueSuffix = false, timeoutRetry = 5 }) {
        var _a;
        try {
            if (!this.isConnectionActive)
                throw (0, utils_1.MemphisError)(new Error('Connection is dead'));
            const realName = producerName.toLowerCase();
            if (Array.isArray(stationName)) {
                return new producer_1.Producer(this, producerName, stationName, realName, []);
            }
            if (genUniqueSuffix === true) {
                console.log("Deprecation warning: genUniqueSuffix will be stopped to be supported after November 1'st, 2023.");
                producerName = (0, utils_1.generateNameSuffix)(`${producerName}_`);
            }
            else {
                const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
                const producerMapKey = `${internalStationName}_${producerName.toLowerCase()}`;
                const producer = this.getCachedProducer(producerMapKey);
                if (producer) {
                    return producer;
                }
            }
            const createProducerReq = {
                name: producerName,
                station_name: stationName,
                connection_id: this.connectionId,
                producer_type: 'application',
                req_version: 3,
                username: this.username,
                app_id: appId,
            };
            const data = this.JSONC.encode(createProducerReq);
            let createRes = await this.request('$memphis_producer_creations', data, timeoutRetry, { timeout: 20000 });
            createRes = this.JSONC.decode(createRes.data);
            if (createRes.error != '') {
                throw (0, utils_1.MemphisError)(new Error(createRes.error));
            }
            const internal_station = stationName.replace(/\./g, '#').toLowerCase();
            if (createRes.station_version !== undefined) {
                if (createRes.station_version >= 2) {
                    const station_partitions_first_functions = createRes.station_partitions_first_functions;
                    const stationMap = new Map();
                    for (const key of Object.keys(station_partitions_first_functions)) {
                        stationMap.set(key, station_partitions_first_functions[key]);
                    }
                    await this._functionUpdatesListener(stationName, stationMap);
                }
            }
            this.stationSchemaverseToDlsMap.set(internal_station, createRes.schemaverse_to_dls);
            this.clusterConfigurations.set('send_notification', createRes.send_notification);
            await this._scemaUpdatesListener(stationName, createRes.schema_update);
            var partitions;
            if ((createRes === null || createRes === void 0 ? void 0 : createRes.partitions_update) === undefined || (createRes === null || createRes === void 0 ? void 0 : createRes.partitions_update) === null || ((_a = createRes === null || createRes === void 0 ? void 0 : createRes.partitions_update) === null || _a === void 0 ? void 0 : _a.partitions_list) === null) {
                partitions = [];
            }
            else {
                partitions = createRes.partitions_update.partitions_list;
            }
            this.stationPartitions.set(internal_station, partitions);
            const producer = new producer_1.Producer(this, producerName, stationName, realName, partitions);
            this.setCachedProducer(producer);
            return producer;
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    async consumer({ stationName, consumerName, consumerGroup = '', pullIntervalMs = 1000, batchSize = 10, batchMaxTimeToWaitMs = 5000, maxAckTimeMs = 30000, maxMsgDeliveries = 2, genUniqueSuffix = false, startConsumeFromSequence = 1, lastMessages = -1, consumerPartitionKey = null, consumerPartitionNumber = -1, timeoutRetry = 5 }) {
        var _a;
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            if (batchSize > maxBatchSize) {
                throw (0, utils_1.MemphisError)(new Error(`Batch size can not be greater than ${maxBatchSize}`));
            }
            const realName = consumerName.toLowerCase();
            if (genUniqueSuffix) {
                console.log("Deprecation warning: genUniqueSuffix will be stopped to be supported after November 1'st, 2023.");
            }
            consumerName = genUniqueSuffix
                ? (0, utils_1.generateNameSuffix)(`${consumerName}_`)
                : consumerName;
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
                req_version: 3,
                username: this.username,
                app_id: appId,
            };
            const data = this.JSONC.encode(createConsumerReq);
            let createRes = await this.request('$memphis_consumer_creations', data, timeoutRetry, { timeout: 20000 });
            const internal_station = stationName.replace(/\./g, '#');
            let partitions = [];
            try {
                createRes = this.JSONC.decode(createRes.data);
                await this._scemaUpdatesListener(stationName, createRes.schema_update);
                if (createRes.error != '') {
                    throw (0, utils_1.MemphisError)(new Error(createRes.error));
                }
                if ((createRes === null || createRes === void 0 ? void 0 : createRes.partitions_update) === undefined || (createRes === null || createRes === void 0 ? void 0 : createRes.partitions_update) === null || ((_a = createRes === null || createRes === void 0 ? void 0 : createRes.partitions_update) === null || _a === void 0 ? void 0 : _a.partitions_list) === null) {
                    partitions = [];
                }
                else {
                    partitions = createRes.partitions_update.partitions_list;
                }
            }
            catch (_b) {
                const errMsg = createRes.data ? createRes.data.toString() : createRes.error.toString();
                if (errMsg != '') {
                    throw (0, utils_1.MemphisError)(new Error(errMsg));
                }
            }
            this.stationPartitions.set(internal_station, partitions);
            const consumer = new consumer_1.Consumer(this, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries, startConsumeFromSequence, lastMessages, realName, partitions, consumerPartitionKey, consumerPartitionNumber);
            this.setCachedConsumer(consumer);
            return consumer;
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    headers() {
        return new message_header_1.MsgHeaders();
    }
    async produce({ stationName, producerName, genUniqueSuffix = false, message, ackWaitSec, asyncProduce, headers, msgId, producerPartitionKey = null, producerPartitionNumber = -1 }) {
        let producer;
        if (!this.isConnectionActive)
            throw (0, utils_1.MemphisError)(new Error('Cant produce a message without being connected!'));
        if (typeof stationName === 'string') {
            const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
            const producerMapKey = `${internalStationName}_${producerName.toLowerCase()}`;
            producer = this.getCachedProducer(producerMapKey);
        }
        if (genUniqueSuffix) {
            console.log("Deprecation warning: genUniqueSuffix will be stopped to be supported after November 1'st, 2023.");
        }
        if (producer)
            return await producer.produce({
                message,
                ackWaitSec,
                asyncProduce,
                headers,
                msgId,
                producerPartitionKey,
                producerPartitionNumber
            });
        producer = await this.producer({
            stationName,
            producerName,
            genUniqueSuffix
        });
        return await producer.produce({
            message,
            ackWaitSec,
            asyncProduce,
            headers,
            msgId,
            producerPartitionKey,
            producerPartitionNumber
        });
    }
    async fetchMessages({ stationName, consumerName, consumerGroup = '', genUniqueSuffix = false, batchSize = 10, maxAckTimeMs = 30000, batchMaxTimeToWaitMs = 5000, maxMsgDeliveries = 2, startConsumeFromSequence = 1, lastMessages = -1, consumerPartitionKey = null, consumerPartitionNumber = -1, }) {
        let consumer;
        if (!this.isConnectionActive)
            throw (0, utils_1.MemphisError)(new Error('Cant fetch messages without being connected!'));
        if (batchSize > maxBatchSize) {
            throw (0, utils_1.MemphisError)(new Error(`Batch size can not be greater than ${maxBatchSize}`));
        }
        if (genUniqueSuffix) {
            console.log("Deprecation warning: genUniqueSuffix will be stopped to be supported after November 1'st, 2023.");
        }
        const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
        const consumerMapKey = `${internalStationName}_${consumerName.toLowerCase()}`;
        consumer = this.getCachedConsumer(consumerMapKey);
        if (consumer)
            return await consumer.fetch({ batchSize, consumerPartitionKey, consumerPartitionNumber });
        consumer = await this.consumer({
            stationName,
            consumerName,
            genUniqueSuffix,
            consumerGroup,
            batchSize,
            maxAckTimeMs,
            batchMaxTimeToWaitMs,
            maxMsgDeliveries,
            startConsumeFromSequence,
            lastMessages,
            consumerPartitionKey,
            consumerPartitionNumber
        });
        return await consumer.fetch({ batchSize, consumerPartitionKey, consumerPartitionNumber });
    }
    getCachedProducer(key) {
        if (key === '' || key === null)
            return null;
        return this.producersMap.get(key);
    }
    _getCachedProducer(key) {
        return this.getCachedProducer(key);
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
        const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
        this.producersMap.forEach((producer, key) => {
            if (producer._getProducerStation() === internalStationName) {
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
        if (!this.getCachedConsumer(consumer._getConsumerKey())) {
            consumer.stop();
            this.consumersMap.delete(consumer._getConsumerKey());
        }
    }
    _unSetCachedConsumerStation(stationName) {
        const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
        this.consumersMap.forEach((consumer, key) => {
            if (consumer._getConsumerStation() === internalStationName) {
                consumer.stop();
                this.consumersMap.delete(key);
            }
        });
    }
    async close() {
        var _a, _b, _c;
        this.isConnectionActive = false;
        for (let key of this.schemaUpdatesSubs.keys()) {
            const sub = this.schemaUpdatesSubs.get(key);
            (_a = sub === null || sub === void 0 ? void 0 : sub.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(sub);
            this.stationSchemaDataMap.delete(key);
            this.schemaUpdatesSubs.delete(key);
            this.clientsPerStation.delete(key);
            this.meassageDescriptors.delete(key);
            this.jsonSchemas.delete(key);
        }
        await (0, utils_1.sleep)(500);
        await ((_c = (_b = this.brokerManager) === null || _b === void 0 ? void 0 : _b.close) === null || _c === void 0 ? void 0 : _c.call(_b));
        this.consumeHandlers = [];
        this.producersMap = new Map();
        this.consumersMap.forEach((consumer) => consumer.stop());
        this.consumersMap = new Map();
    }
    isConnected() {
        return !this.brokerManager.isClosed();
    }
    _setConsumeHandler(options, handler, context) {
        this.consumeHandlers.push({ options, handler, context });
    }
    async createSchema({ schemaName, schemaType, schemaFilePath, timeoutRetry = 5 }) {
        try {
            if (schemaType !== "json" && schemaType !== "graphql" && schemaType !== "protobuf" && schemaType !== "avro")
                throw (0, utils_1.MemphisError)(new Error("Schema type not supported"));
            var nameConvention = RegExp('^[a-z0-9_.-]*$');
            if (!nameConvention.test(schemaName))
                throw (0, utils_1.MemphisError)(new Error("Only alphanumeric and the '_', '-', '.' characters are allowed in the schema name"));
            var firstChar = Array.from(schemaName)[0];
            var lastChar = Array.from(schemaName)[-1];
            if (firstChar === "." || firstChar === "_" || firstChar === "-" || lastChar === "." || lastChar === "_" || lastChar === "-")
                throw (0, utils_1.MemphisError)(new Error("schema name can not start or end with non alphanumeric character"));
            if (schemaName.length === 0)
                throw (0, utils_1.MemphisError)(new Error("schema name can not be empty"));
            if (schemaName.length > 128)
                throw (0, utils_1.MemphisError)(new Error("schema name should be under 128 characters"));
            var schemContent = fs.readFileSync(schemaFilePath, 'utf-8');
            var createSchemaReq = {
                name: schemaName,
                type: schemaType,
                created_by_username: this.username,
                schema_content: schemContent,
                message_struct_name: "",
            };
            var data = this.JSONC.encode(createSchemaReq);
            let createRes = await this.request('$memphis_schema_creations', data, timeoutRetry, { timeout: 20000 });
            createRes = this.JSONC.decode(createRes.data);
            if (createRes.error != "")
                throw (0, utils_1.MemphisError)(new Error(createRes.error));
        }
        catch (ex) {
            throw (0, utils_1.MemphisError)(ex);
        }
    }
    log(...args) {
        if (this.suppressLogs) {
            return;
        }
        console.log(...args);
    }
    _getPartitionFromKey(key, stationName) {
        const seed = this.seed;
        const hashValue = murmurhash.v3(key, seed);
        const stationPartitions = this.stationPartitions.get(stationName);
        if (stationPartitions != null) {
            const hasValueInt = hashValue >>> 0;
            const partitionKey = hasValueInt % stationPartitions.length;
            return partitionKey;
        }
        else {
            throw new Error("Station partitions not found");
        }
    }
    _validatePartitionNumber(partitionNumber, stationName) {
        return new Promise((resolve, reject) => {
            const stationPartitions = this.stationPartitions.get(stationName);
            if (stationPartitions != null) {
                if (stationPartitions.includes(partitionNumber)) {
                    resolve();
                }
                else {
                    reject(new Error("Partition number not found"));
                }
            }
            else {
                reject(new Error("Station partitions not found"));
            }
        });
    }
}
class RoundRobinProducerConsumerGenerator {
    constructor(partitions) {
        this.NumberOfPartitions = partitions.length;
        this.Partitions = partitions;
        this.Current = 0;
    }
    Next() {
        const partitionNumber = this.Partitions[this.Current];
        this.Current = (this.Current + 1) % this.NumberOfPartitions;
        return partitionNumber;
    }
}
exports.RoundRobinProducerConsumerGenerator = RoundRobinProducerConsumerGenerator;
let MemphisService = class MemphisService extends Memphis {
};
MemphisService = __decorate([
    (0, common_1.Injectable)({})
], MemphisService);
exports.MemphisService = MemphisService;
exports.memphis = new Memphis();
