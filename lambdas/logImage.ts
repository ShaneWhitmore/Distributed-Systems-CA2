import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SQSHandler } from "aws-lambda";
import {
    GetObjectCommand,
    PutObjectCommandInput,
    GetObjectCommandInput,
    S3Client,
    PutObjectCommand,
} from "@aws-sdk/client-s3";

const ddbDocClient = createDDbDocClient();
const s3 = new S3Client();

export const handler: SQSHandler = async (event) => {
    for (const record of event.Records) {
        const recordBody = JSON.parse(record.body);        // Parse SQS message
        const snsMessage = JSON.parse(recordBody.Message); // Parse SNS message

        if (snsMessage.Records) {
            console.log("Record body ", JSON.stringify(snsMessage));
            for (const messageRecord of snsMessage.Records) {
                const s3e = messageRecord.s3;
                const srcBucket = s3e.bucket.name;
                // Object key may have spaces or unicode non-ASCII characters.
                const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
                let origimage = null;

                //if statement here to ensure that the file type is correct
                const extentionType = srcKey.split('.').pop()?.toLowerCase() ?? "";
                
                const acceptableExentions = ["png", "jpeg"]

                console.log(extentionType)


                if (acceptableExentions.includes(extentionType)) {
                    const commandOutput = await ddbDocClient.send(
                        new PutCommand({
                            TableName: "Images",
                            Item: { "id": srcKey },
                        })
                    );

                    console.log(commandOutput)
                }
                else {
                    
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