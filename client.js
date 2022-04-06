// This is demo of the client

const strech = require('./index');

const connectionDetails = {
    serverUrl: "demo.nats.io:4222"
}

// const dataTypes = strech.dataTypes
const retentionTypes = strech.retentionTypes
const throughputType = strech.throughputType

strech.connect(connectionDetails)
    .then(conn => {
        // //Need to refactor
        // conn.addApplication("myApp", "mydesc")
        //     .then(res => console.log(res))
        //     .catch(error => {
        //         console.error(error)
        //     })

        const factoryDetails = {
            application: 'myApp',
            retentionType: retentionTypes.SIZE,
            retentionValue: 2000,
            throughputType: throughputType.MESSAGES,
            maxThroughput: 7000
        }

        const myFactory = conn.factory("factoryName", factoryDetails)

        myFactory.add()
            .then(res => console.log(res))
            .catch(error => {
                console.error(error)
            })

        myFactory.remove()
            .then(res => console.log(res))
            .catch(error => {
                console.error(error)
            })


        const editDetails = {}
        myFactory.edit(editDetails)
            .then(res => console.log(res))
            .catch(error => {
                console.error(error)
            })

        const fancDetails = {}
        myFactory.addFunction(fancDetails, 1)
            .then(res => console.log(res))
            .catch(error => {
                console.error(error)
            })

        myFactory.editFunction(fancDetails, 1)
            .then(res => console.log(res))
            .catch(error => {
                console.error(error)
            })

        myFactory.removeFunction(5)
            .then(res => console.log(res))
            .catch(error => {
                console.error(error)
            })


        // const producerStrechOptions = {
        //     dataType: dataTypes.JSON
        // }

        // const producerStrech = conn.producer("memphis")
        // // producerStrech.publish({ myMsg: "myMsg to 1" })
        // producerStrech.publish( "myMsg to 1" )
        //     .then(res => console.log(res))
        //     .catch(error => {
        //         console.error(error)
        //     })



        // Notice that consumer1 will receive all the messages from the factory and consumer2 and consumer3 will split the messages.
        // const consumer1 = conn.consumer("memphis", "consumer_1")
        // consumer1.on("message", (msg) => {
        //     console.log(`msg consumer_1: ${msg}`)
        // })

        // const consumer2 = conn.consumer("memphis", "consumer_2")
        // consumer2.on("message", (msg) => {
        //     console.log(`msg consumer_2: ${msg}`)
        // })
        // const consumer3 = conn.consumer("memphis", "consumer_2")
        // consumer3.on("message", (msg) => {
        //     console.log(`msg consumer_3: ${msg}`)
        // })

        // conn.close()
        // .catch(err => {
        //     console.log(`error closing:`, err);
        // })
    })
    .catch(err => {
        console.log(`error connecting: ${err}`)
    })
