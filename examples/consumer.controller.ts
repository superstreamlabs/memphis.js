import { Controller } from '@nestjs/common';
import { consumeMessage, Message } from 'memphis-dev';

@Controller('auth')
export class ExampleController {
    @consumeMessage({
        stationName: '<station-name>',
        consumerName: '<consumer-name>',
        consumerGroup: ''
    }, {}) // {} for passing the consumerContext to consumer.setContext
    async messageHandler(message: Message, context: object) {
        console.log(message.getData().toString());
        message.ack();
    }
}
