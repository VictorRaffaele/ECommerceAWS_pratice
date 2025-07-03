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
    const orderRequestValidator = new apigateway.RequestValidator(this, 'OrderRequestValidator', {
      restApi: api,
      requestValidatorName: 'OrderRequestValidator',
      validateRequestBody: true,
    })
    const orderModel = new apigateway.Model(this, 'OrderModel', {
      modelName: 'OrderModel',
      restApi: api,
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          email: { type: apigateway.JsonSchemaType.STRING },
          productId: { 
            type: apigateway.JsonSchemaType.STRING,
            minItems: 1,
            items: { type: apigateway.JsonSchemaType.STRING }
          },
          payment: { 
            type: apigateway.JsonSchemaType.STRING,
            enum: ['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'PIX']
          },
          shipping: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              type: { 
                type: apigateway.JsonSchemaType.STRING,
                enum: ['ECONOMIC', 'URGENT']
              },
              carrier: { 
                type: apigateway.JsonSchemaType.STRING,
                enum: ['CORREIOS', 'SEDEX']
              }
            },
            required: ['type', 'carrier']
          }
        },
        required: ['email', 'productId', 'payment'],
      },
    });
    ordersResource.addMethod('POST', ordersIntegration, {
      requestValidator: orderRequestValidator,
      requestModels: { 'application/json': orderModel }
    });

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

    const productsRequestValidator = new apigateway.RequestValidator(this, 'ProductsRequestValidator', {
      restApi: api,
      requestValidatorName: 'ProductsRequestValidator',
      validateRequestBody: true,
    })
    const productsAdminModel = new apigateway.Model(this, 'ProductsAdminModel', {
      modelName: 'ProductsAdminModel',
      restApi: api,
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          productName: { type: apigateway.JsonSchemaType.STRING },
          code: { type: apigateway.JsonSchemaType.STRING },
          model: { type: apigateway.JsonSchemaType.STRING },
          price: { type: apigateway.JsonSchemaType.NUMBER },
          productUrl: { type: apigateway.JsonSchemaType.STRING },
        },
      required: ['productName', 'code']
      },
    });
    // POST /products
    productsResource.addMethod('POST', productsAdminIntegration, {
      requestValidator: productsRequestValidator,
      requestModels: { 'application/json': productsAdminModel }
    });

    // PUT /products/{id}
    productsIdResoutce.addMethod('PUT', productsAdminIntegration, {
      requestValidator: productsRequestValidator,
      requestModels: { 'application/json': productsAdminModel }
    });

    // DELETE /products/{id}
    productsIdResoutce.addMethod('DELETE', productsAdminIntegration);
  }
}