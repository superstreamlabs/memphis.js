"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequest = void 0;
const axios_1 = require("axios");
async function httpRequest({
  method,
  url,
  headers = {},
  bodyParams = {},
  queryParams = {},
  timeout = 0,
}) {
  var _a;
  if (
    method !== "GET" &&
    method !== "POST" &&
    method !== "PUT" &&
    method !== "DELETE"
  )
    throw {
      status: 400,
      message: `Invalid HTTP method`,
    };
  headers["content-type"] = "application/json";
  try {
    const response = await (0, axios_1.default)({
      method,
      url,
      headers,
      timeout,
      data: bodyParams,
      params: queryParams,
      maxBodyLength: 1000000000,
      maxContentLength: 1000000000,
    });
    const results = response.data;
    return results;
  } catch (ex) {
    if (
      (_a = ex === null || ex === void 0 ? void 0 : ex.response) === null ||
      _a === void 0
        ? void 0
        : _a.data
    )
      throw ex.response.data.message;
    throw ex;
  }
}
exports.httpRequest = httpRequest;
