import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClientMemphis } from 'memphis-dev/nest';
import { Consumer } from 'memphis-dev/types';
import {
  Observable
} from 'rxjs';


@Controller('auth')
export class AuthController {
  client = new ClientMemphis({
    connect: {
      host: 'localhost',
      username: 'root',
      connectionToken: 'memphis',
    },
    consumer: {
      consumerName: 'nest_consumer',
      consumerGroup: '',
    },
  });
  constructor(private authService: AuthService) { }

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

    return this.authService.signup();
  }
  
  async onApplicationBootstrap() {
    await this.client.connect();
  }
}
