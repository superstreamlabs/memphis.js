import { MemphisService } from "memphis-dev/nest";
export declare class ProducerModule {
    private memphis;
    constructor(memphis: MemphisService);
    startProducer(): void;
}
