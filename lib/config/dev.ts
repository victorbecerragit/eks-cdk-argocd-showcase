import { EnvironmentConfig } from './environment-config';

export const DevConfig: EnvironmentConfig = {
    envName: 'dev',
    account: process.env.CDK_DEFAULT_ACCOUNT || '123456789012', // Placeholder
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    vpc: {
        cidr: '10.0.0.0/16',
        maxAzs: 2,
        natGateways: 1,
    },
    eks: {
        version: '1.27',
        instanceTypes: ['t3.medium'],
        minNodes: 1,
        maxNodes: 3,
        desiredNodes: 2,
    },
    argocd: {
        namespace: 'argocd',
        chartVersion: '5.46.7',
    },
    tags: {
        Environment: 'dev',
        Project: 'eks-cdk-argocd-showcase',
    },
};
