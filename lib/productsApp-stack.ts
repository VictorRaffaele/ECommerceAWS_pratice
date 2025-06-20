import * as lamdba from 'aws-cdk-lib/aws-lambda';
import * as lamdbaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface productsAppStackProps extends cdk.StackProps {
  eventDdb: dynamodb.Table;
}

export class ProductsAppStack extends cdk.Stack {
  // Config stack defines the Lambda function for fetching products
  readonly productsFetchHandler: lamdbaNodeJS.NodejsFunction;
  readonly productsAdminHandler: lamdbaNodeJS.NodejsFunction;
  readonly productsDdb: dynamodb.Table;

  constructor(scope: Construct, id: string, props: productsAppStackProps) {
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

    const productEventHandler =  new lamdbaNodeJS.NodejsFunction(this, 
        'ProductsEventsFunction', {
        runtime: lamdba.Runtime.NODEJS_20_X,
        functionName: 'ProductsEventsFunction',
        entry: 'lambda/products/productsEventsFunction.ts',
        handler: 'handler',
        memorySize: 512,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          minify: true,
          sourceMap: false,
          nodeModules: [
            'aws-xray-sdk-core',
          ]
        },
        environment: {
          EVENTS_DDB: props.eventDdb.tableName,
        },
        tracing: lamdba.Tracing.ACTIVE,
        insightsVersion: lamdba.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    );
    props.eventDdb.grantWriteData(productEventHandler);

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
        insightsVersion: lamdba.LambdaInsightsVersion.VERSION_1_0_119_0,
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
          PRODUCTS_EVENTS_FUNCTION: productEventHandler.functionName,
        },
        layers: [productsLayer],
        tracing: lamdba.Tracing.ACTIVE,
        insightsVersion: lamdba.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    );
    // Grant write permissions to the admin handler
    this.productsDdb.grantWriteData(this.productsAdminHandler);
    productEventHandler.grantInvoke(this.productsAdminHandler);
  }
}