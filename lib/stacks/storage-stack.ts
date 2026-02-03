import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3StorageConstruct } from '../constructs/s3-storage-construct';
import { EnvironmentConfig } from '../config/environment-config';

interface StorageStackProps extends cdk.StackProps {
    config: EnvironmentConfig;
}

/**
 * Storage Stack
 * 
 * Manages persistent storage resources for the environment, primarily S3.
 * Separated from EKS/Network stacks to allow independent lifecycle management.
 */
export class StorageStack extends cdk.Stack {
    public readonly bucket: cdk.aws_s3.Bucket;

    constructor(scope: Construct, id: string, props: StorageStackProps) {
        super(scope, id, props);

        const { config } = props;

        // Create S3 Construct for artifact storage
        const storage = new S3StorageConstruct(this, 'S3Storage', {
            config: config.s3,
            envName: config.envName,
        });

        this.bucket = storage.bucket;
    }
}

