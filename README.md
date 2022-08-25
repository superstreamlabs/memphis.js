<div align="center">
  
  ![Memphis light logo](https://github.com/memphisdev/memphis-broker/blob/staging/logo-black.png?raw=true#gh-light-mode-only)
  
</div>

<div align="center">
<h1>A powerful message broker for modern developers</h1>

<img width="750" alt="Memphis UI" src="https://user-images.githubusercontent.com/70286779/182241744-2016dc1a-c758-48ba-8666-40b883242ea9.png">


<a target="_blank" href="https://twitter.com/intent/tweet?text=Probably+The+Easiest+Message+Broker+In+The+World%21+%0D%0Ahttps%3A%2F%2Fgithub.com%2Fmemphisdev%2Fmemphis-broker+%0D%0A%0D%0A%23MemphisDev"><img src="https://user-images.githubusercontent.com/70286779/174467733-e7656c1e-cfeb-4877-a5f3-1bd4fccc8cf1.png" width="60"></a> 
</div>
 
 <p align="center">
  <a href="https://memphis-demo.glitch.me">Glitch</a> - <a href="https://sandbox.memphis.dev/" target="_blank">Sandbox</a> - <a href="https://memphis.dev/docs/">Docs</a> - <a href="https://twitter.com/Memphis_Dev">Twitter</a> - <a href="https://www.youtube.com/channel/UCVdMDLCSxXOqtgrBaRUHKKg">YouTube</a>
</p>

<p align="center">
<a href="https://discord.gg/WZpysvAeTf"><img src="https://img.shields.io/discord/963333392844328961?color=6557ff&label=discord" alt="Discord"></a> <a href=""><img src="https://img.shields.io/github/issues-closed/memphisdev/memphis-broker?color=6557ff"></a> <a href="https://github.com/memphisdev/memphis-broker/blob/master/CODE_OF_CONDUCT.md"><img src="https://img.shields.io/badge/Code%20of%20Conduct-v1.0-ff69b4.svg?color=ffc633" alt="Code Of Conduct"></a> <a href="https://github.com/memphisdev/memphis-broker/blob/master/LICENSE"><img src="https://img.shields.io/github/license/memphisdev/memphis-broker?color=ffc633" alt="License"></a> <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/memphisdev/memphis-broker?color=61dfc6"> <img src="https://img.shields.io/github/last-commit/memphisdev/memphis-broker?color=61dfc6&label=last%20commit">
</p>

**[Memphis{dev}](https://memphis.dev)** is a Go-based message broker for developers made out of devs' struggles develop around message brokers.<br>Enables devs to achieve all other message brokers' benefits in a fraction of the time.<br>
Focusing on automatic optimization, schema management, inline processing, and troubleshooting abilities. All under the same hood.
Utilizing NATS core.

## 📸 Screenshots
Dashboard             |  Station (Topic) overview|  CLI
:-------------------------:|:-------------------------:|:-------------------------:
<img width="300" alt="Dashboard" src="https://user-images.githubusercontent.com/70286779/182221769-3aa953cc-df71-4c0e-b0d2-9dd4ab83fea9.png">|<img width="300" alt="Station Overview" src="https://user-images.githubusercontent.com/70286779/182221788-0a159007-ab93-46aa-9c81-222671144a05.png">|<img src="https://user-images.githubusercontent.com/70286779/175806007-9a37e130-3e5a-4606-bdda-a71a89efae7f.png" alt="drawing" width="300"/>

## ⭐️ Why
Working with data streaming is HARD.<br>
As a developer, you need to build a dedicated pipeline per data source,<br>change the schema, individual analysis, enrich the data with other sources, it constantly crashes, it requires adaptation to different rate limits, constantly change APIs, and scale for better performance 🥵 .<br>
**It takes time and resources that you don't have.**<br><br>
Message broker is the answer. In short - It's an event-store.<br>
Message broker acts as the middleman and supports streaming architecture,<br>but then you encounter Apache Kafka and its documentation and run back to the monolith and batch jobs.<br>
Give memphis{dev} a spin before.

## 👉 Use-cases
- Async task management
- Real-time streaming pipelines
- Data ingestion
- Cloud Messaging
  - Services (microservices, service mesh)
  - Event/Data Streaming (observability, analytics, ML/AI)
- Queuing
- N:N communication patterns

## ✨ Features

**v0.3.0**

- 🚀 Fully optimized message broker in under 3 minutes
- 💻 Easy-to-use UI, CLI, and SDKs
- 📺 Data-level observability
- ☠️ Dead-Letter Queue with automatic message retransmit
- SDKs: Node.JS, Go, Python, Typescript, NestJS
- 🐳☸ Runs on your Docker or Kubernetes
- 👨‍💻 Community driven

**Roadmap**
- Embedded schema store and transformation
- Inline processing
- Connectors and analysis functions

## Installation

```sh
$ npm install memphis-dev
```

## Importing

for javascript, you can choose to use the import or required keyword

```js
const memphis = require("memphis-dev");

/*------for Typescript, use the import keyword to aid for typechecking assistance----------*/

import memphis from "memphis-dev";

/* To leverage Nestjs dependency injection feature */
import { Module } from "@nestjs/common";
import { MemphisModule, MemphisService } from "memphis-dev/nest";
```

### Connecting to Memphis

First, we need to connect with Memphis by using `memphis.connect`.

```js
/* Javascript and typescript project */
await memphis.connect({
            host: "<memphis-host>",
            port: <management-port>, // defaults to 6666
            username: "<username>", // (root/application type user)
            connectionToken: "<broker-token>", // you will get it on application type user creation
            reconnect: true, // defaults to true
            maxReconnect: 3, // defaults to 3
            reconnectIntervalMs: 1500, // defaults to 1500
            timeoutMs: 1500 // defaults to 1500
      });

/* Nest injection */

@Module({
    imports: [MemphisModule.register()],
})

class ConsumerModule {
    constructor(private memphis: MemphisService) {}

    startConnection() {
        (async function () {
            try {
                await this.memphis.connect({
                    host: "<memphis-host>",
                    username: "<application type username>",
                    connectionToken: "<broker-token>",
                });
            } catch (ex) {
                console.log(ex);
                this.memphis.close();
            }
        })();
    }
}
```

Once connected, the entire functionalities offered by Memphis are available.

### Disconnecting from Memphis

To disconnect from Memphis, call `close()` on the memphis object.

```js
memphisConnection.close();
```

### Creating a Factory

```js
const factory = await memphisConnection.factory({
            name: "<factory-name>",
            description: ""
      });

@Module({
    imports: [MemphisModule.register()],
})

class factoryModule {
    constructor(private memphis: MemphisService) { }

    createFactory() {
        (async function () {
                  await this.memphis.factory({
                              name: "<factory-name>",
                              description: ""
                  });
        })();
    }
}
```

### Destroying a Factory

Destroying a factory will remove all its resources (stations/producers/consumers)

```js
await factory.destroy();
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
  dedupWindowMs: 0, // defaults to 0
});

/* Creating a station with Nestjs dependency injection */

@Module({
    imports: [MemphisModule.register()],
})

class stationModule {
    constructor(private memphis: MemphisService) { }

    createStation() {
        (async function () {
                  const station = await this.memphis.station({
                        name: "<station-name>",
                        factoryName: "<factory-name>",
                        retentionType: memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS, //                  defaults to memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS
                        retentionValue: 604800, // defaults to 604800
                        storageType: memphis.storageTypes.FILE, // defaults to memphis.              storageTypes.FILE
                        replicas: 1, // defaults to 1
                        dedupEnabled: false, // defaults to false
                        dedupWindowMs: 0, // defaults to 0
                  });
        })();
    }
}
```

### Retention types

Memphis currently supports the following types of retention:

```js
memphis.retentionTypes.MAX_MESSAGE_AGE_SECONDS;
```

Means that every message persists for the value set in retention value field (in seconds)

```js
memphis.retentionTypes.MESSAGES;
```

Means that after max amount of saved messages (set in retention value), the oldest messages will be deleted

```js
memphis.retentionTypes.BYTES;
```

Means that after max amount of saved bytes (set in retention value), the oldest messages will be deleted

### Storage types

Memphis currently supports the following types of messages storage:

```js
memphis.storageTypes.FILE;
```

Means that messages persist on the file system

```js
memphis.storageTypes.MEMORY;
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
const producer = await memphisConnection.producer({
            stationName: "<station-name>",
            producerName: "<producer-name>"
      });

/* Creating producers with nestjs dependecy injection */

@Module({
    imports: [MemphisModule.register()],
})

class ProducerModule {
    constructor(private memphis: MemphisService) { }

    createProducer() {
        (async function () {
                const producer = await this.memphis.producer({
                    stationName: "<station-name>",
                    producerName: "<producer-name>"
                });
        })();
    }
}
```

### Producing a message

```js
await producer.produce({
  message: "<bytes array>", // Uint8Arrays
  ackWaitSec: 15, // defaults to 15
});
```

### Destroying a Producer

```js
await producer.destroy();
```

### Creating a Consumer

```js
const consumer = await memphisConnection.consumer({
            stationName: "<station-name>",
            consumerName: "<consumer-name>",
            consumerGroup: "<group-name>", // defaults to the consumer name.
            pullIntervalMs: 1000, // defaults to 1000
            batchSize: 10, // defaults to 10
            batchMaxTimeToWaitMs: 5000, // defaults to 5000
            maxAckTimeMs: 30000 // defaults to 30000
            maxMsgDeliveries: 10 // defaults to 10
      });

/* Creating consumers with nestjs dependecy injection */

@Module({
    imports: [MemphisModule.register()],
})
class ConsumerModule {
    constructor(private memphis: MemphisService) {}

    createConsumer() {
        (async function () {
                const consumer = await this.memphis.consumer({
                    stationName: "<station-name>",
                    consumerName: "<consumer-name>",
                    consumerGroup: "",
                });
        })();
    }
}
```

### Processing messages

```js
consumer.on("message", (message) => {
  // processing
  console.log(message.getData());
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
consumer.on("error", (error) => {
  // error handling
});
```

### Destroying a Consumer

```js
await consumer.destroy();
```
