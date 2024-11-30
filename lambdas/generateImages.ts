import { Handler } from "aws-lambda";
import {
  SQSClient,
  SendMessageBatchCommand,
  SendMessageBatchCommandInput,
  SendMessageBatchRequestEntry,
} from "@aws-sdk/client-sqs";
import { v4 } from "uuid";
import { Image } from "../shared/types";
import { ImageMix, BadImage } from "../shared/types";
import { strict } from "assert";
import { stringify } from "querystring";
const client = new SQSClient({ region: "eu-west-1" });

const images: ImageMix[] = [];
for (let i = 0; i < 10; i++) {
    images.push({
    customerName: `User${i}`,
    customerAddress: "1 Main Street",
    items: [],
  });
}

images.splice(6, 1, {
  // No address property - Bad.
  customerName: "UserX",
  items: [],
});

export const handler: Handler = async (event) => {
  try {
    console.log(JSON.stringify(images)  )
    const messages: SendMessageBatchRequestEntry[] = images.map((image) => {
      return {
        Id: v4(),
        MessageBody: JSON.stringify(image),
      };
    });
    const batchCommandInput: SendMessageBatchCommandInput = {
      QueueUrl: process.env.QUEUE_URL,
      Entries: messages,
    };

    const batchResult = await client.send(
      new SendMessageBatchCommand(batchCommandInput)
    );

    // const sendCommandInput: SendMessageCommandInput = {
    //   QueueUrl: process.env.QUEUE_URL,
    //   MessageBody: JSON.stringify(badOrder),
    // };

    // const sendResult = await client.send(
    //   new SendMessageCommand(sendCommandInput)
    // );

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: "All orders queued for processing",
    };
  } catch (error) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};
