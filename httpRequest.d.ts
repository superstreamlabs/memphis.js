export declare function httpRequest({ method, url, headers, bodyParams, queryParams, timeout }: {
    method: string;
    url: string;
    headers?: any;
    bodyParams?: any;
    queryParams?: any;
    timeout?: number;
}): Promise<any>;
