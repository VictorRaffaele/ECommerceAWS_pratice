import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { v4 as uuidv4 } from 'uuid';

export interface OrderProduct {
  code: string;
  price: number;
}

export interface Order {
  pk: string;
  sk?: string;
  createdAt?: number;
  shipping: {
    type: "URGENT" | "ECONOMIC";
    carrier: 'CORREIOS' | 'SEDEX';
  };
  billing: {
    paymentMethod: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CASH';
    totalPrice: number;
  },
  products: OrderProduct[];
}

export class OrdersRepository {
  private ddbClient: DocumentClient
  private ordersDdb: string;

  constructor(ddbClient: DocumentClient, ordersDdb: string) {
    this.ddbClient = ddbClient;
    this.ordersDdb = ordersDdb;
  }

  async createOrder(order: Order): Promise<Order> {
    const funcTag = 'createOrder';
    console.log(`${funcTag} Creating order for user: ${order.pk}`);

    order.sk = uuidv4();
    order.createdAt = Date.now();
    await this.ddbClient.put({
      TableName: this.ordersDdb,
      Item: order
    }).promise();
    
    console.log(`${funcTag} Order created successfully with ID: ${order.sk}`);
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    const funcTag = 'getAllOrders';
    console.log(`${funcTag} Fetching all orders`);

    const data = await this.ddbClient.scan({
      TableName: this.ordersDdb
    }).promise();

    console.log(`${funcTag} Successfully fetched ${data.Items?.length || 0} orders`);
    return data.Items as Order[];
  }

  async getOrderByEmail(email: string): Promise<Order[]> {
    const funcTag = 'getOrderByEmail';
    console.log(`${funcTag} Fetching orders for email: ${email}`);

    const data = await this.ddbClient.query({
      TableName: this.ordersDdb,
      KeyConditionExpression: 'pk = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    }).promise();

    console.log(`${funcTag} Successfully fetched ${data.Items?.length || 0} orders for email: ${email}`);
    return data.Items as Order[];
  }

  async getOrderByIdEmail(email: string, orderId: string): Promise<Order> {
    const funcTag = 'getOrderByIdEmail';
    console.log(`${funcTag} Fetching order with ID: ${orderId} for email: ${email}`);
    
    const data = await this.ddbClient.get({
      TableName: this.ordersDdb,
      Key: {
        pk: email,
        sk: orderId
      }
    }).promise();

    if (!data.Item){
      throw new Error(`Order with ID: ${orderId} not found`);
    }
    console.log(`${funcTag} Successfully fetched order with ID: ${orderId}`);
    return data.Item as Order;
  }

  async deleteOrder(email: string, orderId: string): Promise<Order> {
    const funcTag = 'deleteOrder';
    console.log(`${funcTag} Deleting order with ID: ${orderId} for email: ${email}`);
    
    const data = await this.ddbClient.delete({
      TableName: this.ordersDdb,
      Key: {
        pk: email,
        sk: orderId
      },
      ReturnValues: 'ALL_OLD'
    }).promise();

    if (!data.Attributes) {
      throw new Error(`Order with ID: ${orderId} not found`);
    } 
    console.log(`${funcTag} Successfully deleted order with ID: ${orderId}`);
    return data.Attributes as Order;
  }
}