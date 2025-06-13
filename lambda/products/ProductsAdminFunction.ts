import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const funcTag = "ProductsAdminFunction";
export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // receive from APIGateway an event and return from APIGateway a response

  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext?.requestId || "N/A";

  console.log(`${funcTag} API Gateway RequestId: ${lambdaRequestId} - Lambda RequestId: ${apiRequestId}`);

  if (event.resource === "/products") {
    if (event.httpMethod === 'POST') {
      console.log(`${funcTag} POST /products called`);

      return {
        statusCode: 201,
        body: JSON.stringify({
          message: "Product created successfully",
        })
      };
    };
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;
    if (event.httpMethod === 'PUT') {
      console.log(`${funcTag} PUT /products/${productId} called`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Product with id: ${productId} updated successfully`,
        })
      };
    } else if (event.httpMethod === 'DELETE') {
      console.log(`${funcTag} DELETE /products/${productId} called`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Product with id: ${productId} deleted successfully`,
        })
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