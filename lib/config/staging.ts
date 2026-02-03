import { EnvironmentConfig } from './environment-config';

export const StagingConfig: EnvironmentConfig = {
    envName: 'staging',
    account: '123456789012', // Placeholder
    region: 'us-east-1',
    vpc: {
        cidr: '10.1.0.0/16',
        maxAzs: 2,
        natGateways: 2,
    },
    eks: {
        version: '1.27',
        instanceTypes: ['t3.large'],
        minNodes: 2,
        maxNodes: 5,
        desiredNodes: 3,
    },
    argocd: {
        namespace: 'argocd',
        chartVersion: '5.46.7',
    },
    tags: {
        Environment: 'staging',
        Project: 'eks-cdk-argocd-showcase',
    },
};
