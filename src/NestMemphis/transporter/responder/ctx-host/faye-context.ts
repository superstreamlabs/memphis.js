import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';

type FayeContextArgs = [string];

export class FayeContext extends BaseRpcContext<FayeContextArgs> {
  constructor(args: FayeContextArgs) {
    super(args);
  }

  /**
   * Returns the name of the Faye channel.
   */
  getChannel() {
    return this.args[0];
  }
}
