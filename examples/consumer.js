const memphis = require("memphis-dev");

(async function () {
  let memphisConnection

  try {
    memphisConnection = await memphis.connect({
      host: "localhost",
      username: "root",
      connectionToken: "memphis",
    });

    const consumer = await memphisConnection.consumer({
      stationName: "someStations",
      consumerName: "jay_boy",
      consumerGroup: "",
    });

    consumer.on("message", (message) => {
      console.log(message.getData().toString());
      message.ack();
    });

    consumer.on("error", (error) => { });
  } catch (ex) {
    console.log(ex);
    if (memphisConnection)
      memphisConnection.close();
  }
})();
