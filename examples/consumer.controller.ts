import { Controller, Post, Get } from '@nestjs/common';
import { consumeMessage } from 'memphis-dev/nest';
import type { Message } from 'memphis-dev/types';

@Controller('auth')
export class AuthController {
    @Get('signup')
    @consumeMessage({
        stationName: '<station-name>',
        consumerName: '<consumer-name>',
        consumerGroup: ''
    })
    async signup(message: Message) {
        console.log(message.getData().toString());
        message.ack();
    }
}
