/**
 * VPC Configuration
 * Controls networking layer for EKS cluster
 * - VPC Flow Logs enable network troubleshooting and compliance auditing
 * - NAT Gateways provide HA for outbound traffic
 */
export interface VPCConfig {
    cidr: string;
    maxAzs: number;
    natGateways: number;
    enableVpcFlowLogs: boolean; // Enable for production (compliance, debugging)
}

/**
 * EKS Configuration
 * Defines Kubernetes cluster settings and observability
 * - clusterName: Resource naming across AWS (IAM roles, security groups, etc.)
 * - enableClusterLogging: CloudWatch integration for audit logs, API calls
 * - capacityType: SPOT for dev/staging (cost savings), ON_DEMAND for production
 */
export interface EKSConfig {
    version: string;
    clusterName: string; // Used for IAM roles, resource tagging
    instanceTypes: string[];
    minNodes: number;
    maxNodes: number;
    desiredNodes: number;
    enableClusterLogging: boolean; // Enable for prod/compliance (audit, troubleshooting)
    logTypes: string[]; // e.g., ['api', 'audit', 'authenticator', 'controllerManager', 'scheduler']
    capacityType?: 'ON_DEMAND' | 'SPOT'; // SPOT for cost optimization in non-prod
}

/**
 * ArgoCD Configuration
 * GitOps continuous deployment settings
 * - enableIngress: Expose ArgoCD UI for production access
 * - serverInsecure: Disable TLS only for dev/testing
 */
export interface ArgoCDConfig {
    namespace: string;
    chartVersion: string;
    enableIngress: boolean; // Enable for prod (requires ALB controller)
    ingressClass: string; // 'alb' for AWS ALB, 'nginx' for NGINX
    serverInsecure?: boolean; // Never true in production
}

/**
 * S3 Configuration
 * Object storage for artifacts, logs, backups
 */
export interface S3Config {
    bucketNamePrefix: string;
    enableVersioning: boolean; // Enable for prod (recovery, audit trail)
    lifecycleDays: number; // Transition old objects to cheaper storage
}

/**
 * Monitoring Configuration
 * CloudWatch dashboards and alarms
 */
export interface MonitoringConfig {
    enableDashboards: boolean; // CloudWatch custom dashboards
    enableAlarms: boolean; // Critical alerts (node health, pod crashes)
    logRetentionDays: number; // CloudWatch log retention
    alarmEmail?: string; // SNS notifications
}

/**
 * Networking Security Configuration
 * Advanced network controls
 */
export interface NetworkingConfig {
    enablePrivateEndpoints: boolean; // VPC endpoints for AWS services (prod security)
    enableSecurityGroupLogging: boolean; // Track security group changes
}

/**
 * Complete Environment Configuration
 * Type-safe infrastructure definition for AWS CDK deployment
 * Supports dev, staging, and production environments
 */
export interface EnvironmentConfig {
    envName: string;
    account: string;
    region: string;
    vpc: VPCConfig;
    eks: EKSConfig;
    argocd: ArgoCDConfig;
    s3: S3Config;
    monitoring?: MonitoringConfig;
    networking?: NetworkingConfig;
    tags: { [key: string]: string };
}

/**
 * Validates environment configuration for common misconfigurations
 * @throws Error if configuration is invalid
 */
export function validateEnvironmentConfig(config: EnvironmentConfig): void {
    // EKS node count validation
    if (config.eks.minNodes > config.eks.maxNodes) {
        throw new Error(`EKS minNodes (${config.eks.minNodes}) cannot exceed maxNodes (${config.eks.maxNodes})`);
    }

    if (config.eks.desiredNodes < config.eks.minNodes || config.eks.desiredNodes > config.eks.maxNodes) {
        throw new Error(`EKS desiredNodes (${config.eks.desiredNodes}) must be between minNodes and maxNodes`);
    }

    // Instance types validation
    if (config.eks.instanceTypes.length === 0) {
        throw new Error('EKS instanceTypes cannot be empty');
    }

    // VPC validation
    if (!config.vpc.cidr.match(/^\d+\.\d+\.\d+\.\d+\/\d+$/)) {
        throw new Error(`VPC CIDR (${config.vpc.cidr}) is not valid CIDR notation`);
    }

    if (config.vpc.maxAzs < 1) {
        throw new Error('VPC maxAzs must be at least 1');
    }

    // ArgoCD security validation
    if (config.argocd.serverInsecure && config.envName === 'production') {
        throw new Error('ArgoCD serverInsecure cannot be true in production environment');
    }

    // S3 lifecycle validation
    if (config.s3.lifecycleDays < 1) {
        throw new Error('S3 lifecycleDays must be at least 1');
    }

    // EKS Logging validation
    if (config.eks.enableClusterLogging && config.eks.logTypes.length === 0) {
        throw new Error('EKS enableClusterLogging is true but logTypes is empty');
    }

    console.log(`✓ Configuration validation passed for environment: ${config.envName}`);
}
