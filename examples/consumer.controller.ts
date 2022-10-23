import { Controller } from '@nestjs/common';
import { consumeMessage } from 'memphis-dev/nest';
import type { Message } from 'memphis-dev/types';

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
