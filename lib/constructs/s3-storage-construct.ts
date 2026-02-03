import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class S3StorageConstruct extends Construct {
    public readonly bucket: s3.Bucket;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // TODO: Implement S3 Bucket creation
        // 1. Create Bucket with encryption
        // 2. Enforce SSL

        /*
        this.bucket = new s3.Bucket(this, 'StorageBucket', {
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY, 
        });
        */

        // Placeholder
        this.bucket = {} as s3.Bucket;
    }
}
