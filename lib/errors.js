"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemphisErrors = void 0;
const utils_1 = require("./utils");
exports.MemphisErrors = {
    IncorrectBatchSize: (maxBatchSize) => {
        return (0, utils_1.MemphisError)(new Error(`Batch size can not be greater than ${maxBatchSize} or less than 1`));
    },
    GivenBothPartitionNumAndKey: (0, utils_1.MemphisError)(new Error('Can not use both partition number and partition key')),
    InvalidJSONSchema: (0, utils_1.MemphisError)(new Error('invalid json schema')),
    InvalidAVROSchema: (0, utils_1.MemphisError)(new Error('invalid avro schema')),
    DeadConnection: (0, utils_1.MemphisError)(new Error('Connection is dead')),
    NegativeStartConsumeFromSeq: (0, utils_1.MemphisError)(new Error('startConsumeFromSequence has to be a positive number')),
    InvalidLastMessages: (0, utils_1.MemphisError)(new Error('min value for LastMessages is -1')),
    GivenBothLastMessagesAndStartConsume: (0, utils_1.MemphisError)(new Error("Consumer creation options can't contain both startConsumeFromSequence and lastMessages")),
    ProducingWithoutConnection: (0, utils_1.MemphisError)(new Error('Cant produce a message without being connected!')),
    FetchingWithoutConnection: (0, utils_1.MemphisError)(new Error('Cant fetch messages without being connected!')),
    UnsupportedSchemaType: (0, utils_1.MemphisError)(new Error("Schema type not supported")),
    UnsupportedSchemaNameChars: (0, utils_1.MemphisError)(new Error("Only alphanumeric and the '_', '-', '.' characters are allowed in the schema name")),
    InvalidSchemaNameStartOrEnd: (0, utils_1.MemphisError)(new Error("schema name can not start or end with non alphanumeric character")),
    EmptySchemaName: (0, utils_1.MemphisError)(new Error("schema name can not be empty")),
    SchemaNameTooLong: (0, utils_1.MemphisError)(new Error("schema name should be under 128 characters")),
    InvalidHeaderKeyNameStart: (0, utils_1.MemphisError)(new Error('Keys in headers should not start with $memphis')),
    DeserializationFailure: (ex) => {
        return (0, utils_1.MemphisError)(new Error(`Deserialization has been failed since the message format does not align with the currently attached schema: ${ex.message}`));
    },
    CannotDelayDLSMsg: (0, utils_1.MemphisError)(new Error('cannot delay DLS message')),
    UnsupportedHeaderFormat: (0, utils_1.MemphisError)(new Error('headers has to be a Javascript object or an instance of MsgHeaders')),
    FailedToProduce: (0, utils_1.MemphisError)(new Error('Produce operation has failed, please check whether Station/Producer still exist')),
    ExpectingJSONFormat: (ex) => {
        return (0, utils_1.MemphisError)(new Error('Expecting Json format: ' + ex));
    },
    UnsupportedMessageType: (0, utils_1.MemphisError)(new Error('Unsupported message type')),
    ExpectingAVROFormat: (ex) => {
        return (0, utils_1.MemphisError)(new Error('Expecting Avro format: ' + ex));
    },
    FailedSchemaValidation: (toPrint) => {
        return (0, utils_1.MemphisError)(new Error(`Schema validation has failed: ${toPrint}`));
    },
};
