import { Serializer, Deserializer } from '@nestjs/microservices';

export interface FayeOptions {
    /**
     * faye server mount point (e.g., http://localhost:8000/faye)
     */
    url?: string;
    connect: {
        host: string;
        port?: number;
        username: string;
        connectionToken: string;
        reconnect?: boolean;
        maxReconnect?: number;
        reconnectIntervalMs?: number;
        timeoutMs?: number;
    };
    consumer: {
        stationName: string;
        consumerName: string;
        consumerGroup: string;
        pullIntervalMs?: number;
        batchSize?: number;
        batchMaxTimeToWaitMs?: number;
        maxAckTimeMs?: number;
        maxMsgDeliveries?: number;
    };
    producer: { stationName: string; producerName: string };
    /**
     * time in seconds to wait before assuming server is dead and attempting reconnect
     */
    timeout?: number;
    /**
     * time in seconds before attempting a resend a message when network error detected
     */
    retry?: number;
    /**
     * connections to server routed via proxy
     */
    proxy?: string;
    /**
     * per-transport endpoint objects; e.g., endpoints: { sebsocket: 'http://ws.example.com./'}
     */
    endpoints?: any;
    /**
     * backoff scheduler: see https://faye.jcoglan.com/browser/dispatch.html
     */
    // tslint:disable-next-line: ban-types
    scheduler?: Function;
    /**
     * instance of a class implementing the serialize method
     */
    serializer?: Serializer;
    /**
     * instance of a class implementing the deserialize method
     */
    deserializer?: Deserializer;
}
