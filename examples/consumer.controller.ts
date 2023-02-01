import { Controller } from '@nestjs/common';
import { consumeMessage, Message } from 'memphis-dev';

@Controller('auth')
export class ExampleController {
    @consumeMessage({
        stationName: '<station-name>',
        consumerName: '<consumer-name>',
        consumerGroup: ''
    })
    async messageHandler(message: Message) {
        console.log(message.getData().toString());
        message.ack();
    }
}
