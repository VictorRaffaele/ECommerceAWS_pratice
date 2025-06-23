import { Context, Callback } from "aws-lambda";
import { ProductEvent } from "/opt/nodejs/productEventsLayer";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk-core";

AWSXRay.captureAWS(require('aws-sdk'));
const eventDdb = process.env.EVENTS_DDB!;
const ddbClient = new DynamoDB.DocumentClient();
const fileTag = 'ProductsEventsFunction';

export async function handler(event: ProductEvent, context: Context, callback: Callback): Promise<void> {
  console.log(`${fileTag} event: ${event}`);
  console.log(`${fileTag} Lambda requestId: ${context.awsRequestId}`);
  await createEvent(event)
  callback(null, JSON.stringify({
    productEventCreated: true,
    message: 'OK'
  }));
}

function createEvent(event: ProductEvent): Promise<DynamoDB.DocumentClient.PutItemOutput> {
  const timestamp = Date.now();
  const ttl = ~~(timestamp / 1000) + 5 * 60

  return ddbClient.put({
    TableName: eventDdb,
    Item: {
      pk: `#product_${event.productCode}`,
      sk: `${event.eventType}#${timestamp}`,
      email: event.email,
      createdAt: timestamp,
      requestId: event.resquestId,
      eventType: event.eventType,
      info: {
        productId: event.productId,
        price: event.productPrice 
      },
      ttl: ttl
    }
  }).promise()
}
