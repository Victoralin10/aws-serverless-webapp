
import { Construct } from 'constructs';
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipelineActions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

interface FrontendPipelineProps {
  readonly repository: codecommit.IRepository;
  readonly branch: string;
  readonly bucketSite: s3.IBucket;
  readonly distribution: cloudfront.IDistribution;

  readonly wsUrl: string;
}


export class FrontendPipeline extends Construct {

  constructor(scope: Construct, id: string, props: FrontendPipelineProps) {
    super(scope, id);

    const pipeline = new codepipeline.Pipeline(this, 'FrontendPipeline');
    const sourceOutput = new codepipeline.Artifact('SourceOutput');

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipelineActions.CodeCommitSourceAction({
          repository: props.repository,
          actionName: 'Source',
          output: sourceOutput,
          branch: props.branch,
        })]
    });

    const codebuildProject = new codebuild.PipelineProject(this, 'FrontendCodeBuild', {
      environment: {
        environmentVariables: {
          'BucketSite': {
            value: props.bucketSite.bucketName,
          },
          'DistributionID': {
            value: props.distribution.distributionId,
          },
          'VITE_WS_URL': {
            value: props.wsUrl
          }
        },
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
      },
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 18
            },
            commands: [
              'cd webapp',
              'if [ -f /root/node-cache.tar.gz ]; then tar xfz /root/node-cache.tar.gz; fi',
              'npm install'
            ]
          },
          build: {
            commands: [
              'npm run build'
            ]
          },
          post_build: {
            commands: [
              'aws s3 sync --quiet --delete dist/ s3://$BucketSite/',
              'aws cloudfront create-invalidation --distribution-id $DistributionID --paths "/index.html"',
              'tar cfz /root/node-cache.tar.gz node_modules'
            ]
          }
        },
        cache: {
          paths: [
            '/root/node-cache.tar.gz'
          ]
        }
      }),
    });
    codebuildProject.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:putObject', 's3:getObject', 's3:deleteObject', 's3:listBucket'],
      resources: [
        props.bucketSite.bucketArn,
        props.bucketSite.bucketArn + '/*',
      ]
    }));
    codebuildProject.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cloudfront:CreateInvalidation'],
      resources: ['*']
    }));

    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipelineActions.CodeBuildAction({
          actionName: 'Build',
          input: sourceOutput,
          project: codebuildProject,
        })
      ]
    });
  }
}
