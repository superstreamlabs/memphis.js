import { Injectable } from '@nestjs/common';
import { Memphis } from '../memphis';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';


@Injectable({})
export class MemphisService extends Memphis {}



class GoogleCloudPubSubServer extends Server implements CustomTransportStrategy {
    /**
     * This method is triggered when you run "app.listen()".
     */
    listen(callback: () => void) {
        callback();
    }

    /**
     * This method is triggered on application shutdown.
     */
    close() {}
}
