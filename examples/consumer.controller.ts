import { Controller, Get } from '@nestjs/common';
import { ClientMemphis } from 'memphis-dev/nest';
import { Consumer } from 'memphis-dev/types';
import {
    Observable
} from 'rxjs';


@Controller('auth')
export class AuthController {
    client = new ClientMemphis({
        connect: {
            host: '<memphis-host>',
            username: '<application type username>',
            connectionToken: '<broker-token>',
        },
        consumer: {
            consumerName: 'nest_consumer',
            consumerGroup: '',
        },
    });


    @Get('signup')
    async signup() {
        const listenEvent: Observable<Consumer> = await this.client.emit('hello', 'Hello world!');

        listenEvent.subscribe((consumer) => {

            consumer.on('message', (message) => {
                console.log(message.getData().toString());
                message.ack();
            });

            consumer.on('error', (error) => { });
        })
    }

    async onApplicationBootstrap() {
        await this.client.connect();
    }
}
