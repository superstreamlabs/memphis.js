const createFunction = (memphis_event, eventHandler) => {
    const handler = (memphis_event) => {
    const processedEvents = {
        messages: [],
        failedMessages: []
    };

    for (const message of memphis_event.messages) {
        try {
            const payload = Buffer.from(message.payload, 'base64');
            const { processedMessage, processedHeaders } = eventHandler(payload, message.headers);

            if (processedMessage instanceof Uint8Array && processedHeaders instanceof Object) {
                processedEvents.messages.push({
                    headers: processedHeaders,
                    payload: Buffer.from(processedMessage).toString('base64')
                });
            } else if (processedMessage === null && processedHeaders === null) {
                continue;
            } else if (processedMessage === null || processedHeaders === null) {
                const errMsg = `processedMessage is of type ${typeof processedMessage} and processedHeaders is ${typeof processedHeaders}. Either both of these should be null or neither`;
                throw new Error(errMsg);
            } else {
                const errMsg = "The returned processedMessage or processedHeaders were not in the right format. processedMessage must be Uint8Array and processedHeaders, Object";
                throw new Error(errMsg);
            }
        } catch (e) {
            processedEvents.failedMessages.push({
                headers: message.headers,
                payload: message.payload,
                error: e.message
            });
        }
    }

    try {
        return JSON.stringify(processedEvents);
    } catch (e) {
        return `Returned message types from user function are not able to be converted into JSON: ${e}`;
    }
    };

    return handler(memphis_event);
};
