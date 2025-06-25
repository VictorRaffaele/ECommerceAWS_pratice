import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';

interface OrdersAppStackProps extends cdk.StackProps {
  productsDdb: dynamodb.Table;
}

export class OrdersAppStack extends cdk.Stack {
  readonly ordersHandler: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: OrdersAppStackProps) {
    super(scope, id, props);

    const orderDdb = new dynamodb.Table(this, 'OrdersDdb', {
      tableName: 'orders',
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    // Orders Layer
    const ordersLayerArn = ssm.StringParameter.valueForStringParameter(this, 'OrderLayerVersionArn');
    const ordersLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OrderLayerVersionArn', ordersLayerArn);

    // Orders API Layer
    const ordersApiLayerArn = ssm.StringParameter.valueForStringParameter(this, 'ordersApiLayerArn');
    const ordersApiLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ordersApiLayerArn', ordersApiLayerArn);

    // Products Layer
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, 'ProductsLayerVersionArn');
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ProductsLayerVersionArn', productsLayerArn);
  
    this.ordersHandler = new lambdaNodejs.NodejsFunction(this, 'OrdersFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: 'OrdersFunction',
      entry: 'lambda/orders/ordersFunction.ts',
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
        PRODUCTS_DDB: props.productsDdb.tableName,
        ORDERS_DDB: orderDdb.tableName,
      },
      layers: [ordersLayer, productsLayer, ordersApiLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    })

    orderDdb.grantReadWriteData(this.ordersHandler);
    props.productsDdb.grantReadData(this.ordersHandler);
  }
}