import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
@Controller()
export class AppController {

    @EventPattern("<station-name>")
    getHello(): string {
        return "Hello World";
    }
}
