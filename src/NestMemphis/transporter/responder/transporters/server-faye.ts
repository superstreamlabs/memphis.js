import { Server, CustomTransportStrategy, IncomingRequest, ReadPacket, PacketId } from '@nestjs/microservices';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { NO_MESSAGE_HANDLER } from '@nestjs/microservices/constants';
import { FayeContext } from '../ctx-host/faye-context';
// import { MemphisClient } from '../../external/faye-client.interface';
import Memphis,{ MemphisType as MemphisClient } from '../../../../memphis';
import { ERROR_EVENT } from '../../constants';
import { FayeOptions } from '../../interfaces/faye-options.interface';

import { Observable } from 'rxjs';

import * as faye from 'faye';

export class ServerMemphis extends Server implements CustomTransportStrategy {
    // Holds our client interface to the Faye broker.
    private memphisClient: MemphisClient;

    constructor(private readonly options: FayeOptions) {
        super();

        // super class establishes the serializer and deserializer; sets up
        // defaults unless overridden via `options`
        this.initializeSerializer(options);
        this.initializeDeserializer(options);
    }

    /**
     * listen() is required by the `CustomTransportStrategy` interface. It's
     * called by the framework when the transporter is instantiated, and kicks
     * off a lot of the framework machinery.
     */
    public listen(callback: () => void) {
        this.memphisClient = this.createMemphisClient();
        this.start(callback);
    }

    public createMemphisClient(): MemphisClient {
        // pull out url, and strip serializer and deserializer properties
        // from options so we conform to the `faye.Client()` interface
        const { url, serializer, deserializer,connect, ...options } = this.options;
        return Memphis.connect(connect);
    }

    public close() {
        this.memphisClient.close();
        this.memphisClient = null;
    }

    // kick things off
    public start(callback) {
        // register for error events
        this.handleError(this.fayeClient);
        // traverse all registered patterns and bind handlers to them
        this.bindEvents(this.fayeClient);
        callback();
    }

    /**
     *
     */
    public bindEvents(client: FayeClient) {
        const registeredPatterns = [...this.messageHandlers.keys()];
        registeredPatterns.forEach((pattern) => {
            const { isEventHandler } = this.messageHandlers.get(pattern);
            client.subscribe(isEventHandler ? pattern : `${pattern}_ack`, this.getMessageHandler(pattern, client).bind(this));
        });
    }

    public getMessageHandler(pattern: string, client: FayeClient): Function {
        /**
         * Returns a "Faye subscriber function" that will be registered to
         * be called by the Faye client library when a message with this "channel"
         * (AKA "pattern") is received.
         *
         * Faye subscriptions are done with client.subscribe():
         *
         * client.subscribe('pattern',
         *   // Faye subscription function
         *   (message) => {
         *      // dynamic messageHandlerFunction
         *   }
         * )
         *
         * So this function returns a "Faye subscriber function" of that shape.
         *
         * Since the sequence of steps that the subscriber function must execute when a
         * particular subscribed message is received depends on the type of message
         * (i.e., Request/Response (@MessagePattern()) or Event (@EventPattern())).
         * our "Faye subscription function" must take this into account.
         *
         * The solution is to register a handler that dynamically executes those steps,
         * including invoking the ultimate handler (e.g., `getCustomers()`).
         *
         * That's what `this.handleMessage(...) does.
         */
        return async (message: any) => {
            return this.handleMessage(pattern, message, client);
        };
    }

    /**
     * Responsible for calling the Nest handler method registered to this pattern,
     * taking into account whether the pattern type is request/response or event.
     *
     * Request/Response case
     * =====================
     *
     * For example, controller `AppController` may have the following construct,
     * declaring `getCustomers()` to be the handler to be called when a message on
     * the subject `/get-customers_ack` is received:
     *
     *    @MessagePattern('/get-customers')
     *    getCustomers(data) {
     *      return this.customers;
     *    }
     *
     * In this case ( `(message as IncomingRequest).id` *is defined* below ) we
     * take these  steps:
     * 1. lookup the handler by pattern
     * 2. wrap a call to the handler in an observable
     * 3. build a Faye `publish()` function to publish the observable containing
     *    the response
     * 4. publish the observable response
     *
     * Event case
     * ==========
     *
     * For example, controller `AppController` may have the following construct,
     * declaring `getCustomers()` to be the handler to be called when a message on
     * the subject `/get-customers_ack` is received:
     *
     *     @EventPattern('/add-customer')
     *     addCustomer(customer: Customer) {
     *        customerList.push(...)
     *     }
     *
     * In this case ( `(message as IncomingRequest).id` *is NOT defined* below )
     * we simply invoke the generic event handler code. **There is no further
     * interactin with the broker/comm layer** since there is no response.
     * This case is much simpler so the event code is provided by the framework
     * and works generically across all transports.
     */
    public async handleMessage(channel: any, buffer: string, pub: FayeClient): Promise<any> {
        const fayeCtx = new FayeContext([channel]);
        const rawPacket = this.parseMessage(buffer);
        const message = this.deserializer.deserialize(rawPacket, {
            channel
        });
        if (isUndefined((message as IncomingRequest).id)) {
            return this.handleEvent(channel, message, fayeCtx);
        }
        const pattern = message.pattern.replace(/_ack$/, '');

        // build a publisher: build a function of the form
        // client.publish('subject', () => { /** handler */});
        const publish = this.buildPublisher(pub, pattern, (message as IncomingRequest).id);

        // get the actual pattern handler (e.g., `getCustomer()`)
        const handler = this.getHandlerByPattern(pattern);
        // handle case of missing publisher
        if (!handler) {
            const status = 'error';
            const noHandlerPacket = {
                id: (message as IncomingRequest).id,
                status,
                err: NO_MESSAGE_HANDLER
            };
            return publish(noHandlerPacket);
        }

        // wrap the handler call in an observable
        const response$ = this.transformToObservable(await handler(message.data, fayeCtx)) as Observable<any>;

        // subscribe to the observable (thus invoking the handler and
        // returning the response stream). `send()` is inherited from
        // the super class, and handles the machinery of returning the
        // response stream.
        // tslint:disable-next-line: no-unused-expression
        response$ && this.send(response$, publish);
    }

    // returns a "publisher": a properly configured Faye `client.publish()` call
    public buildPublisher(client: FayeClient, pattern: any, id: string): any {
        return (response: any) => {
            Object.assign(response, { id });
            const outgoingResponse = this.serializer.serialize(response);

            return client.publish(this.getResQueueName(pattern), JSON.stringify(outgoingResponse));
        };
    }

    public parseMessage(content: any): ReadPacket & PacketId {
        try {
            return JSON.parse(content);
        } catch (e) {
            return content;
        }
    }

    public getResQueueName(pattern: string): string {
        return `${pattern}_res`;
    }

    public handleError(stream: any) {
        stream.on(ERROR_EVENT, (err: any) => {
            this.logger.error('Faye Server offline!');
            this.close();
        });
    }
}
