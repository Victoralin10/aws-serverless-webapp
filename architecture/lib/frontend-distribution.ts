
import { Construct } from 'constructs';

import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';

interface SpaArchProps {
}

export class SpaArch extends Construct {

  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SpaArchProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.distribution = new cloudfront.Distribution(this, 'Cloudfront', {
      defaultBehavior: {
        origin: new cloudfrontOrigins.S3Origin(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, 'DefaultResponseHeadersPolicy', {
          customHeadersBehavior: {
            customHeaders: [{
              header: 'Cache-Control',
              value: 'public, max-age=60',
              override: true,
            }]
          }
        }),
      },
      additionalBehaviors: {
        "/assets/*": {
          origin: new cloudfrontOrigins.S3Origin(this.bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: new cloudfront.CachePolicy(this, 'CachePolicy', {
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
            headerBehavior: cloudfront.CacheHeaderBehavior.none(),
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true,
            defaultTtl: Duration.days(365),
          }),
          responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, 'AssetsResponseHeadersPolicy', {
            customHeadersBehavior: {
              customHeaders: [{
                header: 'Cache-Control',
                value: 'public, max-age=31536000',
                override: true,
              }]
            },
          }),
        }
      },
      defaultRootObject: 'index.html',
      errorResponses: [{
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
      }],
      enableIpv6: true,
    });

    new CfnOutput(this, 'WebUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
    });
  }
}
