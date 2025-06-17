import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB } from 'aws-sdk';
import * as AWSXRay from 'aws-xray-sdk-core';

AWSXRay.captureAWS(require('aws-sdk'));
const productsDdb = process.env.PRODUCTS_DDB || "";
const ddbClient = new DynamoDB.DocumentClient();
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