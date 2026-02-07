import { EnvironmentConfig, validateEnvironmentConfig } from './environment-config';

export const StagingConfig: EnvironmentConfig = {
    envName: 'staging',
    account: process.env.CDK_DEFAULT_ACCOUNT || '',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    vpc: {
        cidr: '10.1.0.0/16',
        maxAzs: 2,
        natGateways: 2, // HA for staging
        enableVpcFlowLogs: true,
    },
    eks: {
        version: '1.31', // Latest stable version
        clusterName: 'staging-eks-cluster',
        instanceTypes: ['t3.medium', 't3.large'],
        minNodes: 3,
        maxNodes: 10,
        desiredNodes: 5,
        enableClusterLogging: true,
        logTypes: ['api', 'audit', 'authenticator'],
        capacityType: 'ON_DEMAND',
    },
    argocd: {
        namespace: 'argocd',
        chartVersion: '7.7.10',
        enableIngress: true,
        ingressClass: 'alb',
        serverInsecure: true, // ALB handles TLS termination
    },
    s3: {
        bucketNamePrefix: 'eks-artifacts',
        enableVersioning: true,
        lifecycleDays: 180,
    },
    tags: {
        Environment: 'staging',
        Project: 'eks-cdk-argocd-showcase',
        ManagedBy: 'cdk',
        Owner: 'devops-team',
    },
};

// Validate configuration on import
validateEnvironmentConfig(StagingConfig);
