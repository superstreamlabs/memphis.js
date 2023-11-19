/**
 * This function creates a Memphis function and processes events with the passed-in event handler function.
 *
 * @param {Object} memphis_event - A Memphis event object containing messages and inputs.
 * @example
 * // Example Memphis event object
 * {
 *     messages: [
 *         {
 *             headers: {},
 *             payload: "base64_encoded_payload"
 *         },
 *         ...
 *     ],
 *     inputs: {
 *         "input_name": "input_value",
 *         ...
 *     }
 * }
 * @param {Function} eventHandler - The function responsible for processing each message in the event. 
 * The event handler is assumed to have a function signature of: <eventHandler>(payload, headers, inputs) and should return an object that has the keys { processedMessage, processedHeaders }.
 * The payload will be given as an uint8array. The headers and inputs are both objects. 
 * processedMessage should be returned as an uint8array and processedHeaders as an object. 
 * @returns {string} - A JSON string representing the successful and failed messages.
 * The return format is given in the JSDOC of the handler function
 * @throws {Error} - Throws an exception if something goes wrong with processing a message.
 * @throws {Error} - Throws an exception if the returned processedMessage or processedHeaders are not in the expected format.
 */

export async function createFunction(memphis_event, eventHandler) {
    /**
     * The Memphis function handler which iterates over the messages in the event and passes them to the user-provided event handler.
     *
     * @param {Object} memphis_event - A Memphis event object containing messages and inputs.
     * @returns {string} - A JSON string representing the successful and failed messages. 
     * @example
     * // Example result format (successful and failed messages)
     * {
     *     messages: [
     *         {
     *             headers: {},
     *             payload: "base64_encoded_payload"
     *         },
     *         // ...
     *     ],
     *     failed_messages: [
     *         {
     *             headers: {},
     *             payload: "base64_encoded_payload",
     *             error: "Error message"
     *         },
     *         // ...
     *     ]
     * }
     */
    async function handler(memphis_event) {
        const processedEvents = {
            messages: [],
            failed_messages: []
        };

        for (const message of memphis_event.messages) {
            try {
                const payload = Buffer.from(message.payload, 'base64');
                const maybeAsyncEvent = eventHandler(payload, message.headers, message.inputs);

                let processedMessage, processedHeaders;
                if (maybeAsyncEvent instanceof Promise) {
                    const response = await maybeAsyncEvent;
                    processedMessage = response.processedMessage;
                    processedHeaders = response.processedHeaders;
                } else {
                    processedMessage = maybeAsyncEvent.processedMessage;
                    processedHeaders = maybeAsyncEvent.processedHeaders;
                }

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
                processedEvents.failed_messages.push({
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
    }

    return handler(memphis_event);
};
