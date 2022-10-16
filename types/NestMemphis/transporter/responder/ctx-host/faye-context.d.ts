import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';
declare type FayeContextArgs = [string];
export declare class FayeContext extends BaseRpcContext<FayeContextArgs> {
    constructor(args: FayeContextArgs);
    getChannel(): string;
}
export {};
