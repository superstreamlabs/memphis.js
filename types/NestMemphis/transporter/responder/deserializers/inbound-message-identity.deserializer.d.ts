import { ConsumerDeserializer, IncomingRequest } from '@nestjs/microservices';
export declare class InboundMessageIdentityDeserializer implements ConsumerDeserializer {
    private readonly logger;
    deserialize(value: any, options?: Record<string, any>): IncomingRequest;
}
