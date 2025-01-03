import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as events from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as iam from "aws-cdk-lib/aws-iam";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EDAAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    //S3 Bucket
    const imagesBucket = new s3.Bucket(this, "images", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    //Dynamo DB
    const imageTable = new dynamodb.Table(this, "ImagesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Images",
    });

    // Integration infrastructure


    //Topic 

    const newImageTopic = new sns.Topic(this, "NewImageTopic", {
      displayName: "New Image topic",
    });





    // Queues
    const imageProcessQueue = new sqs.Queue(this, "img-created-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(10),
    });


    const mailerQ = new sqs.Queue(this, "mailer-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(10),
    });


    const badImagesQueue = new sqs.Queue(this, "bad-images-q", {
      retentionPeriod: Duration.minutes(10),
    });


    const imagesQueue = new sqs.Queue(this, "images-queue", {
      deadLetterQueue: {
        queue: badImagesQueue,
        // # of rejections by consumer (lambda function)
        maxReceiveCount: 2,
      },
    });


    const updateTableQ = new sqs.Queue(this, "update-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(10),
    });





    // Lambda functions

    const processImageFn = new lambdanode.NodejsFunction(
      this,
      "ProcessImageFn",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/logImage.ts`,
        timeout: cdk.Duration.seconds(15),
        memorySize: 128,
        deadLetterQueue: badImagesQueue
      },
      
    );



    //Confirmation mailer
    const mailerFn = new lambdanode.NodejsFunction(this, "mailer-function", {
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(3),
      entry: `${__dirname}/../lambdas/mailer.ts`,
    });


    //Rejection Mailer for invalid file type
    const rejectMailerFn = new NodejsFunction(this, "FailedImagesFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/rejectionMailer.ts`,
      timeout: Duration.seconds(10),
      memorySize: 128,
    });


    // Update Table Function

    const updateTableFn = new lambdanode.NodejsFunction(this, "update-function", {
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(3),
      entry: `${__dirname}/../lambdas/updateTable.ts`,
    });
    /*
    const newImageFn = new lambdanode.NodejsFunction(this, "AddImageFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/processImage.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: imageTable.tableName,
        REGION: "eu-west-1",
      },
    });
    */




    // S3 --> SQS
    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SnsDestination(newImageTopic)  // Changed
    );






    processImageFn.addEventSource(
      new SqsEventSource(imagesQueue, {
        maxBatchingWindow: Duration.seconds(5),
        maxConcurrency: 2,
      })
    );

    rejectMailerFn.addEventSource(
      new SqsEventSource(badImagesQueue, {
        maxBatchingWindow: Duration.seconds(5),
        maxConcurrency: 2,
      })
    );




    // SQS --> Lambda
    const newImageEventSource = new events.SqsEventSource(imageProcessQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(5),
    });

    const newImageMailEventSource = new events.SqsEventSource(mailerQ, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(5),
    });

    const newRejectionMailEventSource = new events.SqsEventSource(mailerQ, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(5),
    });

    const updateTableEventSource = new events.SqsEventSource(updateTableQ, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(5),
    });




    processImageFn.addEventSource(newImageEventSource);
    mailerFn.addEventSource(newImageMailEventSource);
    rejectMailerFn.addEventSource(newRejectionMailEventSource);
    updateTableFn.addEventSource(updateTableEventSource);


    //Subscriptions
    newImageTopic.addSubscription(
      new subs.SqsSubscription(imageProcessQueue)
    );
    newImageTopic.addSubscription(new subs.SqsSubscription(mailerQ));

    newImageTopic.addSubscription(
      new subs.LambdaSubscription(updateTableFn, {
        filterPolicy: {
          metadata_type: sns.SubscriptionFilter.stringFilter({
            allowlist: ['Caption']
          }),
        },
      })
    );

    // Permissions

    imagesBucket.grantRead(processImageFn);


    // IAM rights.

    //permissions for putting photo in dynamo database
    imageTable.grantReadWriteData(processImageFn);

    mailerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
      })
    );


    rejectMailerFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail",
        ],
        resources: ["*"],
      })
    );






    // Output

    new cdk.CfnOutput(this, "bucketName", {
      value: imagesBucket.bucketName,
    });

    new cdk.CfnOutput(this, "topicARN", {
      value: newImageTopic.topicArn,
    });
  }

}
