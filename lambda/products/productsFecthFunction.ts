import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB } from 'aws-sdk';
import { error } from "console";

const productsDdb = process.env.PRODUCTS_DDB || "";
const ddbClient = new DynamoDB.DocumentClient();
const productRepository = new ProductRepository(ddbClient, productsDdb);
const funcTag = "ProductsFetchFunction";

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // receive from APIGateway an event and return from APIGateway a response

  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext?.requestId || "N/A";

  console.log(`${funcTag} API Gateway RequestId: ${lambdaRequestId} - Lambda RequestId: ${apiRequestId}`);
  const method = event.httpMethod;

  try {
    let body;

    if (method === 'GET') {
      if (event.resource === "/products") {
        console.log(`${funcTag} GET /products called`);
        const product = await productRepository.getAllProducts();
        body = {
          product,
          message: `Products fetched successfully`,
          error: null
        }
      } else if (event.resource === "/products/{id}") {
        const productId = event.pathParameters!.id as string
        console.log(`${funcTag} GET /products/${productId}`);
        const product = await productRepository.getProductById(productId);
        body = {
          product,
          message: `Product with ID: ${productId} fetched successfully`,
          error: null
        };
      };
    };
    return {
      statusCode: 200,
      body: JSON.stringify({body})
    };
  } catch (error) {
    console.error(`${funcTag} Error processing request:`, (<Error>error).message);
    return {
      statusCode: 404,
      body: JSON.stringify({
        product: null,
        message: `Error processing request`,
        error: (<Error>error).message
      })
    };
  };
}