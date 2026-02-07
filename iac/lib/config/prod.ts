import { EnvironmentConfig, validateEnvironmentConfig } from './environment-config';

export const ProdConfig: EnvironmentConfig = {
    envName: 'prod',
    account: process.env.CDK_DEFAULT_ACCOUNT || '',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    vpc: {
        cidr: '10.2.0.0/16',
        maxAzs: 3, // Full HA across 3 AZs
        natGateways: 3, // One NAT per AZ for HA
        enableVpcFlowLogs: true,
    },
    eks: {
        version: '1.31', // Latest stable version
        clusterName: 'prod-eks-cluster',
        instanceTypes: ['t3.large', 't3.xlarge'],
        minNodes: 6,
        maxNodes: 20,
        desiredNodes: 9,
        enableClusterLogging: true,
        logTypes: ['api', 'audit', 'authenticator'],
        capacityType: 'ON_DEMAND', // Production requires ON_DEMAND
    },
    argocd: {
        namespace: 'argocd',
        chartVersion: '7.7.10',
        enableIngress: true,
        ingressClass: 'alb',
        serverInsecure: false, // Use TLS in production
    },
    s3: {
        bucketNamePrefix: 'eks-artifacts',
        enableVersioning: true,
        lifecycleDays: 365,
    },
    tags: {
        Environment: 'prod',
        Project: 'eks-cdk-argocd-showcase',
        ManagedBy: 'cdk',
        Owner: 'devops-team',
        CostCenter: 'engineering',
    },
};

// Validate configuration on import
validateEnvironmentConfig(ProdConfig);
