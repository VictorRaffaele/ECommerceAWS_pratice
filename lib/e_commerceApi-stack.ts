import * as lamdbaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cwlogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';


interface EcommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lamdbaNodeJS.NodejsFunction;
  productsAdminHandler: lamdbaNodeJS.NodejsFunction;
  ordersHandler: lamdbaNodeJS.NodejsFunction;
}

export class EcommerceApiStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: EcommerceApiStackProps) {
    super(scope, id, props);

    const logGroup = new cwlogs.LogGroup(this, 'EcommerceApiLogGroup');
    const api = new apigateway.RestApi(this, 'EcommerceApi', {
      restApiName: 'ECommerceAPI',
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true,
        }),
      }
    });

    this.productsService(props, api);
    this.ordersService(props, api);
  }

  private ordersService(props: EcommerceApiStackProps, api: apigateway.RestApi) {
    const ordersIntegration = new apigateway.LambdaIntegration(props.ordersHandler);

    // resource - /orders
    const ordersResource = api.root.addResource('orders');

    // GET /orders
    // GET /orders?email={email}
    // GET /orders?email={email}&orderId={orderId}
    ordersResource.addMethod('GET', ordersIntegration);

    // POST /orders
    ordersResource.addMethod('POST', ordersIntegration);

    const orderDeletetionValidator = new apigateway.RequestValidator(this, 'OrderDeletionValidator', {
      restApi: api,
      requestValidatorName: 'OrderDeletionValidator',
      validateRequestParameters: true,
    });
    // DELETE /orders?email={email}&orderId={orderId}
    ordersResource.addMethod('DELETE', ordersIntegration, {
      requestParameters: {
        'method.request.querystring.email': true,
        'method.request.querystring.orderId': true,
      },
      requestValidator: orderDeletetionValidator
    });
  }

  private productsService(props: EcommerceApiStackProps, api: apigateway.RestApi) {
    const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler);

    // GET /products
    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', productsFetchIntegration);

    // /products/{id}
    const productsIdResoutce = productsResource.addResource('{id}');
    productsIdResoutce.addMethod('GET', productsFetchIntegration);

    const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler);

    // POST /products
    productsResource.addMethod('POST', productsAdminIntegration);

    // PUT /products/{id}
    productsIdResoutce.addMethod('PUT', productsAdminIntegration);

    // DELETE /products/{id}
    productsIdResoutce.addMethod('DELETE', productsAdminIntegration);
  }
}