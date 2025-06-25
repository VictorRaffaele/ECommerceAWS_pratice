import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class OrdersAppLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const orderLayer = new lambda.LayerVersion(this, 'OrderLayer', {
      code: lambda.Code.fromAsset('lambda/orders/layers/orderLayer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      layerVersionName: 'OrderLayer',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ssm.StringParameter(this, 'OrderLayerVersionArn', {
      parameterName: 'OrderLayerVersionArn',
      stringValue: orderLayer.layerVersionArn,
    });

    const orderApiLayer = new lambda.LayerVersion(this, 'orderApiLayer', {
      code: lambda.Code.fromAsset('lambda/orders/layers/orderApiLayer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      layerVersionName: 'orderApiLayer',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ssm.StringParameter(this, 'OrderApiLayerVersionArn', {
      parameterName: 'OrderApiLayerVersionArn',
      stringValue: orderApiLayer.layerVersionArn,
    });
  }
}
