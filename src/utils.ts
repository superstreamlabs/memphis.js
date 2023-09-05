export const MemphisError = (error: Error): Error => {
    if (error?.message) {
        error.message = error.message.replace('NatsError', 'memphis');
        error.message = error.message.replace('Nats', 'memphis');
        error.message = error.message.replace('nats', 'memphis');
    }
    if (error?.stack) {
        error.stack = error.stack.replace('NatsError', 'memphis');
        error.stack = error.stack.replace('Nats:', 'memphis');
        error.stack = error.stack.replace('nats:', 'memphis');
    }
    if (error?.name) {
        error.name = error.name.replace('NatsError', 'MemphisError');
        error.name = error.name.replace('Nats', 'MemphisError');
        error.name = error.name.replace('nats', 'MemphisError');
    }
    return error;
};

export const MemphisErrorString = (err: String): String => {
    if (err) {
        err = err.replace('NatsError', 'memphis');
        err = err.replace('Nats', 'memphis');
        err = err.replace('nats', 'memphis');
        err = err.replace('NATS', 'Memphis');
    }
    return err;
};

export const stringToHex = (str: string): string => {
    var hex = '';
    for (var i = 0; i < str.length; i++) {
        hex += '' + str.charCodeAt(i).toString(16);
    }
    return hex;
}

export const generateNameSuffix = (additonalStr: string = ""): string => {
    return `${additonalStr}${[...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));