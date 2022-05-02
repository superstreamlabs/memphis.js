// Copyright 2021-2022 The Memphis Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const axios = require('axios');

const httpRequest = async ({ method, url, headers = {}, bodyParams = {}, queryParams = {}, file = null, timeout = 0 }) => {
    if (method !== 'GET' && method !== 'POST' && method !== 'PUT' && method !== 'DELETE')
        throw {
            status: 400,
            message: `Invalid HTTP method`,
            data: { method, url, data }
        };

    if (file) {
        bodyParams.file = file;
    }

    headers['content-type'] = 'application/json';

    try {
        const response = await axios({
            method,
            url,
            headers,
            timeout,
            data: bodyParams,
            params: queryParams,
            maxBodyLength: 1000000000,
            maxContentLength: 1000000000
        });
        const results = response.data;
        return results;
    } catch (ex) {
        if (ex?.response?.data)
            throw ex.response.data.message;

        throw ex;
    }
};

module.exports = httpRequest;
