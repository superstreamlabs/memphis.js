import { AckPolicy, Consumer, ConsumerInfo, Empty, JetStreamClient, NatsConnection, PubAck, StreamConfig, nanos, nuid } from 'nats';


export async function initStream(connection: NatsConnection, stream: string, opts: Partial<StreamConfig> = {}): Promise<{ stream: string; subj: string }> {
    const jsm = await connection.jetstreamManager();
    const subj = `${stream}.A`;
    const sc = Object.assign({ name: stream, subjects: [subj] }, opts);
    await jsm.streams.add(sc);
    return { stream, subj };
}

export async function createConsumer(connection: NatsConnection, stream: string) {
    const jsm = await connection.jetstreamManager();
    const ci = await jsm.consumers.add(stream, {
        name: nuid.next(),
        inactive_threshold: nanos(2 * 60 * 1000),
        ack_policy: AckPolicy.Explicit,
    });

    return ci;
}



export type FillOptions = {
    randomize: boolean;
    suffixes: string[];
    payload: number;
};

export function fill(connection: NatsConnection, prefix: string, count = 100, opts: Partial<FillOptions> = {}): Promise<PubAck[]> {
    const js = connection.jetstream();
    const options = Object.assign({}, {
        randomize: false,
        suffixes: "abcdefghijklmnopqrstuvwxyz".split(""),
        payload: 0,
    }, opts) as FillOptions;

    function randomSuffix(): string {
        const idx = Math.floor(Math.random() * options.suffixes.length);
        return options.suffixes[idx];
    }

    const payload = options.payload === 0 ? Empty : new Uint8Array(options.payload);

    const a = Array.from({ length: count }, (_, idx) => {
        const subj = opts.randomize
            ? `${prefix}.${randomSuffix()}`
            : `${prefix}.${options.suffixes[idx % options.suffixes.length]}`;
        return js.publish(subj, payload);
    });

    return Promise.all(a);
}


async function setupStreamAndConsumer(connection: NatsConnection,stream: string,messages = 100){
    await initStream(connection, stream, { subjects: [`${stream}.*`] });
    await fill(connection, stream, messages, { randomize: true });
    const consumer = await createConsumer(connection, stream);

    return consumer
}

async function getExistingJsConsumer(jsc: JetStreamClient, streamName: string, durable: string) {
    return await jsc.consumers.get(streamName, durable);
}

type Result = {
    errors?: Error[],
    consumer?: Consumer,
    consumerinfo?: ConsumerInfo,
}

export async function getJetStreamConsumer(connection: NatsConnection, jsc: JetStreamClient, streamName: string, durable: string) {
    let result: Result = {}  
    try
    {
        result.consumer = await getExistingJsConsumer(jsc, streamName, durable);
        return result;
    }
    catch (err) {
        result.errors = [err];
    }

    try
    {
        result.consumerinfo = await setupStreamAndConsumer(connection, streamName);
        return result;
    }
    catch (err) {
        result.errors = [...result.errors, err];
    }

    return result;
}