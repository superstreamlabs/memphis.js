"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MemphisModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemphisModule = void 0;
const __1 = require("..");
const common_1 = require("@nestjs/common");
let MemphisModule = MemphisModule_1 = class MemphisModule {
    static register() {
        return {
            global: true,
            module: MemphisModule_1,
            providers: [{
                    provide: __1.MemphisService,
                    useValue: __1.memphis
                }],
            exports: [__1.MemphisService]
        };
    }
};
MemphisModule = MemphisModule_1 = __decorate([
    (0, common_1.Module)({})
], MemphisModule);
exports.MemphisModule = MemphisModule;
