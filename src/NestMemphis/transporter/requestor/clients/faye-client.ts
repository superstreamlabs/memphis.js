import { Logger } from '@nestjs/common';
import {
  ClientProxy,
  ReadPacket,
  PacketId,
  WritePacket,
} from '@nestjs/microservices';
import { share } from 'rxjs/operators';

import { FayeClient } from '../../external/faye-client.interface';
import { CONNECT_EVENT, ERROR_EVENT } from '../../constants';
import { FayeOptions } from '../../interfaces/faye-options.interface';

import * as faye from 'faye';

export class ClientFaye extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly subscriptionsCount = new Map<string, number>();
  protected fayeClient: FayeClient;
  protected connection: Promise<any>;

  constructor(protected readonly options?: FayeOptions) {
    super();

    // super class establishes the serializer and deserializer; sets up
    // defaults unless overridden via `options`
    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  /**
   * connect returns a Promise that resolves to a connected Faye client.
   * This construct is expected by the framework.
   */
  public async connect(): Promise<any> {
    if (this.fayeClient) {
      return this.connection;
    }
    const { url, serializer, deserializer, ...options } = this.options;
    this.fayeClient = new faye.Client(url, options);
    this.fayeClient.connect();
    this.connection = await this.connect$(
      this.fayeClient,
      ERROR_EVENT,
      CONNECT_EVENT,
    )
      .pipe(share())
      .toPromise();
    this.handleError(this.fayeClient);
    return this.connection;
  }

  /**
   *
   */
  public createSubscriptionHandler(
    packet: ReadPacket & PacketId,
    callback: (packet: WritePacket) => any,
  ): Function {
    return (rawPacket: unknown) => {
      const parsedPacket = this.parsePacket(rawPacket);
      const message = this.deserializer.deserialize(parsedPacket);
      if (message.id && message.id !== parsedPacket.id) {
        return undefined;
      }
      const { err, response, isDisposed } = message;
      if (isDisposed || err) {
        return callback({
          err,
          response,
          isDisposed: true,
        });
      }
      callback({
        err,
        response,
      });
    };
  }

  /**
   *
   */
  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): Function {
    try {
      const packet = this.assignPacketId(partialPacket);
      const pattern = this.normalizePattern(partialPacket.pattern);
      const serializedPacket = this.serializer.serialize(packet);
      const responseChannel = this.getResPatternName(pattern);

      let subscriptionsCount =
        this.subscriptionsCount.get(responseChannel) || 0;

      const publishRequest = () => {
        subscriptionsCount = this.subscriptionsCount.get(responseChannel) || 0;
        this.subscriptionsCount.set(responseChannel, subscriptionsCount + 1);
        this.routingMap.set(packet.id, callback);
        this.fayeClient.publish(
          this.getAckPatternName(pattern),
          JSON.stringify(serializedPacket),
        );
      };

      const subscriptionHandler = this.createSubscriptionHandler(
        packet,
        callback,
      );

      if (subscriptionsCount <= 0) {
        this.fayeClient.subscribe(responseChannel, subscriptionHandler);
        publishRequest();
      } else {
        publishRequest();
      }

      return () => {
        this.unsubscribeFromChannel(responseChannel);
        this.routingMap.delete(packet.id);
      };
    } catch (err) {
      callback({ err });
    }
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket = this.serializer.serialize(packet);

    return new Promise((resolve, reject) =>
      this.fayeClient.publish(pattern, JSON.stringify(serializedPacket)),
    );
  }

  protected unsubscribeFromChannel(channel: string) {
    const subscriptionCount = this.subscriptionsCount.get(channel);
    this.subscriptionsCount.set(channel, subscriptionCount - 1);

    if (subscriptionCount - 1 <= 0) {
      this.fayeClient.unsubscribe(channel);
    }
  }

  public parsePacket(content: any): ReadPacket & PacketId {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public getAckPatternName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResPatternName(pattern: string): string {
    return `${pattern}_res`;
  }

  public close() {
    // tslint:disable-next-line: no-unused-expression
    this.fayeClient && this.fayeClient.disconnect();
    this.fayeClient = null;
    this.connection = null;
  }

  public handleError(stream: any) {
    stream.on(ERROR_EVENT, (err: any) => {
      this.logger.error('Faye Server offline!'), this.close();
    });
  }
}
