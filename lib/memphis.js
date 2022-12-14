"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Memphis = void 0;
const events = require("events");
const broker = require("nats");
const nats_1 = require("nats");
const protobuf = require("protobufjs");
const fs = require("fs");
const ajv_1 = require("ajv");
const ajv_draft_04_1 = require("ajv-draft-04");
const json_schema_draft_07_json_1 = require("ajv/dist/refs/json-schema-draft-07.json");
const json_schema_draft_06_json_1 = require("ajv/dist/refs/json-schema-draft-06.json");
const _2020_1 = require("ajv/dist/2020");
const retentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: 'message_age_sec',
    MESSAGES: 'messages',
    BYTES: 'bytes'
};
const storageTypes = {
    DISK: 'file',
    MEMORY: 'memory'
};
const MemphisError = (error) => {
    if (error === null || error === void 0 ? void 0 : error.message) {
        error.message = error.message.replace('NatsError', 'memphis');
        error.message = error.message.replace('Nats', 'memphis');
        error.message = error.message.replace('nats', 'memphis');
    }
    if (error === null || error === void 0 ? void 0 : error.stack) {
        error.stack = error.stack.replace('NatsError', 'memphis');
        error.stack = error.stack.replace('Nats:', 'memphis');
        error.stack = error.stack.replace('nats:', 'memphis');
    }
    if (error === null || error === void 0 ? void 0 : error.name) {
        error.name = error.name.replace('NatsError', 'MemphisError');
        error.name = error.name.replace('Nats', 'MemphisError');
        error.name = error.name.replace('nats', 'MemphisError');
    }
    return error;
};
const schemaVFailAlertType = 'schema_validation_fail_alert';
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
    }
    connect({ host, port = 6666, username, connectionToken, reconnect = true, maxReconnect = 3, reconnectIntervalMs = 5000, timeoutMs = 15000 }) {
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
                this.brokerManager = await broker.connect({
                    servers: `${this.host}:${this.port}`,
                    reconnect: this.reconnect,
                    maxReconnectAttempts: this.reconnect ? this.maxReconnect : 0,
                    reconnectTimeWait: this.reconnectIntervalMs,
                    timeout: this.timeoutMs,
                    token: this.connectionToken,
                    name: conId_username
                });
                this.brokerConnection = this.brokerManager.jetstream();
                this.brokerStats = await this.brokerManager.jetstreamManager();
                this.isConnectionActive = true;
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
                return reject(MemphisError(ex));
            }
        });
    }
    async _compileProtobufSchema(stationName) {
        let stationSchemaData = this.stationSchemaDataMap.get(stationName);
        let protoPathName = `${__dirname}/${stationSchemaData['schema_name']}_${stationSchemaData['active_version']['version_number']}.proto`;
        fs.writeFileSync(protoPathName, stationSchemaData['active_version']['schema_content']);
        let root = await protobuf.load(protoPathName);
        fs.unlinkSync(protoPathName);
        let meassageDescriptor = root.lookupType(`${stationSchemaData['active_version']['message_struct_name']}`);
        this.meassageDescriptors.set(stationName, meassageDescriptor);
    }
    async _scemaUpdatesListener(stationName, schemaUpdateData) {
        try {
            const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
            let schemaUpdateSubscription = this.schemaUpdatesSubs.has(internalStationName);
            if (schemaUpdateSubscription) {
                this.producersPerStation.set(internalStationName, this.producersPerStation.get(internalStationName) + 1);
            }
            else {
                let shouldDrop = schemaUpdateData['schema_name'] === '';
                if (!shouldDrop) {
                    this.stationSchemaDataMap.set(internalStationName, schemaUpdateData);
                    switch (schemaUpdateData['type']) {
                        case 'protobuf':
                            this._compileProtobufSchema(internalStationName);
                            break;
                        case 'json':
                            const jsonSchema = this._compileJsonSchema(internalStationName);
                            this.jsonSchemas.set(internalStationName, jsonSchema);
                            break;
                    }
                }
                const sub = this.brokerManager.subscribe(`$memphis_schema_updates_${internalStationName}`);
                this.producersPerStation.set(internalStationName, 1);
                this.schemaUpdatesSubs.set(internalStationName, sub);
                this._listenForSchemaUpdates(sub, internalStationName);
            }
        }
        catch (err) {
            throw MemphisError(err);
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
        catch (error) {
            try {
                ajv.addMetaSchema(json_schema_draft_07_json_1.default);
                validate = ajv.compile(schemaObj);
                return validate;
            }
            catch (error) {
                try {
                    const ajv = new ajv_draft_04_1.default();
                    validate = ajv.compile(schemaObj);
                    return validate;
                }
                catch (error) {
                    try {
                        const ajv = new _2020_1.default();
                        validate = ajv.compile(schemaObj);
                        return validate;
                    }
                    catch (error) {
                        try {
                            ajv.addMetaSchema(json_schema_draft_06_json_1.default);
                            return validate;
                        }
                        catch (error) {
                            throw MemphisError(new Error('invalid json schema'));
                        }
                    }
                }
            }
        }
    }
    async _listenForSchemaUpdates(sub, stationName) {
        var e_2, _a;
        try {
            for (var sub_1 = __asyncValues(sub), sub_1_1; sub_1_1 = await sub_1.next(), !sub_1_1.done;) {
                const m = sub_1_1.value;
                let data = this.JSONC.decode(m._rdata);
                let shouldDrop = data['init']['schema_name'] === '';
                if (shouldDrop) {
                    this.stationSchemaDataMap.delete(stationName);
                    this.meassageDescriptors.delete(stationName);
                    this.jsonSchemas.delete(stationName);
                }
                else {
                    this.stationSchemaDataMap.set(stationName, data.init);
                    try {
                        switch (data['init']['type']) {
                            case 'protobuf':
                                this._compileProtobufSchema(stationName);
                                break;
                            case 'json':
                                const jsonSchema = this._compileJsonSchema(stationName);
                                this.jsonSchemas.set(stationName, jsonSchema);
                                break;
                        }
                    }
                    catch (err) {
                        throw MemphisError(err);
                    }
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
    async station({ name, retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS, retentionValue = 604800, storageType = storageTypes.DISK, replicas = 1, idempotencyWindowMs = 120000, schemaName = '', sendPoisonMsgToDls = true, sendSchemaFailedMsgToDls = true }) {
        var _a;
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            let createStationReq = {
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
                }
            };
            let data = this.JSONC.encode(createStationReq);
            let errMsg = await this.brokerManager.request('$memphis_station_creations', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
            return new Station(this, name);
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('already exists')) {
                return new Station(this, name.toLowerCase());
            }
            throw MemphisError(ex);
        }
    }
    async attachSchema({ name, stationName }) {
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            if (name === '' || stationName === '') {
                throw new Error('name and station name can not be empty');
            }
            let attachSchemaReq = {
                name: name,
                station_name: stationName
            };
            let data = this.JSONC.encode(attachSchemaReq);
            let errMsg = await this.brokerManager.request('$memphis_schema_attachments', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
        }
        catch (ex) {
            throw MemphisError(ex);
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
                station_name: stationName
            };
            let data = this.JSONC.encode(detachSchemaReq);
            let errMsg = await this.brokerManager.request('$memphis_schema_detachments', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
        }
        catch (ex) {
            throw MemphisError(ex);
        }
    }
    async producer({ stationName, producerName, genUniqueSuffix = false }) {
        try {
            if (!this.isConnectionActive)
                throw MemphisError(new Error('Connection is dead'));
            producerName = genUniqueSuffix ? producerName + '_' + generateNameSuffix() : producerName;
            let createProducerReq = {
                name: producerName,
                station_name: stationName,
                connection_id: this.connectionId,
                producer_type: 'application',
                req_version: 1
            };
            let data = this.JSONC.encode(createProducerReq);
            let createRes = await this.brokerManager.request('$memphis_producer_creations', data);
            createRes = this.JSONC.decode(createRes.data);
            if (createRes.error != '') {
                throw MemphisError(new Error(createRes.error));
            }
            await this._scemaUpdatesListener(stationName, createRes.schema_update);
            return new Producer(this, producerName, stationName);
        }
        catch (ex) {
            throw MemphisError(ex);
        }
    }
    async consumer({ stationName, consumerName, consumerGroup = '', pullIntervalMs = 1000, batchSize = 10, batchMaxTimeToWaitMs = 5000, maxAckTimeMs = 30000, maxMsgDeliveries = 10, genUniqueSuffix = false }) {
        try {
            if (!this.isConnectionActive)
                throw new Error('Connection is dead');
            consumerName = genUniqueSuffix ? consumerName + '_' + generateNameSuffix() : consumerName;
            consumerGroup = consumerGroup || consumerName;
            let createConsumerReq = {
                name: consumerName,
                station_name: stationName,
                connection_id: this.connectionId,
                consumer_type: 'application',
                consumers_group: consumerGroup,
                max_ack_time_ms: maxAckTimeMs,
                max_msg_deliveries: maxMsgDeliveries
            };
            let data = this.JSONC.encode(createConsumerReq);
            let errMsg = await this.brokerManager.request('$memphis_consumer_creations', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
            return new Consumer(this, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries);
        }
        catch (ex) {
            throw MemphisError(ex);
        }
    }
    headers() {
        return new MsgHeaders();
    }
    close() {
        for (let key of this.schemaUpdatesSubs.keys()) {
            let sub = this.schemaUpdatesSubs.get(key);
            if (sub)
                sub.unsubscribe();
            this.stationSchemaDataMap.delete(key);
            this.schemaUpdatesSubs.delete(key);
            this.producersPerStation.delete(key);
            this.meassageDescriptors.delete(key);
            this.jsonSchemas.delete(key);
        }
        setTimeout(() => {
            this.brokerManager && this.brokerManager.close();
        }, 500);
    }
}
exports.Memphis = Memphis;
class MsgHeaders {
    constructor() {
        this.headers = (0, nats_1.headers)();
    }
    add(key, value) {
        if (!key.startsWith('$memphis')) {
            this.headers.append(key, value);
        }
        else {
            throw MemphisError(new Error('Keys in headers should not start with $memphis'));
        }
    }
}
class Producer {
    constructor(connection, producerName, stationName) {
        this.connection = connection;
        this.producerName = producerName.toLowerCase();
        this.stationName = stationName.toLowerCase();
        this.internal_station = this.stationName.replace(/\./g, '#').toLowerCase();
    }
    async produce({ message, ackWaitSec = 15, asyncProduce = false, headers = new MsgHeaders(), msgId = null }) {
        try {
            let messageToSend = this._validateMessage(message);
            headers.headers.set('$memphis_connectionId', this.connection.connectionId);
            headers.headers.set('$memphis_producedBy', this.producerName);
            if (msgId)
                headers.headers.set('msg-id', msgId);
            if (asyncProduce)
                this.connection.brokerConnection.publish(`${this.internal_station}.final`, messageToSend, {
                    headers: headers.headers,
                    ackWait: ackWaitSec * 1000 * 1000000
                });
            else
                await this.connection.brokerConnection.publish(`${this.internal_station}.final`, messageToSend, {
                    headers: headers.headers,
                    ackWait: ackWaitSec * 1000 * 1000000
                });
        }
        catch (ex) {
            if (ex.code === '503') {
                throw MemphisError(new Error('Produce operation has failed, please check whether Station/Producer are still exist'));
            }
            if (ex.message.includes('BAD_PAYLOAD'))
                ex = MemphisError(new Error('Invalid message format, expecting Uint8Array'));
            if (ex.message.includes('Schema validation has failed')) {
                let failedMsg = '';
                if (message instanceof Uint8Array) {
                    failedMsg = String.fromCharCode.apply(null, message);
                }
                else {
                    failedMsg = JSON.stringify(message);
                }
                this.connection.sendNotification('Schema validation has failed', `Station: ${this.stationName}\nProducer: ${this.producerName}\nError: ${ex.message}`, failedMsg, schemaVFailAlertType);
            }
            throw MemphisError(ex);
        }
    }
    _parseJsonValidationErrors(errors) {
        const errorsArray = [];
        for (const error of errors) {
            if (error.instancePath)
                errorsArray.push(`${error.schemaPath} ${error.message}`);
            else
                errorsArray.push(error.message);
        }
        return errorsArray.join(', ');
    }
    _validateJsonMessage(msg) {
        try {
            let validate = this.connection.jsonSchemas.get(this.internal_station);
            let msgObj;
            let msgToSend = new Uint8Array();
            const isBuffer = Buffer.isBuffer(msg);
            if (isBuffer) {
                msgObj = JSON.parse(msg.toString());
                msgToSend = msg;
                const valid = validate(msgObj);
                if (!valid) {
                    throw MemphisError(new Error(`Schema validation has failed: ${this._parseJsonValidationErrors(validate['errors'])}`));
                }
                return msgToSend;
            }
            else if (Object.prototype.toString.call(msg) == '[object Object]') {
                msgObj = msg;
                let enc = new TextEncoder();
                const msgString = JSON.stringify(msg);
                msgToSend = enc.encode(msgString);
                const valid = validate(msgObj);
                if (!valid) {
                    throw MemphisError(new Error(`Schema validation has failed: ${this._parseJsonValidationErrors(validate['errors'])}`));
                }
                return msgToSend;
            }
            else {
                throw MemphisError(new Error('Schema validation has failed: Unsupported message type'));
            }
        }
        catch (ex) {
            throw MemphisError(new Error(ex.message));
        }
    }
    _validateProtobufMessage(msg) {
        let meassageDescriptor = this.connection.meassageDescriptors.get(this.internal_station);
        if (meassageDescriptor) {
            if (msg instanceof Uint8Array) {
                try {
                    meassageDescriptor.decode(msg);
                    return msg;
                }
                catch (ex) {
                    if (ex.message.includes('index out of range')) {
                        ex = new Error('Invalid message format, expecting protobuf');
                    }
                    throw MemphisError(new Error(`Schema validation has failed: ${ex.message}`));
                }
            }
            else if (msg instanceof Object) {
                let errMsg = meassageDescriptor.verify(msg);
                if (errMsg) {
                    throw MemphisError(new Error(`Schema validation has failed: ${errMsg}`));
                }
                const protoMsg = meassageDescriptor.create(msg);
                const messageToSend = meassageDescriptor.encode(protoMsg).finish();
                return messageToSend;
            }
            else {
                throw MemphisError(new Error('Schema validation has failed: Unsupported message type'));
            }
        }
    }
    _validateMessage(msg) {
        let stationSchemaData = this.connection.stationSchemaDataMap.get(this.internal_station);
        if (stationSchemaData) {
            switch (stationSchemaData['type']) {
                case 'protobuf':
                    return this._validateProtobufMessage(msg);
                case 'json':
                    return this._validateJsonMessage(msg);
                default:
                    return msg;
            }
        }
        else {
            if (!Buffer.isBuffer(msg)) {
                throw MemphisError(new Error('Schema validation has failed: Unsupported message type'));
            }
            else {
                return msg;
            }
        }
    }
    async destroy() {
        var _a;
        try {
            let removeProducerReq = {
                name: this.producerName,
                station_name: this.stationName
            };
            let data = this.connection.JSONC.encode(removeProducerReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_producer_destructions', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            let prodNumber = this.connection.producersPerStation.get(stationName) - 1;
            this.connection.producersPerStation.set(stationName, prodNumber);
            if (prodNumber === 0) {
                let sub = this.connection.schemaUpdatesSubs.get(stationName);
                if (sub)
                    sub.unsubscribe();
                this.connection.stationSchemaDataMap.delete(stationName);
                this.connection.schemaUpdatesSubs.delete(stationName);
                this.connection.meassageDescriptors.delete(stationName);
                this.connection.jsonSchemas.delete(stationName);
            }
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}
class Consumer {
    constructor(connection, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs, maxMsgDeliveries) {
        this.connection = connection;
        this.stationName = stationName.toLowerCase();
        this.consumerName = consumerName.toLowerCase();
        this.consumerGroup = consumerGroup.toLowerCase();
        this.pullIntervalMs = pullIntervalMs;
        this.batchSize = batchSize;
        this.batchMaxTimeToWaitMs = batchMaxTimeToWaitMs;
        this.maxAckTimeMs = maxAckTimeMs;
        this.maxMsgDeliveries = maxMsgDeliveries;
        this.eventEmitter = new events.EventEmitter();
        this.pullInterval = null;
        this.pingConsumerInvtervalMs = 30000;
        this.pingConsumerInvterval = null;
    }
    on(event, cb) {
        if (event === 'message') {
            const subject = this.stationName.replace(/\./g, '#').toLowerCase();
            const consumerGroup = this.consumerGroup.replace(/\./g, '#').toLowerCase();
            const consumerName = this.consumerName.replace(/\./g, '#').toLowerCase();
            this.connection.brokerConnection
                .pullSubscribe(`${subject}.final`, {
                mack: true,
                config: {
                    durable_name: this.consumerGroup ? consumerGroup : consumerName
                }
            })
                .then(async (psub) => {
                psub.pull({
                    batch: this.batchSize,
                    expires: this.batchMaxTimeToWaitMs
                });
                this.pullInterval = setInterval(() => {
                    if (!this.connection.brokerManager.isClosed())
                        psub.pull({
                            batch: this.batchSize,
                            expires: this.batchMaxTimeToWaitMs
                        });
                    else
                        clearInterval(this.pullInterval);
                }, this.pullIntervalMs);
                this.pingConsumerInvterval = setInterval(async () => {
                    if (!this.connection.brokerManager.isClosed()) {
                        this._pingConsumer();
                    }
                    else
                        clearInterval(this.pingConsumerInvterval);
                }, this.pingConsumerInvtervalMs);
                const sub = this.connection.brokerManager.subscribe(`$memphis_dlq_${subject}_${consumerGroup}`, {
                    queue: `$memphis_${subject}_${consumerGroup}`
                });
                this._handleAsyncIterableSubscriber(psub);
                this._handleAsyncIterableSubscriber(sub);
            })
                .catch((error) => this.eventEmitter.emit('error', MemphisError(error)));
        }
        this.eventEmitter.on(event, cb);
    }
    async _handleAsyncIterableSubscriber(iter) {
        var e_3, _a;
        try {
            for (var iter_1 = __asyncValues(iter), iter_1_1; iter_1_1 = await iter_1.next(), !iter_1_1.done;) {
                const m = iter_1_1.value;
                this.eventEmitter.emit('message', new Message(m, this.connection, this.consumerGroup));
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (iter_1_1 && !iter_1_1.done && (_a = iter_1.return)) await _a.call(iter_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    async _pingConsumer() {
        try {
            const stationName = this.stationName.replace(/\./g, '#').toLowerCase();
            const consumerGroup = this.consumerGroup.replace(/\./g, '#').toLowerCase();
            const consumerName = this.consumerName.replace(/\./g, '#').toLowerCase();
            const durableName = consumerGroup || consumerName;
            await this.connection.brokerStats.consumers.info(stationName, durableName);
        }
        catch (ex) {
            this.eventEmitter.emit('error', MemphisError(new Error('station/consumer were not found')));
        }
    }
    async destroy() {
        var _a;
        clearInterval(this.pullInterval);
        try {
            let removeConsumerReq = {
                name: this.consumerName,
                station_name: this.stationName
            };
            let data = this.connection.JSONC.encode(removeConsumerReq);
            let errMsg = await this.connection.brokerManager.request('$memphis_consumer_destructions', data);
            errMsg = errMsg.data.toString();
            if (errMsg != '') {
                throw MemphisError(new Error(errMsg));
            }
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}
function generateNameSuffix() {
    return [...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}
class Message {
    constructor(message, connection, cgName) {
        this.message = message;
        this.connection = connection;
        this.cgName = cgName;
    }
    ack() {
        if (this.message.ack)
            this.message.ack();
        else {
            let buf = this.connection.JSONC.encode({
                id: this.message.headers.get('$memphis_pm_id'),
                cg_name: this.cgName
            });
            this.connection.brokerManager.publish('$memphis_pm_acks', buf);
        }
    }
    getData() {
        return this.message.data;
    }
    getHeaders() {
        const msgHeaders = new Map();
        const hdrs = this.message.headers['headers'];
        for (let [key, value] of hdrs) {
            msgHeaders[key] = value;
        }
        return msgHeaders;
    }
}
class Station {
    constructor(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }
    async destroy() {
        var _a;
        try {
            let removeStationReq = {
                station_name: this.name
            };
            const stationName = this.name.replace(/\./g, '#').toLowerCase();
            let sub = this.connection.schemaUpdatesSubs.get(stationName);
            if (sub)
                sub.unsubscribe();
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
        }
        catch (ex) {
            if ((_a = ex.message) === null || _a === void 0 ? void 0 : _a.includes('not exist')) {
                return;
            }
            throw MemphisError(ex);
        }
    }
}
const MemphisInstance = new Memphis();
exports.default = MemphisInstance;
