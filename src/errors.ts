import { MemphisError } from './utils'

export const MemphisErrors = {
    IncorrectBatchSize: (maxBatchSize: number) => {
        return MemphisError(new Error(`Batch size can not be greater than ${maxBatchSize} or less than 1`))
    },
    GivenBothPartitionNumAndKey: MemphisError(new Error('Can not use both partition number and partition key')),
    InvalidJSONSchema: MemphisError(new Error('Invalid json schema')),
    InvalidAVROSchema: MemphisError(new Error('Invalid avro schema')),
    DeadConnection: MemphisError(new Error('Connection is dead')),
    NegativeStartConsumeFromSeq: MemphisError(
        new Error('startConsumeFromSequence has to be a positive number')
    ),
    InvalidLastMessages: MemphisError(new Error('min value for LastMessages is -1')),
    GivenBothLastMessagesAndStartConsume: MemphisError(
        new Error(
          "Consumer creation options can't contain both startConsumeFromSequence and lastMessages"
        )
    ),
    ProducingWithoutConnection: MemphisError(
        new Error('Cant produce a message without being connected!')
    ),
    FetchingWithoutConnection: MemphisError(
        new Error('Cant fetch messages without being connected!')
    ),
    UnsupportedSchemaType: MemphisError(new Error("Schema type not supported")),
    UnsupportedSchemaNameChars: MemphisError(new Error("Only alphanumeric and the '_', '-', '.' characters are allowed in the schema name")),
    InvalidSchemaNameStartOrEnd: MemphisError(new Error("Schema name can not start or end with non-alphanumeric character")),
    EmptySchemaName: MemphisError(new Error("Schema name can not be empty")),
    SchemaNameTooLong: MemphisError(new Error("Schema name should be under 128 characters")),
    InvalidHeaderKeyNameStart: MemphisError(new Error('Keys in headers should not start with $memphis')),
    DeserializationFailure: (ex: Error) => {
        return MemphisError(new Error(`Deserialization has been failed since the message format does not align with the currently attached schema: ${ex.message}`));
    },
    CannotDelayDLSMsg: MemphisError(new Error('Cannot delay DLS message')),
    UnsupportedHeaderFormat: MemphisError(new Error('Headers has to be a Javascript object or an instance of MsgHeaders')),
    FailedToProduce: MemphisError(new Error('Produce operation has failed, please check whether Station/Producer still exist')),
    ExpectingJSONFormat: (ex: Error) => {
        return MemphisError(new Error('Expecting Json format: ' + ex));
    },
    UnsupportedMessageType: MemphisError(new Error('Unsupported message type')),
    ExpectingAVROFormat: (ex: Error) => {
        return MemphisError(new Error('Expecting Avro format: ' + ex));
    },
    FailedSchemaValidation: (toPrint: any) => {
        return MemphisError(new Error(`Schema validation has failed: ${toPrint}`));
    },
    

}