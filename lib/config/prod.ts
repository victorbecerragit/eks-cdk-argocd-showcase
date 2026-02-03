import { EnvironmentConfig } from './environment-config';

export const ProdConfig: EnvironmentConfig = {
    envName: 'prod',
    account: '123456789012', // Placeholder
    region: 'us-east-1',
    vpc: {
        cidr: '10.2.0.0/16',
        maxAzs: 3,
        natGateways: 3,
    },
    eks: {
        version: '1.27',
        instanceTypes: ['m5.large'],
        minNodes: 3,
        maxNodes: 10,
        desiredNodes: 5,
    },
    argocd: {
        namespace: 'argocd',
        chartVersion: '5.46.7',
    },
    tags: {
        Environment: 'prod',
        Project: 'eks-cdk-argocd-showcase',
    },
};
