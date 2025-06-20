#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { EcommerceApiStack } from '../lib/e_commerceApi-stack';
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack';
import { EventDdbStack } from 'lib/eventDdb-stack';

dotenv.config();
const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const tags = {
  cost: "ECommerce",
  team: "VictorPratice"
}

const eventDdbStack = new EventDdbStack(app, 'EventsDdb', {
  tags: tags,
  env: env,
});

const productsAppLayersStack = new ProductsAppLayersStack(app, 'ProductsAppLayers', {
  tags: tags,
  env: env,
});

const productsAppStack = new ProductsAppStack(app, 'ProductsApp', {
  eventDdb: eventDdbStack.table,
  tags: tags,
  env: env,
});
productsAppStack.addDependency(productsAppLayersStack);
productsAppStack.addDependency(eventDdbStack);


const ECommerceApiStack = new EcommerceApiStack(app, 'EcommerceApi', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  tags: tags,
  env: env,
});
ECommerceApiStack.addDependency(productsAppStack);