import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { EKSConfig } from '../config/environment-config';

export interface EksClusterConstructProps {
    vpc: ec2.IVpc;
    config: EKSConfig;
}

export class EksClusterConstruct extends Construct {
    public readonly cluster: eks.Cluster;

    constructor(scope: Construct, id: string, props: EksClusterConstructProps) {
        super(scope, id);

        // TODO: Implement EKS cluster creation logic
        // 1. Create EKS Cluster
        // 2. Add Managed Node Groups
        // 3. Configure Output/Exports

        // Placeholder for cluster creation
        /*
        this.cluster = new eks.Cluster(this, 'EksCluster', {
            version: eks.KubernetesVersion.of(props.config.version),
            vpc: props.vpc,
            defaultCapacity: 0,
            // ... other config
        });
        */

        // Temporary placeholder to satisfy typescript until implementation
        // Remove this when implementing real cluster
        this.cluster = {} as eks.Cluster;
    }
}
