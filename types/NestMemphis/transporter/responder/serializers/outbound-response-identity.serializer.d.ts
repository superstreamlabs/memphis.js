import { Serializer, OutgoingResponse } from '@nestjs/microservices';
export declare class OutboundResponseIdentitySerializer implements Serializer {
    private readonly logger;
    serialize(value: any): OutgoingResponse;
}
