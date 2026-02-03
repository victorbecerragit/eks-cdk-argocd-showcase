import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment-config';
import { EksClusterConstruct } from '../constructs/eks-cluster-construct';
import { AlbControllerConstruct } from '../constructs/alb-controller-construct';

export interface EksStackProps extends cdk.StackProps {
    vpc: ec2.IVpc;
    config: EnvironmentConfig;
}

/**
 * EKS Stack
 * 
 * Orchestrates the creation of the Kubernetes cluster environment:
 * 1. EKS Control Plane & Worker Nodes
 * 2. AWS Load Balancer Controller (for Ingress)
 * 3. IAM Roles & Security Groups
 */
export class EksStack extends cdk.Stack {
    public readonly cluster: eks.Cluster;

    constructor(scope: Construct, id: string, props: EksStackProps) {
        super(scope, id, props);

        const { vpc, config } = props;

        /**
         * 1. Create EKS Cluster
         * Includes control plane, node groups, and basic security
         */
        const eksConstruct = new EksClusterConstruct(this, 'EksClusterConstruct', {
            vpc: vpc,
            config: config.eks,
        });
        
        this.cluster = eksConstruct.cluster;

        /**
         * 2. Install AWS Load Balancer Controller
         * Enables Ingress resources to provision ALBs
         */
        new AlbControllerConstruct(this, 'AlbControllerConstruct', {
            cluster: this.cluster,
            vpcId: vpc.vpcId,
            region: this.region,
        });
    }
}

