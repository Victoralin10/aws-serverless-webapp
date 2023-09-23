#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ArchitectureStack } from '../lib/architecture-stack';

const app = new cdk.App();

new ArchitectureStack(app, 'FrontendArchitectureStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});

app.synth();
