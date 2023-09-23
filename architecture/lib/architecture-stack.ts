import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';

import { SpaArch } from './frontend-distribution';
import { FrontendPipeline } from './frontend-pipeline';


export class ArchitectureStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Frontend
    const frontendDistribution = new SpaArch(this, 'Cloudfront', {});

    // Pipelines
    const frontendRepo = codecommit.Repository.fromRepositoryName(this, 'FrontendRepo', process.env.FRONTEND_REPO || '');

    new FrontendPipeline(this, 'FrontendPipeline', {
      distribution: frontendDistribution.distribution,
      repository: frontendRepo,
      branch: process.env.FRONTEND_BRANCH || '',
      bucketSite: frontendDistribution.bucket,
      wsUrl: `${process.env.WS_URL}`,
    });
  }
}
