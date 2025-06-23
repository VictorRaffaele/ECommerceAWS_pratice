import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB, Lambda } from 'aws-sdk';
import { ProductEvent, ProductEventType } from "/opt/nodejs/productEventsLayer";
import * as AWSXRay from 'aws-xray-sdk-core';
import { send } from "process";

AWSXRay.captureAWS(require('aws-sdk'));
const productsDdb = process.env.PRODUCTS_DDB!;
const ProductsEventsFunctionName = process.env.PRODUCTS_EVENTS_FUNCTION_NAME!;
const ddbClient = new DynamoDB.DocumentClient();
const lambdaClient = new Lambda();
const productRepository = new ProductRepository(ddbClient, productsDdb);
const funcTag = "ProductsAdminFunction";

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // receive from APIGateway an event and return from APIGateway a response

  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext?.requestId || "N/A";

  console.log(`${funcTag} API Gateway RequestId: ${lambdaRequestId} - Lambda RequestId: ${apiRequestId}`);

  if (event.resource === "/products") {
    if (event.httpMethod === 'POST') {
      console.log(`${funcTag} POST /products called`);
      const product = JSON.parse(event.body!) as Product;
      const productCreated = await productRepository.createProduct(product);

      const resp = await sendProductEvent(productCreated, ProductEventType.CREATED, "test@test.com", lambdaRequestId);
      console.log(`${funcTag} Product event sent:`, resp);
      return {
        statusCode: 201,
        body: JSON.stringify({
          product: productCreated,
          message: `Product with id: ${productCreated.productId} created successfully`,
          error: null
        })
      };
    };
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;
    if (event.httpMethod === 'PUT') {
      console.log(`${funcTag} PUT /products/${productId} called`);
      const product = JSON.parse(event.body!) as Product;
      try {
        const productUpdated = await productRepository.updateProduct(productId, product);
        const resp = await sendProductEvent(productUpdated, ProductEventType.UPDATED, "test@test.com", lambdaRequestId);
        console.log(`${funcTag} Product event sent:`, resp);
        return {
          statusCode: 200,
          body: JSON.stringify({
            product: productUpdated,
            message: `Product with id: ${productId} updated successfully`,
            error: null
          })
        };
      } catch (ConditionalCheckFailedException) {
        console.error(`${funcTag} Error updating product: Not Found`);
        return {
          statusCode: 404,
          body: JSON.stringify({
            product: null,
            message: `Product not found`,
            error: 'Not Found'
          })
        };
      }
    } else if (event.httpMethod === 'DELETE') {
      console.log(`${funcTag} DELETE /products/${productId} called`);
      try {
        const product = await productRepository.deleteProduct(productId);
        const resp = await sendProductEvent(product, ProductEventType.DELETED, "test@test.com", lambdaRequestId);
        console.log(`${funcTag} Product event sent:`, resp);
        return {
          statusCode: 200,
          body: JSON.stringify({
            product,
            message: `Product with id: ${productId} deleted successfully`,
            error: null
          })
        };
      } catch (error) {
        console.error(`${funcTag} Error deleting product:`, (<Error>error).message);
        return {
          statusCode: 404,
          body: JSON.stringify({
            product: null,
            message: `Error deleting product with id: ${productId}`,
            error: (<Error>error).message
          })
        };
      };
    };
  };

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Bad Request: Unsupported method or resource",
    })
  };
};

function sendProductEvent(product: Product, eventType: ProductEventType, email: string, lambdaRequestId: string) {
  const event: ProductEvent = {
    email: email,
    eventType: eventType,
    productId: product.productId,
    productCode: product.code,
    productPrice: product.price,
    resquestId: lambdaRequestId
  };

  lambdaClient.invoke({
    FunctionName: ProductsEventsFunctionName,
    Payload: JSON.stringify(event),
    InvocationType: 'RequestResponse'
  }).promise()
}