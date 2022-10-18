import { Controller, Post, Get } from '@nestjs/common';
import { consumeMessage } from 'memphis-dev/nest';

const connect = {
    host: '<memphis-host>',
    username: '<application type username>',
    connectionToken: '<broker-token>'
};
const consumer = {
    stationName: '<station-name>',
    consumerName: '<consumer-name>',
    consumerGroup: ''
};

@Controller('auth')
export class AuthController {
    @Get('signup')
    @consumeMessage(connect, consumer)
    async signup(consumer) {
        try {
            consumer.on('message', (message) => {
                console.log(message.getData().toString());
                message.ack();
            });

            consumer.on('error', (error) => {
                console.log(error);
            });
        } catch (ex) {
            console.log(ex);
        }
    }
}
