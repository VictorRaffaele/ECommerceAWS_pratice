import * as lamdba from 'aws-cdk-lib/aws-lambda';
import * as lamdbaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ProductsAppStack extends cdk.Stack {
  // Config stack defines the Lambda function for fetching products
  readonly productsFetchHandler: lamdbaNodeJS.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.productsFetchHandler = new lamdbaNodeJS.NodejsFunction(this, 
      'ProductsFetchHandler', {
        runtime: lamdba.Runtime.NODEJS_18_X,
        functionName: 'ProductsFetchFunction',
        entry: 'lambda/products/productsFetchFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
      })
  }
}