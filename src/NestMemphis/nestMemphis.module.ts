import { MemphisService } from './nestMemphis.service';
import { Module, DynamicModule } from '@nestjs/common';
@Module({})
export class MemphisModule {
    static register(): DynamicModule {
        return {
            global: true,
            module: MemphisModule,
            providers: [MemphisService],
            exports: [MemphisService]
        };
    }
}
