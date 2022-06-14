// Copyright 2021-2022 The Memphis Authors
// Licensed under the GNU General Public License v3.0 (the “License”);
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.gnu.org/licenses/gpl-3.0.en.html
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an “AS IS” BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import axios from 'axios';

export async function httpRequest({ method, url, headers = {}, bodyParams = {}, queryParams = {}, timeout = 0 }:
    { method: string, url: string, headers?: any, bodyParams?: any, queryParams?: any, timeout?: number }): Promise<any> {
    if (method !== 'GET' && method !== 'POST' && method !== 'PUT' && method !== 'DELETE')
        throw {
            status: 400,
            message: `Invalid HTTP method`
        };

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
    } catch (ex: any) {
        if (ex?.response?.data)
            throw ex.response.data.message;

        throw ex;
    }
};