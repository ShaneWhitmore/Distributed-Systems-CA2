

aws s3 cp test.txt s3://a-bucket/test.txt --metadata '{"x-amz-meta-cms-id":"34533452"}'


## Assignment 2 (EDA app) - Distributed Systems.

__Name:__ Shane Whitmore

__YouTube Demo link__ - [The URL of the video demonstration of the app.]

[ Note: The video must include an audio.]

### Phase 1.

[ List the Lambda functions in this phase's architecture and state their working status - Fully implemented / Partially working / Not implemented. For partially working lambdas, state briefly what is defective in their implementation.]
e.g.

+ Confirmation Mailer - Fully implemented.
+ Rejection Mailer - Partially working. The Lambda is triggered at the correct times, but the emails are not being received.
+ Log Image -  Fully implemented. 

#### Answer

+ Confimration Mailer - Fully Implemented
+ Rejection Mailer - Fully IMplemented
+ Log Image - Fully Implemented 

### Phase 2 (if relevant).

[ List the Lambda functions in this phase's architecture and state their working status - Fully implemented / Partially working / Not implemented. For partially working lambdas, state briefly what is defective in their implementation.]
e.g.

+ Confirmation Mailer - Partially working. The lambda is triggered too often. The image metadata messages are not being filtered out as required.
+ Rejection Mailer - Fully implemented 
+ Log Image - Fully implemented 
+ Update Table -  Fully implemented.

#### Answer

+ Confirmation Mailer - Fully Implemented
+ Rejection Mailer - Fully Implemented
+ Log Image - Fully Implemented
+ Filtering - Partially Implemented, Filter has been placed on updateTable and works
+ Update Table - Partially Implemented , Error occur at Cloudwatch indicating Unexpected Token



### Phase 3 (if relevant).

[ List the Lambda functions in this phase's architecture and state their working status - Fully implemented / Partially working / Not implemented. For partially working lambdas, state briefly what is defective in their implementation.]

e.g.

+ Confirmation Mailer - Not implemented.
+ Process Image - Fully implemented.
+ Update Table - Fully implemented.
+ etc
+ etc