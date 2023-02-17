import { Controller } from '@nestjs/common';
import { MemphisConsume, Message } from 'memphis-dev';

@Controller('auth')
export class ExampleController {
    @MemphisConsume({
        stationName: '<station-name>',
        consumerName: '<consumer-name>',
        consumerGroup: ''
    }, {}) // {} for passing the consumerContext to consumer.setContext
    async messageHandler(message: Message, context: object) {
        console.log(message.getData().toString());
        message.ack();
    }
}
