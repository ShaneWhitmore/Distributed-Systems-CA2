//Take the meta data and update an image in the database to contain its data.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSHandler } from "aws-lambda";
import {
    GetObjectCommand,
    PutObjectCommandInput,
    GetObjectCommandInput,
    S3Client,
    PutObjectCommand,
} from "@aws-sdk/client-s3";

const ddbDocClient = createDDbDocClient();
const s3 = new S3Client();

export const handler: SNSHandler = async (event) => {
    for (const record of event.Records) {
        const recordBody = JSON.parse(record.Sns.Message);        // Parse SQS message
        const snsMessage = JSON.parse(recordBody.Message); // Parse SNS message
        const metaData = JSON.parse(record.Sns.MessageAttributes.metaData.Value)
        if (metaData) {
            console.log("Record body ", JSON.stringify(metaData));
            for (const messageRecord of metaData) {
                const s3e = messageRecord.s3;
                const srcBucket = s3e.bucket.name;
                // Object key may have spaces or unicode non-ASCII characters.
                const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
                let origimage = null;

                //if statement here to ensure that the file type is correct
                const extentionType = srcKey.split('.').pop()?.toLowerCase() ?? "";

                const acceptableExentions = ["json"]

                console.log(extentionType)

                // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html 
                if (acceptableExentions.includes(extentionType)) {
                    const commandOutput = await ddbDocClient.send(
                        new UpdateCommand({
                            TableName: "Images",
                            Key: { "Value": srcKey },
                            UpdateExpression: "set attribute = :metadata",
                            ExpressionAttributeNames: {
                                "#attribute": "MetaData",
                            },
                            ExpressionAttributeValues: {
                                ":metadata": JSON.stringify(metaData),
                            },

                        })
                    );

                    console.log(commandOutput)
                }
                else {
                    const invalidImage = srcKey
                    console.log('Bad meta data', invalidImage)
                    throw new Error(" Invalid file Type for meta data");
                }

            }
        }
    }
};


function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}