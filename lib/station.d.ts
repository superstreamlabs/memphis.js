import { Memphis } from ".";
export declare class Station {
    private connection;
    name: string;
    internalName: string;
    constructor(connection: Memphis, name: string);
    private _validateJsonMessage;
    private _validateAvroMessage;
    private _validateProtobufMessage;
    private _validateGraphqlMessage;
    _validateMessage(msg: any): any;
    private _parseJsonValidationErrors;
    destroy(timeoutRetry?: number): Promise<void>;
}
