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
