import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { v4 as uuidv4 } from 'uuid';

export interface Product {
  productId: string;
  productName: string;
  code: string;
  price: number;
  model: string;
  productUrl: string;
}

export class ProductRepository {
  private ddbClient: DocumentClient;
  private productsDdb: string;

  constructor(ddbClient: DocumentClient, productsDdb: string) {
    this.ddbClient = ddbClient;
    this.productsDdb = productsDdb;
  }

  async getAllProducts(): Promise<Product[]> {
    const funcTag = 'getAllProducts';
    console.log(`${funcTag} Fetching all products from DynamoDB`);

    const data = await this.ddbClient.scan({
      TableName: this.productsDdb
    }).promise()

    if (!data.Items) {
      console.error(`${funcTag} No products found in DynamoDB`);
      return [];
    }
    console.log(`${funcTag} Successfully fetched ${data.Items.length} products`);
    return data.Items as Product[];
  };

  async getProductById(productId: string): Promise<Product> {
    const funcTag = 'getProductById';
    console.log(`${funcTag} Fetching product with ID: ${productId}`);

    const data = await this.ddbClient.get({
      TableName: this.productsDdb,
      Key: { productId }
    }).promise();

    if (!data.Item) {
      console.error(`${funcTag} Product with ID: ${productId} not found`);
      throw new Error(`Product with ID: ${productId} not found`);
    }
    console.log(`${funcTag} Successfully fetched product with ID: ${productId}`);
    return data.Item as Product;
  }

  async getProductByIds(productIds: string[]): Promise<Product[]> {
    const funcTag = 'getProductByIds';
    console.log(`${funcTag} Fetching products with IDs: ${productIds.join(', ')}`);
    
    const keys: {id: string;}[] = []
    productIds.forEach(productId => {
      keys.push({ id: productId });
    });
    const data = this.ddbClient.batchGet({
      RequestItems: {
        [this.productsDdb]: {
          Keys: keys
        }
      }
    }).promise();
    return (await data).Responses![this.productsDdb] as Product[];
  }


  async createProduct(product: Product): Promise<Product> {
    const funcTag = 'createProduct';
    console.log(`${funcTag} Creating product with name: ${product.productName}`);

    product.productId = uuidv4();
    await this.ddbClient.put({
      TableName: this.productsDdb,
      Item: product
    }).promise();
    return product;
  }

  async deleteProduct(productId: string): Promise<Product> {
    const funcTag = 'deleteProduct';
    console.log(`${funcTag} Deleting product with ID: ${productId}`);

    const data = await this.ddbClient.delete({
      TableName: this.productsDdb,
      Key: { productId },
      ReturnValues: 'ALL_OLD'
    }).promise();

    if (!data.Attributes) {
      console.error(`${funcTag} Product with ID: ${productId} not found`);
      throw new Error(`Product with ID: ${productId} not found`);
    }
    console.log(`${funcTag} Successfully deleted product with ID: ${productId}`);
    return data.Attributes as Product;
  }

  async updateProduct(productId: string, product: Product): Promise<Product> {
    const funcTag = 'updateProduct';
    console.log(`${funcTag} Updating product with ID: ${productId}`);

    const data = await this.ddbClient.update({
      TableName: this.productsDdb,
      Key: { productId },
      ConditionExpression: 'attribute_exists(productId)',
      ReturnValues: 'UPDATED_NEW',
      UpdateExpression: 'set productName = :productName, code = :code, price = :price, model = :model, productUrl = :productUrl',
      ExpressionAttributeValues: {
        ':productName': product.productName,
        ':code': product.code,
        ':price': product.price,
        ':model': product.model,
        ':productUrl': product.productUrl
      }
    }).promise();
    data.Attributes!.id = productId;
    return data.Attributes as Product;
  }
}