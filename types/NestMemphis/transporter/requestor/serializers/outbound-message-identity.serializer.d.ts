import { Serializer } from '@nestjs/microservices';
export declare class OutboundMessageIdentitySerializer implements Serializer {
    private readonly logger;
    serialize(value: any): any;
}
