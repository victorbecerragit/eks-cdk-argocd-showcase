import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { S3Config } from '../config/environment-config';

export interface S3StorageConstructProps {
    config: S3Config;
    envName: string;
}

/**
 * S3 Storage Construct
 * 
 * Creates secure S3 buckets for the environment.
 * Features:
 * - Encryption at rest (AES-256)
 * - SSL enforcement via bucket policy
 * - Public access blocked
 * - Versioning and lifecycle management based on config
 * - Environment-aware removal policy
 */
export class S3StorageConstruct extends Construct {
    public readonly bucket: s3.Bucket;

    constructor(scope: Construct, id: string, props: S3StorageConstructProps) {
        super(scope, id);

        const { config, envName } = props;
        const isProd = envName === 'prod';

        /**
         * S3 Bucket Creation
         * 
         * Best practices applied:
         * - BlockAllPublicAccess: Security baseline
         * - EnforceSSL: Transit encryption
         * - Encryption: S3 Managed (AES-256) for cost efficiency
         * - Versioning: Recovery from accidental deletes/overwrites
         */
        this.bucket = new s3.Bucket(this, 'ArtifactBucket', {
            bucketName: `${config.bucketNamePrefix}-${envName}-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
            
            // Security
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,

            // Data Management
            versioned: config.enableVersioning,
            
            // Lifecycle Rules (Cost Optimization)
            lifecycleRules: [
                {
                    id: 'TransitionToIA',
                    enabled: true,
                    // Transition to Infrequent Access after X days
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: cdk.Duration.days(config.lifecycleDays > 30 ? 30 : config.lifecycleDays),
                        }
                    ],
                    // Expire non-current versions to save space
                    noncurrentVersionExpiration: cdk.Duration.days(config.lifecycleDays),
                }
            ],

            // Cleanup behavior
            removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: !isProd, // Only auto-delete in non-prod
        });

        // Output bucket name
        new cdk.CfnOutput(this, 'BucketName', {
            value: this.bucket.bucketName,
            description: 'Artifact S3 Bucket Name',
            exportName: `EksShowcase-${envName}-BucketName`,
        });
    }
}

