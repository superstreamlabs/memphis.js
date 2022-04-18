![](https://memphis-public-files.s3.eu-central-1.amazonaws.com/Vector_page-0001.jpg)

**[Memphis](https://memphis.dev)** is a dev-first, cloud-native, event-processing platform made out of devs' struggles with tools like Kafka, RabbitMQ, NATS, and others, allowing you to achieve all other message brokers' benefits in a fraction of the time.<br><br>
**[Memphis](https://memphis.dev) delivers:**
- The most simple to use Message Broker (Such as NATS,  Kafka, RabbitMQ)
- State-of-the-art UI and CLI
- No need for Kafka Connect, Kafka Streams, ksql. All the tools you need under the same roof
- An in-line data processing in any programming language
- Out-of-the-box deep observability of every component 

# Install Memphis on K8S

# Install Memphis on your laptop with Docker Compose


# documentation

- [Official documentation](https://docs.memphis.dev)

# Currently available SDKs 

- [Node.js](https://github.com/Memphis-OS/memphis.js)

## Installation

First install [Memphis](https://memphis.dev) Then:

```sh
$ npm install memphisos
```

## Importing

```js
const memphis = require("memphisos");
```

### Connecting to Memphis

First, we need to connect with Memphis by using `memphis.connect`.

```js
await memphis.connect({
            host: "<control-plane-host>",
            port: <control-plane-port>, // defaults to 6666
            brokerHost: "<broker-host>",
            brokerPort: <broker-port>, // defaults to 7766
            username: "<username>", // (application type user)
            connectionToken: "<broker-token>", // you will get it on application type user creation
            reconnect: true, // defaults to false
            maxReconnect: 10, // defaults to 10
            reconnectIntervalMs: 1500, // defaults to 1500
            timeoutMs: 1500 // defaults to 1500
      });
```

Once connected, the entire functionalities offered by Memphis is available.

### Discoonnecting from Memphis

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
            dedupEnabled: false, // defaults to  false
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
            batchMaxTimeToWaitMs: 5000 // defaults to 5000
      });
```

### Processing messages

```js
consumer.on("message", message => {
        // processing
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

# Contact 
- [Slack](https://bit.ly/37eXzGo): Join our Slack Channel!
- [Discord](https://discord.gg/WZpysvAeTf): Join our Discord Server!
- [Twitter](https://https://twitter.com/MemphisPlatform): Follow us on Twitter!
- [Medium](https://medium.com/memphis-dev): Follow our Medium page!
- [Youtube](https://www.youtube.com/channel/UCVdMDLCSxXOqtgrBaRUHKKg): Subscribe our youtube channel!


# Contribution guidelines

- [contributing guide]()



