"use strict";
// Copyright 2021-2022 The Memphis Authors
// Licensed under the Apache License, Version 2.0 (the “License”);
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an “AS IS” BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequest = void 0;
var axios_1 = __importDefault(require("axios"));
function httpRequest(_a) {
    var _b;
    var method = _a.method, url = _a.url, _c = _a.headers, headers = _c === void 0 ? {} : _c, _d = _a.bodyParams, bodyParams = _d === void 0 ? {} : _d, _e = _a.queryParams, queryParams = _e === void 0 ? {} : _e, _f = _a.timeout, timeout = _f === void 0 ? 0 : _f;
    return __awaiter(this, void 0, void 0, function () {
        var response, results, ex_1;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (method !== 'GET' && method !== 'POST' && method !== 'PUT' && method !== 'DELETE')
                        throw {
                            status: 400,
                            message: "Invalid HTTP method"
                        };
                    headers['content-type'] = 'application/json';
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, axios_1.default)({
                            method: method,
                            url: url,
                            headers: headers,
                            timeout: timeout,
                            data: bodyParams,
                            params: queryParams,
                            maxBodyLength: 1000000000,
                            maxContentLength: 1000000000
                        })];
                case 2:
                    response = _g.sent();
                    results = response.data;
                    return [2 /*return*/, results];
                case 3:
                    ex_1 = _g.sent();
                    if ((_b = ex_1 === null || ex_1 === void 0 ? void 0 : ex_1.response) === null || _b === void 0 ? void 0 : _b.data)
                        throw ex_1.response.data.message;
                    throw ex_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.httpRequest = httpRequest;
;
