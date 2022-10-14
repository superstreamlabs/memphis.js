import { Injectable } from '@nestjs/common';
import { Memphis } from '../memphis';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
@Injectable({})
export class MemphisService extends Memphis {}
