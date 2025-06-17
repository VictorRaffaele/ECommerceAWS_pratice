import * as lamdba from 'aws-cdk-lib/aws-lambda';
import * as lamdbaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class ProductsAppStack extends cdk.Stack {
  // Config stack defines the Lambda function for fetching products
  readonly productsFetchHandler: lamdbaNodeJS.NodejsFunction;
  readonly productsAdminHandler: lamdbaNodeJS.NodejsFunction;
  readonly productsDdb: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the DynamoDB table for products
    this.productsDdb = new dynamodb.Table(this, 'ProductsDdb', {
      tableName: 'Products',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Used DESTROY for development purposes
      partitionKey: {
        name: 'productId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand billing mode
    });

    // Products Layer
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, 'ProductsLayerVersionArn');
    const productsLayer = lamdba.LayerVersion.fromLayerVersionArn(this, 'ProductsLayerVersionArn', productsLayerArn);

    // Define the Lambda function that fetches products from DynamoDB
    this.productsFetchHandler = new lamdbaNodeJS.NodejsFunction(this, 
        'ProductsFetchHandler', {
        runtime: lamdba.Runtime.NODEJS_20_X,
        functionName: 'ProductsFetchFunction',
        entry: 'lambda/products/productsFecthFunction.ts',
        handler: 'handler',
        memorySize: 512,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
          nodeModules: [
            'aws-xray-sdk-core',
          ]
        },
        environment: {
          PRODUCTS_DDB: this.productsDdb.tableName,
        },
        layers: [productsLayer],
        tracing: lamdba.Tracing.ACTIVE,
      }
    );
    // Grant read permissions to the fetch handler
    this.productsDdb.grantReadData(this.productsFetchHandler);

    this.productsAdminHandler = new lamdbaNodeJS.NodejsFunction(this, 
        'ProductsAdminFunction', {
        runtime: lamdba.Runtime.NODEJS_20_X,
        functionName: 'ProductsAdminFunction',
        entry: 'lambda/products/ProductsAdminFunction.ts',
        handler: 'handler',
        memorySize: 512,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
          nodeModules: [
            'aws-xray-sdk-core',
          ]
        },
        environment: {
          PRODUCTS_DDB: this.productsDdb.tableName,
        },
        layers: [productsLayer],
      }
    );
    // Grant write permissions to the admin handler
    this.productsDdb.grantWriteData(this.productsAdminHandler);
  }
}