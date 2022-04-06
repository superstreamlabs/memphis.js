// const { connect, StringCodec, consumerOpts, AckPolicy, createInbox } = require("nats");
// const sc = StringCodec();

//Receive all consumers
// ______________________
// connect({ servers: "demo.nats.io:4222" })
//     .then(nc => {
//         nc.jetstreamManager()
//             .then(jsm => {
//                 jsm.consumers.list("memphis").next().then(consumers => {
//                     consumers.forEach((ci) => {
//                         console.log(ci);
//                     });

//                 })
//             })
//     })



// Retrieve a consumer's configuration
// ______________________
// connect({ servers: "demo.nats.io:4222" })
//     .then(nc => {
//         nc.jetstreamManager()
//             .then(jsm => {
//                 jsm.consumers.info("memphis", "mem")
//                     .then(ci => {
//                         console.log(ci);;
//                     })
//             })
//     })


// Receive my stream
// ______________________
// connect({ servers: "demo.nats.io:4222" })
//     .then(nc => {
//         nc.jetstreamManager()
//             .then(jsm => {
//                 jsm.streams.find("memphis.*")
//                     .then(name => {
//                         jsm.streams.info(name)
//                             .then(si => console.log(si))
//                     })
//             })
//     })


// Create consumer
// ______________________
// connect({ servers: "demo.nats.io:4222" })
//     .then(nc => {
//         nc.jetstreamManager()
//             .then(jsm => {
//                 jsm.consumers.add('memphis', {
//                     durable_name: "mem",
//                     ack_policy: AckPolicy.Explicit,
//                 })
//                     .then(res => console.log(res))
//             })
//     })


//Queue group
// ______________________
// connect({ servers: "demo.nats.io:4222" })
//     .then(nc => {
//         const js = nc.jetstream()
//         const opts = consumerOpts();
//         // opts.durable("mem_new");
//         // opts.manualAck();
//         // opts.ackExplicit();
//         opts.deliverTo(createInbox())
//         opts.queue("consumer_queue");        
//         opts.callback((_err, m) => {
//         if (m) {
//             m.ack();
//         }
//         });
//         // js.publish("memphis.1", sc.encode("hello"))
//         //     .then(res => console.log(res))


//         js.subscribe("memphis.1", opts)
//             .then(sub=>console.log(sub))
//         js.subscribe("memphis.1", opts)
//             .then(sub2=>console.log(sub2))

//     })


//Publish message
// ______________________
// const sc = StringCodec();
// connect({ servers: "demo.nats.io:4222" })
//     .then(nc => {
//         const js = nc.jetstream()
//         for(let i=1;i<20; i++){
//             console.log(i)
//             js.publish("memphis.1", sc.encode(`hello ${i}`))
//                 .then(res => console.log(res))
//         }
//     })
//*****************************************************//
