![](https://memphis-public-files.s3.eu-central-1.amazonaws.com/Vector_page-0001.jpg)
<br><br>
![Github tag](https://img.shields.io/github/v/release/memphisdev/memphis.js) [![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/Memphisdev/memphis-broker/commit-activity) [![GoReportCard example](https://goreportcard.com/badge/github.com/nanomsg/mangos)](https://goreportcard.com/report/github.com/nanomsg/mangos)

Too many data sources and too many schemas? Looking for a messaging queue to scale your data-driven architecture? Require greater performance for your data streams? Your architecture is based on post-processing data, and you want to switch to real-time in minutes instead of months? Struggle to install, configure and update Kafka/RabbitMQ/and other MQs?

**Meet Memphis**

**[Memphis](https://memphis.dev)** is a dev-first, cloud-native, event processing platform made out of devs' struggles with tools like Kafka, RabbitMQ, NATS, and others, allowing you to achieve all other message brokers' benefits in a fraction of the time.<br><br>
**[Memphis](https://memphis.dev) delivers:**
- The most simple to use Message Broker (With the same behaivour as NATS and Kafka)
- State-of-the-art UI and CLI
- No need for Kafka Connect, Kafka Streams, ksql. All the tools you need are under the same roof
- An in-line data processing in any programming language
- Out-of-the-box deep observability of every component

RabbitMQ has Queues, Kafka as Topics, **Memphis has Stations.**
#### TL;DR
**On Day 1 (For the DevOps heros out there) -**<br>
Memphis platform provides the same old and loved behavior (Produce-Consume) of other data lakes and MQs, but removes completly the complexity barriers, messy documentation, ops, manual scale, orchestration and more.

**On Day 2 (For the Developers) -**
Developer lives with developing real-time, event-driven apps that are too complex.
Consumers and Producers are filled with logic, data orchestration is needed between the different services, no GUI to understand metrics and flows, lack of monitoring, hard to implement SDKs, etc.

No More.

In the coming versions, Memphis will answer the challenges above,<br>and recude 90% of dev work arround building a real-time / event-driven / data-driven apps.

---

**Purpose of this repo**<br>
For Memphis node.js SDK

**Table of Contents**

- [Current SDKs](#current-sdks)
- [Installation](#installation)
- [Importing](#importing)
  - [Connecting to Memphis](#connecting-to-memphis)
  - [Disconnecting from Memphis](#disconnecting-from-memphis)
  - [Creating a Factory](#creating-a-factory)
  - [Destroying a Factory](#destroying-a-factory)
  - [Creating a Station](#creating-a-station)
  - [Retention types](#retention-types)
  - [Storage types](#storage-types)
  - [Destroying a Station](#destroying-a-station)
  - [Produce and Consume messages](#produce-and-consume-messages)
  - [Creating a Producer](#creating-a-producer)
  - [Producing a message](#producing-a-message)
  - [Destroying a Producer](#destroying-a-producer)
  - [Creating a Consumer](#creating-a-consumer)
  - [Processing messages](#processing-messages)
  - [Acknowledge a message](#acknowledge-a-message)
  - [Catching async errors](#catching-async-errors)
  - [Destroying a Consumer](#destroying-a-consumer)
- [Memphis Contributors](#memphis-contributors)
- [Contribution guidelines](#contribution-guidelines)
- [Documentation](#documentation)
- [Contact](#contact)

## Current SDKs
- [memphis-js](https://github.com/Memphisdev/memphis.js "Node.js")

## Installation

First install [Memphis](https://memphis.dev) Then:

```sh
$ npm install memphis-dev
```

## Importing

```js
const memphis = require("memphis-dev");
```

### Connecting to Memphis

First, we need to connect with Memphis by using `memphis.connect`.

```js
await memphis.connect({
            host: "<memphis-host>",
            managementPort: <management-port>, // defaults to 5555
            tcpPort: <tcp-port>, // defaults to 6666
            dataPort: <data-port>, // defaults to 7766
            username: "<username>", // (root/application type user)
            connectionToken: "<broker-token>", // you will get it on application type user creation
            reconnect: true, // defaults to false
            maxReconnect: 10, // defaults to 10
            reconnectIntervalMs: 1500, // defaults to 1500
            timeoutMs: 1500 // defaults to 1500
      });
```

Once connected, the entire functionalities offered by Memphis are available.

### Disconnecting from Memphis

To disconnect from Memphis, call `close()` on the memphis object.

```js
memphis.close();
```

### Creating a Factory

```js
const factory = await memphis.factory({
            name: "<factory-name>",
            description: ""
      });
```

### Destroying a Factory
Destroying a factory will remove all its resources (stations/producers/consumers)

```js
await station.destroy();
```

### Creating a Station

```js
const station = await memphis.station({
            name: "<station-name>",
            factoryName: "<factory-name>",
            retentionType: memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS, // defaults to memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS
            retentionValue: 604800, // defaults to 604800
            storageType: memphis.storageTypes.FILE, // defaults to memphis.storageTypes.FILE
            replicas: 1, // defaults to 1
            dedupEnabled: false, // defaults to false
            dedupWindowMs: 0 // defaults to 0
      });
```

### Retention types

Memphis currently supports the following types of retention:

```js
memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS
```
Means that every message persists for the value set in retention value field (in seconds)

```js
memphis.retentionTypes.MESSAGES
```
Means that after max amount of saved messages (set in retention value), the oldest messages will be deleted

```js
memphis.retentionTypes.BYTES
```
Means that after max amount of saved bytes (set in retention value), the oldest messages will be deleted

### Storage types

Memphis currently supports the following types of messages storage:

```js
memphis.storageTypes.FILE
```
Means that messages persist on the file system

```js
memphis.storageTypes.MEMORY
```
Means that messages persist on the main memory




### Destroying a Station
Destroying a station will remove all its resources (producers/consumers)

```js
await station.destroy();
```

### Produce and Consume messages

The most common client operations are `produce` to send messages and `consume` to
receive messages.

Messages are published to a station and consumed from it by creating a consumer.
Consumers are pull based and consume all the messages in a station unless you are using a consumers group, in this case messages are spread across all members in this group.

Memphis messages are payload agnostic. Payloads are `Uint8Arrays`.

In order to stop getting messages, you have to call `consumer.destroy()`. Destroy will terminate regardless
of whether there are messages in flight for the client.

### Creating a Producer

```js
const producer = await memphis.producer({
            stationName: "<station-name>",
            producerName: "<producer-name>"
      });
```

### Producing a message

```js
await producer.produce({
            message: "<bytes array>", // Uint8Arrays
            ackWaitSec: 15 // defaults to 15
});
```

### Destroying a Producer

```js
await producer.destroy();
```

### Creating a Consumer

```js
const consumer = await memphis.consumer({
            stationName: "<station-name>",
            consumerName: "<consumer-name>",
            consumerGroup: "<group-name>", // defaults to ""
            pullIntervalMs: 1000, // defaults to 1000
            batchSize: 10, // defaults to 10
            batchMaxTimeToWaitMs: 5000, // defaults to 5000
            maxAckTimeMs: 30000 // defaults to 30000
      });
```

### Processing messages

```js
consumer.on("message", message => {
        // processing
        console.log(message.getData())
        message.ack();
});
```

### Acknowledge a message
Acknowledge a message indicates the Memphis server to not re-send the same message again to the same consumer / consumers group
```js
    message.ack();
```

### Catching async errors

```js
consumer.on("error", error => {
        // error handling
});
```

### Destroying a Consumer

```js
await consumer.destroy();
```


## Memphis Contributors
<img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Alon+Avrahami.jpg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"> <img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Ariel+Bar.jpeg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"> <img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Arjun+Anjaria.jpeg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"> <img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Carlos+Gasperi.jpeg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"> <img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Daniel+Eliyahu.jpeg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"> <img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Itay+Katz.jpeg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"> <img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Jim+Doty.jpeg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"> <img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Nikita+Aizenberg.jpg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"> <img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Rado+Marina.jpg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"><img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Raghav+Ramesh.jpg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"> <img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Tal+Goldberg.jpg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;"> <img src="https://memphis-public-files.s3.eu-central-1.amazonaws.com/contributors-images/Yehuda+Mizrahi.jpeg" width="60" height="60" style="border-radius: 25px; border: 2px solid #61DFC6;">

## Contribution guidelines

soon

## Documentation

- [Official documentation](https://docs.memphis.dev)

## Contact 
- [Slack](https://bit.ly/37uwCPd): Q&A, Help, Feature requests, and more
- [Twitter](https://bit.ly/3xzkxTx): Follow us on Twitter!
- [Discord](https://bit.ly/3OfnuhX): Join our Discord Server!
- [Medium](https://bit.ly/3ryFDgS): Follow our Medium page!
- [Youtube](https://bit.ly/38Y8rcq): Subscribe our youtube channel!
