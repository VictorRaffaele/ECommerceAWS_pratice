import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';

interface OrdersAppStackProps extends cdk.StackProps {
  productsDdb: dynamodb.Table;
  eventsDdb: dynamodb.Table;
}

export class OrdersAppStack extends cdk.Stack {
  readonly ordersHandler: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: OrdersAppStackProps) {
    super(scope, id, props);

    const orderDdb = new dynamodb.Table(this, 'OrdersDdb', {
      tableName: 'Orders',
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
    const ordersApiLayerArn = ssm.StringParameter.valueForStringParameter(this, 'OrderApiLayerVersionArn');
    const ordersApiLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OrderApiLayerVersionArn', ordersApiLayerArn);

    // Orders Events Layer
    const ordersEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, 'OrdeEventsLayerVersionArn');
    const ordersEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OrdeEventsLayerVersionArn', ordersEventsLayerArn);

    // Products Layer
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, 'ProductsLayerVersionArn');
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ProductsLayerVersionArn', productsLayerArn);
  
    const ordersTopic = new sns.Topic(this, 'OrdersEventTopic', {
      displayName: 'Orders Event Topic',
      topicName: 'order-events',
    });
    
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
        ORDER_EVENTS_TOPIC_ARN: ordersTopic.topicArn
      },
      layers: [ordersLayer, productsLayer, ordersApiLayer, ordersEventsLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    })

    const orderEventsHandler = new lambdaNodejs.NodejsFunction(this, 'OrdersEventsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: 'OrdersEventsFunction',
      entry: 'lambda/orders/ordersEventsFunction.ts',
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
        EVENTS_DDB: props.eventsDdb.tableName
      },
      layers: [ordersEventsLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    })

    orderDdb.grantReadWriteData(this.ordersHandler);
    props.productsDdb.grantReadData(this.ordersHandler);
    ordersTopic.grantPublish(this.ordersHandler);
    ordersTopic.addSubscription(new subs.LambdaSubscription(orderEventsHandler));

    const eventsDdbPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:PutItem"],
      resources: [props.eventsDdb.tableArn],
      conditions: {
        ['ForAllValues:StringLike']: {
          'dynamodb:LeadingKeys': ['#order_*']
        }
      }
    })
    orderEventsHandler.addToRolePolicy(eventsDdbPolicy);
  }
}