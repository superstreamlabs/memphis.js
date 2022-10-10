import { ProducerDeserializer, IncomingResponse } from '@nestjs/microservices';
export declare class InboundResponseIdentityDeserializer implements ProducerDeserializer {
    private readonly logger;
    deserialize(value: any): IncomingResponse;
}
