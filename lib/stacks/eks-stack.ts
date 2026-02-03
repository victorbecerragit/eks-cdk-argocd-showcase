import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import { EKSConfig } from '../config/environment-config';
import { EksClusterConstruct } from '../constructs/eks-cluster-construct';
import { AlbControllerConstruct } from '../constructs/alb-controller-construct';

interface EksStackProps extends cdk.StackProps {
    vpc: ec2.IVpc;
    eksConfig: EKSConfig;
}

export class EksStack extends cdk.Stack {
    public readonly cluster: eks.Cluster;

    constructor(scope: Construct, id: string, props: EksStackProps) {
        super(scope, id, props);

        const eksConstruct = new EksClusterConstruct(this, 'EksClusterConstruct', {
            vpc: props.vpc,
            config: props.eksConfig,
        });
        this.cluster = eksConstruct.cluster;

        new AlbControllerConstruct(this, 'AlbControllerConstruct', {
            cluster: this.cluster,
        });

        // Add other EKS add-ons or configuration here
    }
}
