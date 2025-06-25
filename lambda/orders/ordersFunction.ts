import { DynamoDB } from 'aws-sdk';
import * as AWSXRay from 'aws-xray-sdk-core';
import { OrdersRepository, Order } from '/opt/nodejs/ordersLayer';
import { ProductRepository, Product } from '/opt/nodejs/productsLayer';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { CarrierType, OrderProductResponse, OrderRequest, OrderResponse, PaymentType, ShippingType } from './layers/orderApiLayer/nodejs/ordersApi';

AWSXRay.captureAWS(require('aws-sdk'));
const ordersDdb = process.env.ORDERS_DDB!;
const productsDdb = process.env.PRODUCTS_DDB!;
const ddbClient = new DynamoDB.DocumentClient();
const ordersRepository = new OrdersRepository(ddbClient, ordersDdb);
const productsRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const funcTag = 'OrdersFunction';
  console.log(`${funcTag} Received event: ${JSON.stringify(event)}`);

  const method = event.httpMethod;
  const apiRequestId = event.requestContext.requestId;
  const lambdaRequestId = context.awsRequestId;
  console.log(`${funcTag} Method: ${method}, API Request ID: ${apiRequestId}, Lambda Request ID: ${lambdaRequestId}`);

    if (method === 'GET') {
      if (event.queryStringParameters) {
        const email = event.queryStringParameters?.email;
        const orderId = event.queryStringParameters?.orderId;

        if (email) {
          if (orderId) {
            // Fetch one order from user
            try {
              const order = await ordersRepository.getOrderByIdEmail(email, orderId);
              return {
                statusCode: 200,
                body: JSON.stringify({
                  message: 'Order fetched successfully',
                  data: convertOrderToResponse(order),
                })
              };
            } catch (error) {
              console.error(`${funcTag} Error fetching order:`, (<Error>error).message);
              return {
                statusCode: 404,
                body: JSON.stringify({
                  message: (<Error>error).message,
                  data: null,
                })
              };
            }
          } else {
            // Fetch all orders from user
            const orders = await ordersRepository.getOrderByEmail(email);
            const data: OrderResponse[] = orders.map(order => convertOrderToResponse(order));
            
            return {
              statusCode: 200,
              body: JSON.stringify({
                message: 'Orders fetched successfully',
                data: data,
              })
            };
          }
        } 
      } else {
        // Fetch all orders
        const orders = await ordersRepository.getAllOrders();
        const data: OrderResponse[] = orders.map(order => convertOrderToResponse(order));
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Orders fetched successfully',
            data: data,
          })
        };
      }
    } else if (method === 'POST') {
      const orderRequest = JSON.parse(event.body!) as OrderRequest;
      const products = await productsRepository.getProductByIds(orderRequest.productIds);

      if (products.length === orderRequest.productIds.length) {
        const order = buildOrder(orderRequest, products);
        const createdOrder = await ordersRepository.createOrder(order);

        return {
          statusCode: 201,
          body: JSON.stringify({
            message: 'Order created successfully',
            data: convertOrderToResponse(createdOrder),
          })
        };
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: 'Some products not found',
            data: null,
          })
        };
      }

    } else if (method === 'DELETE') {
      try {
        const email = event.queryStringParameters!.email!;
        const orderId = event.queryStringParameters!.orderId!;
        const orderDeleted = await ordersRepository.deleteOrder(email, orderId);
      
        if (orderDeleted) {
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Order deleted successfully',
              data: convertOrderToResponse(orderDeleted),
            })
          };
        }
      } catch (error) {
        console.error(`${funcTag} Error deleting order:`, (<Error>error).message);
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: (<Error>error).message,
            data: null,
          })
        };
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Bad Request',
        data: null,
      })
    };
}

function buildOrder(orderRequest: OrderRequest, products: Product[]): Order {
  const orderProduct: OrderProductResponse[] = []
  let totalPrice = 0;

  products.forEach(product => {
    totalPrice += product.price;
    orderProduct.push({
      code: product.code,
      price: product.price
    });
  });
  const order: Order = {
    pk: orderRequest.email,
    billing: {
      paymentMethod: orderRequest.payment,
      totalPrice: totalPrice
    },
    shipping: {
      type: orderRequest.shipping.type,
      carrier: orderRequest.shipping.carrier
    },
    products: orderProduct
  }
  return order;
}

function convertOrderToResponse(order: Order): OrderResponse {
  const orderProducts: OrderProductResponse[] = order.products.map(product => ({
    code: product.code,
    price: product.price
  }));
  const orderResponse: OrderResponse = {
    email: order.pk,
    id: order.sk!,
    createdAt: order.createdAt!,
    products: orderProducts,
    billing: {
      paymentMethod: order.billing.paymentMethod as PaymentType,
      totalPrice: order.billing.totalPrice
    },
    shipping: {
      type: order.shipping.type as ShippingType,
      carrier: order.shipping.carrier as CarrierType
    }
  };
  return orderResponse;
}