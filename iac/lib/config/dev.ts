import { EnvironmentConfig, validateEnvironmentConfig } from './environment-config';

export const DevConfig: EnvironmentConfig = {
    envName: 'dev',
    account: process.env.CDK_DEFAULT_ACCOUNT || '',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    vpc: {
        cidr: '10.0.0.0/16',
        maxAzs: 2,
        natGateways: 1, // Cost optimization: single NAT for dev
        enableVpcFlowLogs: true,
    },
    eks: {
        version: '1.31', // Latest stable version
        clusterName: 'dev-eks-cluster',
        instanceTypes: ['t3.medium'],
        minNodes: 2,
        maxNodes: 6,
        desiredNodes: 3,
        enableClusterLogging: true,
        logTypes: ['api', 'audit', 'authenticator', 'controllerManager', 'scheduler'],
        capacityType: 'ON_DEMAND', // Use ON_DEMAND for dev stability
    },
    argocd: {
        namespace: 'argocd',
        chartVersion: '7.7.10', // Latest stable version
        enableIngress: true,
        ingressClass: 'alb',
        serverInsecure: true, // ALB handles TLS termination
    },
    s3: {
        bucketNamePrefix: 'eks-artifacts',
        enableVersioning: true,
        lifecycleDays: 90,
    },
    tags: {
        Environment: 'dev',
        Project: 'eks-cdk-argocd-showcase',
        ManagedBy: 'cdk',
        Owner: 'devops-team',
    },
};

// Validate configuration on import
validateEnvironmentConfig(DevConfig);
