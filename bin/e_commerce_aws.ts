#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { EcommerceApiStack } from '../lib/e_commerceApi-stack';

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

const productsAppStack = new ProductsAppStack(app, 'ProductsApp', {
  tags: tags,
  env: env,
})

const ECommerceApiStack = new EcommerceApiStack(app, 'EcommerceApi', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  tags: tags,
  env: env,
});
ECommerceApiStack.addDependency(productsAppStack);