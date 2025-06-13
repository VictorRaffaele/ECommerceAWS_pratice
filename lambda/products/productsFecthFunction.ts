import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const funcTag = "ProductsFetchFunction";
export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // receive from APIGateway an event and return from APIGateway a response

  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext?.requestId || "N/A";

  console.log(`${funcTag} API Gateway RequestId: ${lambdaRequestId} - Lambda RequestId: ${apiRequestId}`);
  const method = event.httpMethod;
  if (event.resource === "/products") {
    if (method === 'GET') {
      console.log(`${funcTag} GET /products called`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Products fetched successfully",
        })
      };
    };
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string
    console.log(`${funcTag} GET /products/${productId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Product fetched by id: ${productId} successfully`,
      })
    };
  };

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Bad Request: Unsupported method or resource",
    })
  };
}