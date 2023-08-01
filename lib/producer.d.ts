import * as broker from 'nats';
import { Memphis } from '.';
export declare class Producer {
    private connection;
    private producerName;
    private stationName;
    private internal_station;
    private realName;
    constructor(connection: Memphis, producerName: string, stationName: string, realName: string);
    _handleHeaders(headers: any): broker.MsgHdrs;
    produce({ message, ackWaitSec, asyncProduce, headers, msgId }: {
        message: any;
        ackWaitSec?: number;
        asyncProduce?: boolean;
        headers?: any;
        msgId?: string;
    }): Promise<void>;
    private _parseJsonValidationErrors;
    private _validateJsonMessage;
    private _validateAvroMessage;
    private _validateProtobufMessage;
    private _validateGraphqlMessage;
    private _validateMessage;
    private _hanldeProduceError;
    destroy(): Promise<void>;
    _getProducerKey(): string;
    _getProducerStation(): string;
}
