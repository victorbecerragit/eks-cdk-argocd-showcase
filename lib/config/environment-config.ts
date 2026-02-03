export interface EKSConfig {
    version: string;
    instanceTypes: string[];
    minNodes: number;
    maxNodes: number;
    desiredNodes: number;
}

export interface VPCConfig {
    cidr: string;
    maxAzs: number;
    natGateways: number;
}

export interface ArgoCDConfig {
    namespace: string;
    chartVersion: string;
}

export interface EnvironmentConfig {
    envName: string;
    account: string;
    region: string;
    vpc: VPCConfig;
    eks: EKSConfig;
    argocd: ArgoCDConfig;
    tags: { [key: string]: string };
}
