// Credit for The NATS.IO Authors
// Copyright 2021-2022 The Memphis Authors
// Licensed under the Apache License, Version 2.0 (the “License”);
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an “AS IS” BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.package server

import { Injectable } from '@nestjs/common';
import Ajv from 'ajv';
import jsonSchemaDraft04 from 'ajv-draft-04';
import Ajv2020 from 'ajv/dist/2020';
import draft6MetaSchema from 'ajv/dist/refs/json-schema-draft-06.json';
import draft7MetaSchema from 'ajv/dist/refs/json-schema-draft-07.json';
import * as fs from 'fs';
import { buildSchema as buildGraphQlSchema, GraphQLSchema } from 'graphql';
import * as broker from 'nats';
import * as protobuf from 'protobufjs';

import { Consumer } from './consumer';
import { Message } from './message';
import { MsgHeaders } from './message-header';
import { MemphisConsumerOptions } from './nest/interfaces';
import { Producer } from './producer';
import { Station } from './station';
import { generateNameSuffix, MemphisError, sleep } from './utils';
import { v4 as uuidv4 } from 'uuid';
import { NatsConnection } from 'nats';

interface IRetentionTypes {
  MAX_MESSAGE_AGE_SECONDS: string;
  MESSAGES: string;
  BYTES: string;
}

const retentionTypes: IRetentionTypes = {
  MAX_MESSAGE_AGE_SECONDS: 'message_age_sec',
  MESSAGES: 'messages',
  BYTES: 'bytes'
};

interface IStorageTypes {
  DISK: string;
  MEMORY: string;
}

const storageTypes: IStorageTypes = {
  DISK: 'file',
  MEMORY: 'memory'
};

const maxBatchSize = 5000

class Memphis {
  private isConnectionActive: boolean;
  public connectionId: string;
  public host: string;
  public port: number;
  public username: string;
  public accountId: number
  private connectionToken: string;
  private password: string;
  private reconnect: boolean;
  private maxReconnect: number;
  private reconnectIntervalMs: number;
  private timeoutMs: number;
  public brokerConnection: any;
  public brokerManager: any;
  public brokerStats: any;
  public retentionTypes!: IRetentionTypes;
  public storageTypes!: IStorageTypes;
  public JSONC: any;
  public stationSchemaDataMap: Map<string, Object>;
  public schemaUpdatesSubs: Map<string, broker.Subscription>;
  public producersPerStation: Map<string, number>;
  public meassageDescriptors: Map<string, protobuf.Type>;
  public jsonSchemas: Map<string, Function>;
  public graphqlSchemas: Map<string, GraphQLSchema>;
  public clusterConfigurations: Map<string, boolean>;
  public stationSchemaverseToDlsMap: Map<string, boolean>;
  private producersMap: Map<string, Producer>;
  private consumersMap: Map<string, Consumer>;
  private consumeHandlers: {
    options: MemphisConsumerOptions;
    context?: object;
    handler: (...args: any) => void;
  }[];

  constructor() {
    this.isConnectionActive = false;
    this.host = '';
    this.port = 6666;
    this.username = '';
    this.accountId = 1;
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
    this.connectionId = uuidv4().toString()
    this.stationSchemaDataMap = new Map();
    this.schemaUpdatesSubs = new Map();
    this.producersPerStation = new Map();
    this.meassageDescriptors = new Map();
    this.jsonSchemas = new Map();
    this.graphqlSchemas = new Map();
    this.clusterConfigurations = new Map();
    this.stationSchemaverseToDlsMap = new Map();
    this.producersMap = new Map<string, Producer>();
    this.consumersMap = new Map<string, Consumer>();
    this.consumeHandlers = [];
  }

  /**
   * Creates connection with Memphis.
   * @param {String} host - memphis host.
   * @param {Number} port - broker port, default is 6666.
   * @param {String} username - user of type root/application.
   * @param {String} accountId - You can find it on the profile page in the Memphis UI. This field should be sent only on the cloud version of Memphis, otherwise it will be ignored.
   * @param {String} connectionToken - connection token.
   * @param {String} password - depends on how Memphis deployed - default is connection token-based authentication
   * @param {Boolean} reconnect - whether to do reconnect while connection is lost.
   * @param {Number} maxReconnect - The reconnect attempts.
   * @param {Number} reconnectIntervalMs - Interval in miliseconds between reconnect attempts.
   * @param {Number} timeoutMs - connection timeout in miliseconds.
   * @param {string} keyFile - path to tls key file.
   * @param {string} certFile - path to tls cert file.
   * @param {string} caFile - path to tls ca file.
   */

  connect({
    host,
    port = 6666,
    username,
    accountId = 1,
    connectionToken = '',
    password = '',
    reconnect = true,
    maxReconnect = 3,
    reconnectIntervalMs = 5000,
    timeoutMs = 2000,
    keyFile = '',
    certFile = '',
    caFile = ''
  }: {
    host: string;
    port?: number;
    username: string;
    accountId?: number;
    connectionToken?: string;
    password?: string;
    reconnect?: boolean;
    maxReconnect?: number;
    reconnectIntervalMs?: number;
    timeoutMs?: number;
    keyFile?: string;
    certFile?: string;
    caFile?: string;
  }): Promise<Memphis> {
    return new Promise(async (resolve, reject) => {
      this.host = this._normalizeHost(host);
      this.port = port;
      this.username = username;
      this.accountId = accountId;
      this.connectionToken = connectionToken;
      this.password = password
      this.reconnect = reconnect;
      this.maxReconnect = maxReconnect > 9 ? 9 : maxReconnect;
      this.reconnectIntervalMs = reconnectIntervalMs;
      this.timeoutMs = timeoutMs;
      let conId_username = this.connectionId + '::' + username;
      let connectionOpts
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
          return reject(
            MemphisError(new Error(`You have to connect with one of the following methods: connection token / password`))
          );
        }
        if (this.connectionToken == '' && this.password == '') {
          return reject(
            MemphisError(new Error('You have to connect with one of the following methods: connection token / password'))
          );
        }

        if (this.connectionToken != '') {
          connectionOpts['token'] = this.connectionToken
        } else {
          connectionOpts['pass'] = this.password
          connectionOpts['user'] = this.username + "$" + this.accountId
        }

        if (keyFile !== '' || certFile !== '' || caFile !== '') {
          if (keyFile === '') {
            return reject(
              MemphisError(new Error('Must provide a TLS key file'))
            );
          }
          if (certFile === '') {
            return reject(
              MemphisError(new Error('Must provide a TLS cert file'))
            );
          }
          if (caFile === '') {
            return reject(
              MemphisError(new Error('Must provide a TLS ca file'))
            );
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
          for await (const s of this.brokerManager.status()) {
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
        })().then();
        return resolve(this);
      } catch (ex) {
        return reject(MemphisError(ex));
      }
    });
  }

  private async _getBrokerManagerConnection(connectionOpts: Object): Promise<NatsConnection> {
    // for backward compatibility.
    if (connectionOpts['user'] != '') {
      const pingConnectionOpts = JSON.parse(JSON.stringify(connectionOpts)); // deep copy
      pingConnectionOpts['reconnect'] = false;
      let connection;
      try {
        connection = await broker.connect(pingConnectionOpts);
        await connection.close();
      } catch (ex) {
        if (ex.message.includes('Authorization Violation')) {
          try {
            if (connectionOpts['servers']?.includes("localhost")) // for handling bad quality networks like port fwd
              await sleep(1000);
            pingConnectionOpts['user'] = this.username;
            connection = await broker.connect(pingConnectionOpts);
            await connection.close();
            connectionOpts['user'] = this.username;
          } catch (ex) {
            throw MemphisError(ex);
          }
        } else {
          throw MemphisError(ex);
        }
      }
    }
    if (connectionOpts['servers']?.includes("localhost")) // for handling bad quality networks like port fwd
      await sleep(1000);
    return await broker.connect(connectionOpts);
  }

  private async _compileProtobufSchema(stationName: string) {
    const stationSchemaData = this.stationSchemaDataMap.get(stationName);
    const protoPathName = `${__dirname}/${stationSchemaData['schema_name']}_${stationSchemaData['active_version']['version_number']}.proto`;
    fs.writeFileSync(
      protoPathName,
      stationSchemaData['active_version']['schema_content']
    );
    const root = await protobuf.load(protoPathName);
    fs.unlinkSync(protoPathName);
    const meassageDescriptor = root.lookupType(
      `${stationSchemaData['active_version']['message_struct_name']}`
    );
    this.meassageDescriptors.set(stationName, meassageDescriptor);
  }

  private async _scemaUpdatesListener(
    stationName: string,
    schemaUpdateData: Object
  ): Promise<void> {
    try {
      const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
      let schemaUpdateSubscription =
        this.schemaUpdatesSubs.has(internalStationName);
      if (schemaUpdateSubscription) {
        this.producersPerStation.set(
          internalStationName,
          this.producersPerStation.get(internalStationName) + 1
        );
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
      const sub = this.brokerManager.subscribe(
        `$memphis_schema_updates_${internalStationName}`
      );
      this.producersPerStation.set(internalStationName, 1);
      this.schemaUpdatesSubs.set(internalStationName, sub);
      this._listenForSchemaUpdates(sub, internalStationName);
    } catch (ex) {
      throw MemphisError(ex);
    }
  }

  private _compileJsonSchema(stationName: string): any {
    const ajv = new Ajv();
    let stationSchemaData = this.stationSchemaDataMap.get(stationName);
    const schema = stationSchemaData['active_version']['schema_content'];
    const schemaObj = JSON.parse(schema);
    let validate: any;
    try {
      validate = ajv.compile(schemaObj);
      return validate;
    } catch (ex) {
      try {
        ajv.addMetaSchema(draft7MetaSchema);
        validate = ajv.compile(schemaObj);
        return validate;
      } catch (ex) {
        try {
          const ajv = new jsonSchemaDraft04();
          validate = ajv.compile(schemaObj);
          return validate;
        } catch (ex) {
          try {
            const ajv = new Ajv2020();
            validate = ajv.compile(schemaObj);
            return validate;
          } catch (ex) {
            try {
              ajv.addMetaSchema(draft6MetaSchema);
              return validate;
            } catch (ex) {
              throw MemphisError(new Error('invalid json schema'));
            }
          }
        }
      }
    }
  }

  private _compileGraphQl(stationName: string): GraphQLSchema {
    const stationSchemaData = this.stationSchemaDataMap.get(stationName);
    const schemaContent = stationSchemaData['active_version']['schema_content'];
    const graphQlSchema = buildGraphQlSchema(schemaContent);
    return graphQlSchema;
  }

  private async _listenForSchemaUpdates(
    sub: any,
    stationName: string
  ): Promise<void> {
    for await (const m of sub) {
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
        }
      } catch (ex) {
        throw MemphisError(ex);
      }
    }
  }

  private async _sdkClientUpdatesListener(): Promise<void> {
    try {
      const sub = this.brokerManager.subscribe(
        `$memphis_sdk_clients_updates`
      );
      for await (const m of sub) {
        let data = this.JSONC.decode(m._rdata);
        switch (data['type']) {
          case 'send_notification':
            this.clusterConfigurations.set(data['type'], data['update']);
            break;
          case 'schemaverse_to_dls':
            this.stationSchemaverseToDlsMap.set(
              data['station_name'],
              data['update']
            );
            break;
          case 'remove_station':
            this._unSetCachedProducerStation(data['station_name']);
            this._unSetCachedConsumerStation(data['station_name']);
          default:
            break;
        }
      }
    } catch (ex) {
      throw MemphisError(ex);
    }
  }

  public sendNotification(
    title: string,
    msg: string,
    failedMsg: any,
    type: string
  ) {
    const buf = this.JSONC.encode({
      title: title,
      msg: msg,
      type: type,
      code: failedMsg
    });
    this.brokerManager.publish('$memphis_notifications', buf);
  }

  private _normalizeHost(host: string): string {
    if (host.startsWith('http://')) return host.split('http://')[1];
    else if (host.startsWith('https://')) return host.split('https://')[1];
    else return host;
  }


  /**
   * Creates a station.
   * @param {String} name - station name.
   * @param {Memphis.retentionTypes} retentionType - retention type, default is MAX_MESSAGE_AGE_SECONDS.
   * @param {Number} retentionValue - number which represents the retention based on the retentionType, default is 604800.
   * @param {Memphis.storageTypes} storageType - persistance storage for messages of the station, default is storageTypes.DISK.
   * @param {Number} replicas - number of replicas for the messages of the data, default is 1.
   * @param {Number} idempotencyWindowMs - time frame in which idempotent messages will be tracked, happens based on message ID Defaults to 120000.
   * @param {String} schemaName - schema name.
   * @param {Boolean} sendPoisonMsgToDls - whether unacked(poison) messages (reached the max deliveries) should be sent into the DLS.
   * @param {Boolean} sendSchemaFailedMsgToDls - whether schema violation messages should be sent into the DLS.
   * @param {Boolean} tieredStorageEnabled - if true + tiered storage configured - messages hit the retention will be moved into tier 2 storage
   */
  async station({
    name,
    retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS,
    retentionValue = 604800,
    storageType = storageTypes.DISK,
    replicas = 1,
    idempotencyWindowMs = 120000,
    schemaName = '',
    sendPoisonMsgToDls = true,
    sendSchemaFailedMsgToDls = true,
    tieredStorageEnabled = false
  }: {
    name: string;
    retentionType?: string;
    retentionValue?: number;
    storageType?: string;
    replicas?: number;
    idempotencyWindowMs?: number;
    schemaName?: string;
    sendPoisonMsgToDls?: boolean;
    sendSchemaFailedMsgToDls?: boolean;
    tieredStorageEnabled?: boolean;
  }): Promise<Station> {
    try {
      if (!this.isConnectionActive) throw new Error('Connection is dead');
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
      };
      const data = this.JSONC.encode(createStationReq);
      const res = await this.brokerManager.request(
        '$memphis_station_creations',
        data
      );
      const errMsg = res.data.toString();
      if (errMsg != '') {
        throw MemphisError(new Error(errMsg));
      }
      return new Station(this, name);
    } catch (ex) {
      if (ex.message?.includes('already exists')) {
        return new Station(this, name.toLowerCase());
      }
      throw MemphisError(ex);
    }
  }

  /**
   * Attaches a schema to an existing station.
   * @param {String} name - schema name.
   * @param {String} stationName - station name to attach schema to.
   */
  async attachSchema({
    name,
    stationName
  }: {
    name: string;
    stationName: string;
  }): Promise<void> {
    try {
      if (!this.isConnectionActive) throw new Error('Connection is dead');
      if (name === '' || stationName === '') {
        throw new Error('name and station name can not be empty');
      }
      const attachSchemaReq = {
        name: name,
        station_name: stationName,
        username: this.username,
      };
      const data = this.JSONC.encode(attachSchemaReq);
      const res = await this.brokerManager.request(
        '$memphis_schema_attachments',
        data
      );
      const errMsg = res.data.toString();
      if (errMsg != '') {
        throw MemphisError(new Error(errMsg));
      }
    } catch (ex) {
      throw MemphisError(ex);
    }
  }

  /**
   * Detaches a schema from station.
   * @param {String} stationName - station name to attach schema to.
   */
  async detachSchema({ stationName }: { stationName: string }): Promise<void> {
    try {
      if (!this.isConnectionActive) throw new Error('Connection is dead');
      if (stationName === '') {
        throw new Error('station name is missing');
      }
      let detachSchemaReq = {
        station_name: stationName,
        username: this.username,
      };
      let data = this.JSONC.encode(detachSchemaReq);
      let errMsg = await this.brokerManager.request(
        '$memphis_schema_detachments',
        data
      );
      errMsg = errMsg.data.toString();
      if (errMsg != '') {
        throw MemphisError(new Error(errMsg));
      }
    } catch (ex) {
      throw MemphisError(ex);
    }
  }

  /**
   * Creates a producer.
   * @param {String} stationName - station name to produce messages into.
   * @param {String} producerName - name for the producer.
   * @param {String} genUniqueSuffix - Indicates memphis to add a unique suffix to the desired producer name.
   */
  async producer({
    stationName,
    producerName,
    genUniqueSuffix = false
  }: {
    stationName: string;
    producerName: string;
    genUniqueSuffix?: boolean;
  }): Promise<Producer> {
    try {
      if (!this.isConnectionActive)
        throw MemphisError(new Error('Connection is dead'));

      const realName = producerName.toLowerCase();
      producerName = genUniqueSuffix
        ? generateNameSuffix(`${producerName}_`)
        : producerName;
      const createProducerReq = {
        name: producerName,
        station_name: stationName,
        connection_id: this.connectionId,
        producer_type: 'application',
        req_version: 1,
        username: this.username,
      };
      const data = this.JSONC.encode(createProducerReq);
      let createRes = await this.brokerManager.request(
        '$memphis_producer_creations',
        data
      );
      createRes = this.JSONC.decode(createRes.data);
      if (createRes.error != '') {
        throw MemphisError(new Error(createRes.error));
      }
      const internal_station = stationName.replace(/\./g, '#').toLowerCase();
      this.stationSchemaverseToDlsMap.set(
        internal_station,
        createRes.schemaverse_to_dls
      );
      this.clusterConfigurations.set(
        'send_notification',
        createRes.send_notification
      );
      await this._scemaUpdatesListener(stationName, createRes.schema_update);

      const producer = new Producer(this, producerName, stationName, realName);
      this.setCachedProducer(producer);

      return producer;
    } catch (ex) {
      throw MemphisError(ex);
    }
  }

  /**
   * Creates a consumer.
   * @param {String} stationName - station name to consume messages from.
   * @param {String} consumerName - name for the consumer.
   * @param {String} consumerGroup - consumer group name, defaults to the consumer name.
   * @param {Number} pullIntervalMs - interval in miliseconds between pulls, default is 1000.
   * @param {Number} batchSize - pull batch size.
   * @param {Number} batchMaxTimeToWaitMs - max time in miliseconds to wait between pulls, defauls is 5000.
   * @param {Number} maxAckTimeMs - max time for ack a message in miliseconds, in case a message not acked in this time period the Memphis broker will resend it untill reaches the maxMsgDeliveries value
   * @param {Number} maxMsgDeliveries - max number of message deliveries, by default is 10
   * @param {String} genUniqueSuffix - Indicates memphis to add a unique suffix to the desired producer name.
   * @param {Number} startConsumeFromSequence - start consuming from a specific sequence. defaults to 1
   * @param {Number} lastMessages - consume the last N messages, defaults to -1 (all messages in the station)
   */
  async consumer({
    stationName,
    consumerName,
    consumerGroup = '',
    pullIntervalMs = 1000,
    batchSize = 10,
    batchMaxTimeToWaitMs = 5000,
    maxAckTimeMs = 30000,
    maxMsgDeliveries = 10,
    genUniqueSuffix = false,
    startConsumeFromSequence = 1,
    lastMessages = -1
  }: {
    stationName: string;
    consumerName: string;
    consumerGroup?: string;
    pullIntervalMs?: number;
    batchSize?: number;
    batchMaxTimeToWaitMs?: number;
    maxAckTimeMs?: number;
    maxMsgDeliveries?: number;
    genUniqueSuffix?: boolean;
    startConsumeFromSequence?: number;
    lastMessages?: number;
  }): Promise<Consumer> {
    try {
      if (!this.isConnectionActive) throw new Error('Connection is dead');
      if (batchSize > maxBatchSize) {
        throw MemphisError(new Error(`Batch size can not be greater than ${maxBatchSize}`));
      }
      const realName = consumerName.toLowerCase();
      consumerName = genUniqueSuffix
        ? generateNameSuffix(`${consumerName}_`)
        : consumerName;
      consumerGroup = consumerGroup || consumerName;

      if (startConsumeFromSequence <= 0) {
        throw MemphisError(
          new Error('startConsumeFromSequence has to be a positive number')
        );
      }

      if (lastMessages < -1) {
        throw MemphisError(new Error('min value for LastMessages is -1'));
      }

      if (startConsumeFromSequence > 1 && lastMessages > -1) {
        throw MemphisError(
          new Error(
            "Consumer creation options can't contain both startConsumeFromSequence and lastMessages"
          )
        );
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
        username: this.username,
      };
      const data = this.JSONC.encode(createConsumerReq);
      const res = await this.brokerManager.request(
        '$memphis_consumer_creations',
        data
      );
      const errMsg = res.data.toString();
      if (errMsg != '') {
        throw MemphisError(new Error(errMsg));
      }

      const consumer = new Consumer(
        this,
        stationName,
        consumerName,
        consumerGroup,
        pullIntervalMs,
        batchSize,
        batchMaxTimeToWaitMs,
        maxAckTimeMs,
        maxMsgDeliveries,
        startConsumeFromSequence,
        lastMessages,
        realName
      );
      this.setCachedConsumer(consumer);

      return consumer;
    } catch (ex) {
      throw MemphisError(ex);
    }
  }

  headers() {
    return new MsgHeaders();
  }

  /**
   * Produce a message.
   * @param {String} stationName - station name to produce messages into.
   * @param {String} producerName - name for the producer.
   * @param {String} genUniqueSuffix - Indicates memphis to add a unique suffix to the desired producer name.
   * @param {any} message - message to send into the station (Uint8Arrays/object/string/DocumentNode graphql).
   * @param {Number} ackWaitSec - max time in seconds to wait for an ack from memphis.
   * @param {Boolean} asyncProduce - produce operation won't wait for broker acknowledgement
   * @param {Any} headers - Message headers - javascript object or using the memphis interface for headers (memphis.headers()).
   * @param {Any} msgId - Message ID - for idempotent message production
   */
  public async produce({
    stationName,
    producerName,
    genUniqueSuffix = false,
    message,
    ackWaitSec,
    asyncProduce,
    headers,
    msgId
  }: {
    stationName: string;
    producerName: string;
    genUniqueSuffix?: boolean;
    message: any;
    ackWaitSec?: number;
    asyncProduce?: boolean;
    headers?: any;
    msgId?: string;
  }): Promise<void> {
    let producer: Producer;
    if (!this.isConnectionActive)
      throw MemphisError(
        new Error('Cant produce a message without being connected!')
      );
    const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
    const producerMapKey: string = `${internalStationName}_${producerName.toLowerCase()}`;
    producer = this.getCachedProducer(producerMapKey);
    if (producer)
      return await producer.produce({
        message,
        ackWaitSec,
        asyncProduce,
        headers,
        msgId
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
      msgId
    });
  }

  /**
   * Consume a batch of messages.
   * @param {String} stationName - station name to consume messages from.
   * @param {String} consumerName - name for the consumer.
   * @param {String} consumerGroup - consumer group name, defaults to the consumer name.
   * @param {String} genUniqueSuffix - Indicates memphis to add a unique suffix to the desired consumer name.
   * @param {Number} batchSize - pull batch size.
   * @param {Number} maxAckTimeMs - max time for ack a message in miliseconds, in case a message not acked in this time period the Memphis broker will resend it untill reaches the maxMsgDeliveries value
   * @param {Number} batchMaxTimeToWaitMs - max time in miliseconds to wait between pulls, defauls is 5000. 
   * @param {Number} maxMsgDeliveries - max number of message deliveries, by default is 10
   * @param {Number} startConsumeFromSequence - start consuming from a specific sequence. defaults to 1
   * @param {Number} lastMessages - consume the last N messages, defaults to -1 (all messages in the station)
   */
  public async fetchMessages({
    stationName,
    consumerName,
    consumerGroup = '',
    genUniqueSuffix = false,
    batchSize = 10,
    maxAckTimeMs = 30000,
    batchMaxTimeToWaitMs = 5000,
    maxMsgDeliveries = 10,
    startConsumeFromSequence = 1,
    lastMessages = -1
  }: {
    stationName: string;
    consumerName: string;
    consumerGroup?: string;
    genUniqueSuffix?: boolean;
    batchSize?: number;
    maxAckTimeMs?: number;
    batchMaxTimeToWaitMs?: number;
    maxMsgDeliveries?: number;
    startConsumeFromSequence?: number;
    lastMessages?: number;
  }): Promise<Message[]> {
    let consumer: Consumer;
    if (!this.isConnectionActive)
      throw MemphisError(
        new Error('Cant fetch messages without being connected!')
      );
    if (batchSize > maxBatchSize) {
      throw MemphisError(new Error(`Batch size can not be greater than ${maxBatchSize}`));
    }
    const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
    const consumerMapKey: string = `${internalStationName}_${consumerName.toLowerCase()}`;
    consumer = this.getCachedConsumer(consumerMapKey);
    if (consumer) return await consumer.fetch({ batchSize });

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
      lastMessages
    });
    return await consumer.fetch({ batchSize });
  }

  private getCachedProducer(key: string): Producer {
    if (key === '' || key === null) return null;
    return this.producersMap.get(key);
  }

  private setCachedProducer(producer: Producer): void {
    if (!this.getCachedProducer(producer._getProducerKey()))
      this.producersMap.set(producer._getProducerKey(), producer);
  }

  /**
   * for internal usage
   * @param producer - Producer
   */
  public _unSetCachedProducer(producer: Producer): void {
    if (!this.getCachedProducer(producer._getProducerKey()))
      this.producersMap.delete(producer._getProducerKey());
  }

  /**
   * for internal usage
   * @param producer - Producer
   */
  public _unSetCachedProducerStation(stationName: string): void {
    const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
    this.producersMap.forEach((producer, key) => {
      if (producer._getProducerStation() === internalStationName) {
        this.producersMap.delete(key);
      }
    });
  }

  private getCachedConsumer(key: string): Consumer {
    if (key === '' || key === null) return null;
    return this.consumersMap.get(key);
  }

  private setCachedConsumer(consumer: Consumer): void {
    if (!this.getCachedConsumer(consumer._getConsumerKey()))
      this.consumersMap.set(consumer._getConsumerKey(), consumer);
  }

  /**
   * for internal usage
   * @param consumer - Consumer
   */
  public _unSetCachedConsumer(consumer: Consumer): void {
    if (!this.getCachedConsumer(consumer._getConsumerKey()))
      this.consumersMap.delete(consumer._getConsumerKey());
  }

  /**
   * for internal usage
   * @param consumer - Consumer
   */
  public _unSetCachedConsumerStation(stationName: string): void {
    const internalStationName = stationName.replace(/\./g, '#').toLowerCase();
    this.consumersMap.forEach((consumer, key) => {
      if (consumer._getConsumerStation() === internalStationName) {
        this.consumersMap.delete(key);
      }
    });
  }

  /**
   * Close Memphis connection.
   */
  async close() {
    this.isConnectionActive = false;
    for (let key of this.schemaUpdatesSubs.keys()) {
      const sub = this.schemaUpdatesSubs.get(key);
      sub?.unsubscribe?.();
      this.stationSchemaDataMap.delete(key);
      this.schemaUpdatesSubs.delete(key);
      this.producersPerStation.delete(key);
      this.meassageDescriptors.delete(key);
      this.jsonSchemas.delete(key);
    }
    await sleep(500);
    await this.brokerManager?.close?.();
    this.consumeHandlers = [];
    this.producersMap = new Map<string, Producer>();
    this.consumersMap = new Map<string, Consumer>();
  }

  /**
   * Check if Memphis is connected.
   */
  isConnected() {
    return !this.brokerManager.isClosed();
  }

  public _setConsumeHandler(
    options: MemphisConsumerOptions,
    handler: (...args: any) => void,
    context: object
  ): void {
    this.consumeHandlers.push({ options, handler, context });
  }
}

@Injectable({})
export class MemphisService extends Memphis { }

export type { Memphis };
export const memphis = new Memphis();
