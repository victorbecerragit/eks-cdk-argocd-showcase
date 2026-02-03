import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { S3StorageConstruct } from '../constructs/s3-storage-construct';

export class StorageStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        new S3StorageConstruct(this, 'S3StorageConstruct');
    }
}
