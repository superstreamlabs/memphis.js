import { EventEmitter } from 'events';

export interface MemphisClient extends EventEmitter {
  publish(subject: string, msg?: string | Buffer): void;
  subscribe(subject: string, callback: Function): void;
  unsubscribe(subject: string): void;
  connect(): void;
  disconnect(): void;
}
