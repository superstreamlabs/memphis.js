import * as broker from 'nats';
import { Memphis } from '.';
export declare class Producer {
    private connection;
    private producerName;
    private stationName;
    private stationNames;
    private isMultiStationProducer;
    private internalStation;
    private realName;
    private station;
    private partitionsGenerator;
    constructor(connection: Memphis, producerName: string, stationName: string | string[], realName: string, partitions: number[]);
    _handleHeaders(headers: any): broker.MsgHdrs;
    produce({ message, ackWaitSec, asyncProduce, headers, msgId, producerPartitionKey, producerPartitionNumber }: {
        message: any;
        ackWaitSec?: number;
        asyncProduce?: boolean;
        headers?: any;
        msgId?: string;
        producerPartitionKey?: string;
        producerPartitionNumber?: number;
    }): Promise<void>;
    private _singleStationProduce;
    private _multiStationProduce;
    private _hanldeProduceError;
    destroy(timeoutRetry?: number): Promise<void>;
    private _destroySingleStationProducer;
    private _destroyMultiStationProducer;
    _getProducerKey(): string;
    _getProducerStation(): string;
}
