
const { connect, StringCodec, consumerOpts, AckPolicy, createInbox } = require("nats");
const sc = StringCodec();

function Strech(serverUrl) {
    this.servers = serverUrl
}

function Connection(conn) {
    this.nc = conn
}

/**
 * Creates producer to specific factory. 
 * @param {String} factoryName - The name of the factory.
 * @returns {Object} Returns producer object assigned to the factory.
 */
Connection.prototype.producer = function (stream) {
    const producer = new Producer(this.nc, stream, "1")
    // const producer = new Producer(this.nc, stream, "mem")
    return producer
};

/**
 * Creates consumer to specific factory. 
 * @param {String} factoryName - The name of the factory.
 * @param {String} horizontalScalingGroup - Name of the consumer that ables to scale and share messages within multiple subscribers.
 * @returns {Object} Returns consumer object assigned to the factory.
 */
Connection.prototype.consumer = function (stream, dn) {
    // const consumer = new Consumer(this.nc, stream, "final")
    const consumer = new Consumer(this.nc, stream, "1", dn)
    return consumer
};

/**
 * Disconnect from server. 
 */
Connection.prototype.disconnect = function () {
    // console.log(this.nc.close())
    return this.nc.close()
};

/**
 * Creates consumer to specific factory. 
 * @param {String} factoryName - The name of the factory.
 * @param {String} horizontalScalingGroup - Name of the consumer that ables to scale and share messages within multiple subscribers.
 * @returns {Object} Returns consumer object assigned to the factory.
 */
Connection.prototype.addApplication = function (name, desc) {
    return //Use endpoint of Memphis
    // .then((res) => {
    //     return Promise.resolve(res)
    // })
    // .catch((error) => {
    //     return Promise.reject(error)
    // })
};

/**
 * Creates factory object. 
 * @param {String} factoryName - The name of the factory.
 * @param {Object} factoryDetails - Object contains the details of the factory:
 *  {
 *      @param {Number} retentionType [TIME: 0, SIZE: 1, CONSUMED: 2],
        @param {String} retentionValue,
        @param {Number} throughputType [MESSAGES: 0, BYTES: 1],
        @param {Number} maxThroughput,
    }      
 * @returns {Object} Returns factory object. Note that this object is not yet created!
 */
Connection.prototype.factory = function (factoryName, factoryDetails) {
    const factory = new Factory(factoryName, factoryDetails)
    return factory
};

function Factory(name, factoryDetails) {
    this.name = name
    this.factoryDetails = factoryDetails
}

Factory.prototype.add = function () {
    return //Use endpoint of Memphis
    // .then((myPublisher) => {
    //     return Promise.resolve(myPublisher)
    // })
    // .catch((error) => {
    //     return Promise.reject(error)
    // })
};


Factory.prototype.remove = function () {
    return //Use endpoint of Memphis
    // .then((myPublisher) => {
    //     return Promise.resolve(myPublisher)
    // })
    // .catch((error) => {
    //     return Promise.reject(error)
    // })
};


Factory.prototype.edit = function (editDetails) {
    return //Use endpoint of Memphis
    // .then((myPublisher) => {
    //     return Promise.resolve(myPublisher)
    // })
    // .catch((error) => {
    //     return Promise.reject(error)
    // })
};


Factory.prototype.addFunction = function (fancDetails, funcLocation = null) {
    return //Use endpoint of Memphis
    // .then((myPublisher) => {
    //     return Promise.resolve(myPublisher)
    // })
    // .catch((error) => {
    //     return Promise.reject(error)
    // })
};

Factory.prototype.editFunction = function (fancDetails, funcLocation) {
    return //Use endpoint of Memphis
    // .then((myPublisher) => {
    //     return Promise.resolve(myPublisher)
    // })
    // .catch((error) => {
    //     return Promise.reject(error)
    // })
};

Factory.prototype.removeFunction = function (funcLocation) {
    return //Use endpoint of Memphis
    // .then((myPublisher) => {
    //     return Promise.resolve(myPublisher)
    // })
    // .catch((error) => {
    //     return Promise.reject(error)
    // })
};



function Producer(nc, stream, subject) {
    this.nc = nc
    this.stream = stream
    this.subject = subject
}

Producer.prototype.publish = function (msg) {
    const js = this.nc.jetstream();
    return js.publish(`${this.stream}.${this.subject}`, sc.encode(msg))
        .then((myPublisher) => {
            return Promise.resolve(myPublisher)
        })
        .catch((error) => {
            return Promise.reject(error)
        })
};


function Consumer(nc, stream, subject, dn) {
    this.nc = nc
    this.stream = stream
    this.subject = subject
    this.durable_name = dn
}

/**
 * Receive a message with a consumer which assigend to specific factory.
 * @param {String} on - specific event: ["message"]
 * @param {Function} func - the function which deals with the event
 */
Consumer.prototype.on = function (action, func) {
    const js = this.nc.jetstream();
    switch (action) {
        case "message":
            setInterval(() => {
                js.pullSubscribe(`${this.stream}.${this.subject}`, { config: { durable_name: this.durable_name } })
                    .then((psub) => {
                        (async () => {
                            for await (const m of psub) {
                                // console.log(`${m.info.stream}[${m.seq}] Data: ${sc.decode(m.data)}`);
                                m.ack();
                                return func(sc.decode(m.data))
                            }
                        })();
                        // To start receiving messages you pull the subscription
                        psub.pull({ batch: 1, expires: 10000 });
                    })
                    .catch((error) => {
                        console.error(error)
                    })
            }, 1);
            break;
        default:
        // code block
    }
};


// /**
// * Connection ready state
// *
// * - 0 = disconnected
// * - 1 = connected
// * - 2 = connecting
// * - 3 = disconnecting
// * - 99 = uninitialized
// */


exports.connect = function (connectionDetails) {
    const strech = new Strech(connectionDetails.serverUrl)
    const conn = connect({ servers: strech.servers })
        .then((nc) => {
            const conn = new Connection(nc)
            return conn
        })
        .catch((error) => {
            console.error(error)
            return Promise.reject(error)
        })
    return conn
}


exports.dataTypes = {
    JSON: "Json",
    STRING: "String"
}

exports.retentionTypes = {
    TIME: 0,
    SIZE: 1,
    CONSUMED: 2
}

exports.throughputType = {
    MESSAGES: 0,
    BYTES: 1,
}
