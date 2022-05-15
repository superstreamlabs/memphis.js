// Copyright 2021-2022 The Memphis Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const net = require('net');
const events = require('events');
const broker = require('nats');
const { v4: uuidv4 } = require('uuid');
const httpRequest = require('./httpRequest');

const retentionTypes = {
    MAX_MESSAGE_AGE_SECONDS: "message_age_sec",
    MESSAGES: "messages",
    BYTES: "bytes"
};

const storageTypes = {
    FILE: "file",
    MEMORY: "memory"
};

class Memphis {
    constructor() {
        this.isConnectionActive = false;
        this.connectionId = null;
        this.accessToken = null;
        this.host = null;
        this.managementPort = 5555;
        this.tcpPort = 6666;
        this.dataPort = 7766
        this.username = null;
        this.connectionToken = null;
        this.accessTokenTimeout = null;
        this.pingTimeout = null;
        this.client = new net.Socket();
        this.reconnectAttempts = 0;
        this.reconnect = true;
        this.maxReconnect = 3;
        this.reconnectIntervalMs = 200;
        this.timeoutMs = 15000;
        this.brokerConnection = null;
        this.brokerManager = null;

        this.client.on('error', error => {
            console.error(error);
        });

        this.client.on('close', () => {
            this.isConnectionActive = false;
            this._close();
        });
    }

    /**
        * Creates connection with Memphis. 
        * @param {String} host - memphis host.
        * @param {Number} managementPort - management port, default is 5555.
        * @param {Number} tcpPort - tcp port, default is 6666.
        * @param {Number} dataPort - data port, default is 7766 .
        * @param {String} username - user of type application.
        * @param {String} connectionToken - broker token.
        * @param {Boolean} reconnect - whether to do reconnect while connection is lost.
        * @param {Number} maxReconnect - The reconnect attempts.
        * @param {Number} reconnectIntervalMs - Interval in miliseconds between reconnect attempts.
        * @param {Number} timeoutMs - connection timeout in miliseconds.
    */
    connect({ host, managementPort = 5555, tcpPort = 6666, dataPort = 7766, username, connectionToken, reconnect = true, maxReconnect = 3, reconnectIntervalMs = 200, timeoutMs = 15000 }) {
        return new Promise((resolve, reject) => {
            this.host = this._normalizeHost(host);
            this.managementPort = managementPort;
            this.tcpPort = tcpPort;
            this.dataPort = dataPort;
            this.username = username;
            this.connectionToken = connectionToken;
            this.reconnect = reconnect;
            this.maxReconnect = maxReconnect > 9 ? 9 : maxReconnect;
            this.reconnectIntervalMs = reconnectIntervalMs;
            this.timeoutMs = timeoutMs;

            this.client.connect(this.tcpPort, this.host, () => {
                this.client.write(JSON.stringify({
                    username: username,
                    broker_creds: connectionToken,
                    connection_id: this.connectionId
                }));
                let connected = false;

                this.client.on('data', async data => {
                    try {
                        data = JSON.parse(data.toString())
                    } catch (ex) {
                        return reject(data.toString());
                    }
                    this.connectionId = data.connection_id;
                    this.accessToken = data.access_token;
                    this.isConnectionActive = true;
                    this.reconnectAttempts = 0;

                    if (data.access_token)
                        this._keepAcessTokenFresh(data.access_token_exp);

                    if (data.ping_interval_ms)
                        this._pingServer(data.ping_interval_ms);

                    if (!connected) {
                        try {
                            this.brokerManager = await broker.connect({
                                servers: `${this.host}:${this.dataPort}`,
                                reconnect: this.reconnect,
                                maxReconnectAttempts: this.reconnect ? this.maxReconnect : 0,
                                reconnectTimeWait: this.reconnectIntervalMs,
                                timeout: this.timeoutMs,
                                token: this.connectionToken
                            });

                            this.brokerConnection = this.brokerManager.jetstream();
                            connected = true;
                            return resolve();
                        } catch (ex) {
                            return reject(ex);
                        }
                    }
                });
            });

            setTimeout(() => {
                if (!reconnect || this.reconnectAttempts === maxReconnect || !this.isConnectionActive)
                    reject(new Error("Connection timeout has reached"));
            }, timeoutMs);
        });
    }

    _normalizeHost(host) {
        if (host.startsWith("http://"))
            return host.split("http://")[1];
        else if (host.startsWith("https://"))
            return host.split("https://")[1];
        else
            return host;
    }

    _keepAcessTokenFresh(expiresIn) {
        this.accessTokenTimeout = setTimeout(() => {
            if (this.isConnectionActive)
                this.client.write(JSON.stringify({
                    resend_access_token: true
                }));
        }, expiresIn)
    }

    _pingServer(interval) {
        this.pingTimeout = setTimeout(() => {
            if (this.isConnectionActive)
                this.client.write(JSON.stringify({
                    ping: true
                }));
        }, interval);
    }

    /**
        * Creates a factory. 
        * @param {String} name - factory name.
        * @param {String} description - factory description (optional).
    */
    async factory({ name, description = "" }) {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");

            const response = await httpRequest({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/factories/createFactory`,
                headers: {
                    Authorization: "Bearer " + this.accessToken
                },
                bodyParams: { name, description },
            });

            return new Factory(this, response.name);
        } catch (ex) {
            if (typeof (ex) == "string") {
                return new Factory(this, name.toLowerCase());
            }
            throw ex;
        }
    }

    /**
        * Creates a station. 
        * @param {String} name - station name.
        * @param {String} factoryName - factory name to link the station with.
        * @param {Memphis.retentionTypes} retentionType - retention type, default is MAX_MESSAGE_AGE_SECONDS.
        * @param {Number} retentionValue - number which represents the retention based on the retentionType, default is 604800.
        * @param {Memphis.storageTypes} storageType - persistance storage for messages of the station, default is storageTypes.FILE.
        * @param {Number} replicas - number of replicas for the messages of the data, default is 1.
        * @param {Boolean} dedupEnabled - whether to allow dedup mecanism, dedup happens based on message ID, default is false.
        * @param {Number} dedupWindowMs - time frame in which dedup track messages, default is 0.
    */
    async station({ name, factoryName, retentionType = retentionTypes.MAX_MESSAGE_AGE_SECONDS, retentionValue = 604800, storageType = storageTypes.FILE, replicas = 1, dedupEnabled = false, dedupWindowMs = 0 }) {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");

            const response = await httpRequest({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/stations/createStation`,
                headers: {
                    Authorization: "Bearer " + this.accessToken
                },
                bodyParams: {
                    name: name,
                    factory_name: factoryName,
                    retention_type: retentionType,
                    retention_value: retentionValue,
                    storage_type: storageType,
                    replicas: replicas,
                    dedup_enabled: dedupEnabled,
                    dedup_window_in_ms: dedupWindowMs
                },
            });

            return new Station(this, response.name);
        } catch (ex) {
            if (typeof (ex) == "string") {
                return new Station(this, name.toLowerCase());
            }
            throw ex;
        }
    }

    /**
        * Creates a producer. 
        * @param {String} stationName - station name to produce messages into.
        * @param {Number} producerName - name for the producer.
    */
    async producer({ stationName, producerName }) {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");

            await httpRequest({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/producers/createProducer`,
                headers: {
                    Authorization: "Bearer " + this.accessToken
                },
                bodyParams: {
                    name: producerName,
                    station_name: stationName,
                    connection_id: this.connectionId,
                    producer_type: "application"
                },
            });

            return new Producer(this, producerName, stationName);
        } catch (ex) {
            throw ex;
        }
    }

    /**
        * Creates a consumer. 
        * @param {String} stationName - station name to consume messages from.
        * @param {String} consumerName - name for the consumer.
        * @param {String} consumerGroup - consumer group name, default is "".
        * @param {Number} pullIntervalMs - interval in miliseconds between pulls, default is 1000.
        * @param {Number} batchSize - pull batch size.
        * @param {Number} batchMaxTimeToWaitMs - max time in miliseconds to wait between pulls, defauls is 5000.
        * @param {Number} maxAckTimeMs - max time for ack a message in miliseconds, in case a message not acked in this time period the Memphis broker will resend it
    */
    async consumer({ stationName, consumerName, consumerGroup = "", pullIntervalMs = 1000, batchSize = 10, batchMaxTimeToWaitMs = 5000, maxAckTimeMs = 30000 }) {
        try {
            if (!this.isConnectionActive)
                throw new Error("Connection is dead");

            await httpRequest({
                method: "POST",
                url: `http://${this.host}:${this.managementPort}/api/consumers/createConsumer`,
                headers: {
                    Authorization: "Bearer " + this.accessToken
                },
                bodyParams: {
                    name: consumerName,
                    station_name: stationName,
                    connection_id: this.connectionId,
                    consumer_type: "application",
                    consumers_group: consumerGroup,
                    max_ack_time_ms: maxAckTimeMs
                },
            });

            return new Consumer(this, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs);
        } catch (ex) {
            throw ex;
        }
    }

    _close() {
        if (this.reconnect && this.reconnectAttempts < this.maxReconnect) {
            this.reconnectAttempts++;
            setTimeout(async () => {
                try {
                    await this.connect({
                        host: this.host,
                        managementPort: this.managementPort,
                        tcpPort: this.tcpPort,
                        dataPort: this.dataPort,
                        username: this.username,
                        connectionToken: this.connectionToken,
                        reconnect: this.reconnect,
                        maxReconnect: this.maxReconnect,
                        reconnectIntervalMs: this.reconnectIntervalMs,
                        timeoutMs: this.timeoutMs
                    });
                    console.log("Reconnect to memphis has been succeeded");
                } catch (ex) {
                    console.error("Failed reconnect to memphis");
                    return;
                }
            }, this.reconnectIntervalMs);
        }
        else if (this.isConnectionActive) {
            this.client.removeAllListeners("data");
            this.client.removeAllListeners("error");
            this.client.removeAllListeners("close");
            this.client.destroy();
            clearTimeout(this.accessTokenTimeout);
            clearTimeout(this.pingTimeout);
            this.accessToken = null;
            this.connectionId = null;
            this.isConnectionActive = false;
            this.accessTokenTimeout = null;
            this.pingTimeout = null;
            this.reconnectAttempts = 0;
            this.brokerManager && this.brokerManager.close();
        }
    }

    /**
        * Close Memphis connection. 
    */
    close() {
        if (this.isConnectionActive) {
            this.client.removeAllListeners("data");
            this.client.removeAllListeners("error");
            this.client.removeAllListeners("close");
            this.client.destroy();
            clearTimeout(this.accessTokenTimeout);
            clearTimeout(this.pingTimeout);
            this.accessToken = null;
            this.connectionId = null;
            this.isConnectionActive = false;
            this.accessTokenTimeout = null;
            this.pingTimeout = null;
            this.reconnectAttempts = 0;
            this.brokerManager && this.brokerManager.close();
        }
    }
}

class Producer {
    constructor(connection, producerName, stationName) {
        this.connection = connection;
        this.producerName = producerName.toLowerCase();
        this.stationName = stationName.toLowerCase();
    }

    /**
        * Produces a message into a station. 
        * @param {Uint8Array} message - message to send into the station.
        * @param {Number} ackWaitSec - max time in seconds to wait for an ack from memphis.
    */
    async produce({ message, ackWaitSec = 15 }) {
        try {
            await this.connection.brokerConnection.publish(`${this.stationName}.final`, message, { msgID: uuidv4(), ackWait: ackWaitSec * 1000 * 1000 });
        } catch (ex) {
            throw ex;
        }
    }

    /**
        * Destroy the producer. 
    */
    async destroy() {
        try {
            await httpRequest({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/producers/destroyProducer`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken
                },
                bodyParams: {
                    name: this.consumerName,
                    station_name: this.stationName
                },
            });
        } catch (ex) {
            throw ex;
        }
    }
}

class Consumer {
    constructor(connection, stationName, consumerName, consumerGroup, pullIntervalMs, batchSize, batchMaxTimeToWaitMs, maxAckTimeMs) {
        this.connection = connection;
        this.stationName = stationName.toLowerCase();
        this.consumerName = consumerName.toLowerCase();
        this.consumerGroup = consumerGroup.toLowerCase();
        this.pullIntervalMs = pullIntervalMs;
        this.batchSize = batchSize;
        this.batchMaxTimeToWaitMs = batchMaxTimeToWaitMs;
        this.maxAckTimeMs = maxAckTimeMs;
        this.eventEmitter = new events.EventEmitter();
        this.pullInterval = null;

        this.connection.brokerConnection.pullSubscribe(`${this.stationName}.final`, {
            mack: true,
            config: {
                durable_name: this.consumerGroup ? this.consumerGroup : this.consumerName,
                ack_wait: this.maxAckTimeMs,
            },
        }).then(async psub => {
            psub.pull({ batch: this.batchSize, expires: this.batchMaxTimeToWaitMs });
            this.pullInvterval = setInterval(() => {
                psub.pull({ batch: this.batchSize, expires: this.batchMaxTimeToWaitMs });
            }, this.pullIntervalMs);

            for await (const m of psub) {
                this.eventEmitter.emit("message", new Message(m));
            }
        }).catch(error => this.eventEmitter.emit("error", error));
    }

    /**
        * Creates an event listener. 
        * @param {String} event - the event to listen to.
        * @param {Function} cb - a callback function.
    */
    on(event, cb) {
        this.eventEmitter.on(event, cb);
    }

    /**
        * Destroy the consumer. 
    */
    async destroy() {
        this.eventEmitter.removeAllListeners("message");
        this.eventEmitter.removeAllListeners("error");
        clearInterval(this.pullInterval);
        try {
            await httpRequest({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/consumers/destroyConsumer`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken
                },
                bodyParams: {
                    name: this.consumerName,
                    station_name: this.stationName
                },
            });
        } catch (ex) {
            throw ex;
        }
    }
}

class Message {
    constructor(message) {
        this.message = message;
    }

    /**
        * Ack a message is done processing. 
    */
    ack() {
        this.message.ack();
    }

    getData() {
        return this.message.data;
    }
}

class Factory {
    constructor(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }

    /**
        * Destroy the factory. 
    */
    async destroy() {
        try {
            await httpRequest({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/factories/removeFactory`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken
                },
                bodyParams: {
                    factory_name: this.name
                },
            });
        } catch (ex) {
            throw ex;
        }
    }
}

class Station {
    constructor(connection, name) {
        this.connection = connection;
        this.name = name.toLowerCase();
    }

    /**
       * Destroy the station. 
   */
    async destroy() {
        try {
            await httpRequest({
                method: "DELETE",
                url: `http://${this.connection.host}:${this.connection.managementPort}/api/stations/removeStation`,
                headers: {
                    Authorization: "Bearer " + this.connection.accessToken
                },
                bodyParams: {
                    station_name: this.name
                },
            });
        } catch (ex) {
            throw ex;
        }
    }
}

module.exports = new Memphis();
module.exports.retentionTypes = retentionTypes;
module.exports.storageTypes = storageTypes;
