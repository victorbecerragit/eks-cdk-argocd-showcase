#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/stacks/network-stack';
import { EksStack } from '../lib/stacks/eks-stack';
import { StorageStack } from '../lib/stacks/storage-stack';
import { GitOpsStack } from '../lib/stacks/gitops-stack';
import { getConfig } from '../lib/config';

const app = new cdk.App();

/**
 * Environment Selection
 * Priority: CDK Context → Environment Variable → Default (dev)
 * 
 * Usage Examples:
 * - CDK Context: npx cdk deploy -c environment=prod
 * - Env Var: ENVIRONMENT=staging npx cdk deploy
 * - Default: npx cdk deploy (uses dev)
 */
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
const config = getConfig(environment);

/**
 * Validate AWS Credentials
 * Ensures CDK has account and region information before synthesis
 */
if (!config.account || !config.region) {
    throw new Error(
        `❌ AWS Account and Region must be specified.\n` +
        `\nSolution 1: Set environment variables:\n` +
        `  export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)\n` +
        `  export CDK_DEFAULT_REGION=us-east-1\n` +
        `\nSolution 2: Use AWS credentials file (~/.aws/credentials)\n` +
        `\nCurrent config:\n` +
        `  Account: ${config.account || 'NOT SET'}\n` +
        `  Region: ${config.region || 'NOT SET'}`
    );
}

const env: cdk.Environment = {
    account: config.account,
    region: config.region,
};

/**
 * Stack Naming Convention: EksShowcase-{Environment}-{StackType}
 * This ensures easy identification and prevents name collisions
 */
const stackPrefix = `EksShowcase-${config.envName}`;

/**
 * Phase 1: Network Stack (Foundation)
 * Creates VPC, Subnets, NAT Gateways, and Network policies
 * - VPC CIDR defined in config
 * - Multi-AZ setup for HA
 * - VPC Flow Logs for network monitoring
 */
console.log(`🚀 Creating network infrastructure for ${config.envName}...`);
const networkStack = new NetworkStack(app, `${stackPrefix}-Network`, {
    env,
    config,
    description: `Network infrastructure for ${config.envName} EKS cluster`,
});

/**
 * Phase 2: EKS Cluster Stack
 * Depends on: NetworkStack (requires VPC)
 * 
 * Creates:
 * - EKS Cluster with specified K8s version
 * - Node groups with auto-scaling
 * - RBAC configuration
 * - Control plane logging
 */
console.log(`🎯 Creating EKS cluster for ${config.envName}...`);
const eksStack = new EksStack(app, `${stackPrefix}-EKS`, {
    env,
    config,
    vpc: networkStack.vpc,
    description: `EKS cluster (${config.eks.version}) for ${config.envName} environment`,
});

// EKS depends on Network
eksStack.addDependency(networkStack);

/**
 * Phase 3: Storage Stack
 * Independent - can run in parallel with EKS
 * 
 * Creates:
 * - S3 buckets for artifacts and logs
 * - Versioning and lifecycle policies
 * - Encryption and access controls
 */
console.log(`💾 Creating storage infrastructure for ${config.envName}...`);
const storageStack = new StorageStack(app, `${stackPrefix}-Storage`, {
    env,
    config,
    description: `S3 storage for ${config.envName} EKS artifacts and logs`,
});

/**
 * Phase 4: GitOps Stack (ArgoCD)
 * Depends on: EKS Cluster
 * 
 * Creates:
 * - ArgoCD deployment
 * - Ingress configuration
 * - Integration with Git repositories
 * - Demo application deployments
 */
console.log(`🔄 Configuring GitOps with ArgoCD for ${config.envName}...`);
const gitopsStack = new GitOpsStack(app, `${stackPrefix}-GitOps`, {
    env,
    config,
    cluster: eksStack.cluster,
    description: `GitOps configuration with ArgoCD for ${config.envName} EKS cluster`,
});

// GitOps depends on EKS
gitopsStack.addDependency(eksStack);

/**
 * Global Tagging Strategy
 * Applied to ALL resources for cost tracking, compliance, and resource management
 */
console.log(`🏷️  Applying tags: ${Object.keys(config.tags).join(', ')}`);
Object.entries(config.tags).forEach(([key, value]) => {
    cdk.Tags.of(app).add(key, value);
});

/**
 * Production Safety Features
 * Prevents accidental deletion of production infrastructure
 */
if (config.envName === 'prod') {
    console.log(`⚠️  Enabling termination protection (PRODUCTION)`);
    networkStack.terminationProtection = true;
    eksStack.terminationProtection = true;
    storageStack.terminationProtection = true;
    gitopsStack.terminationProtection = true;

    console.log(`🔐 SECURITY: To destroy production stacks, you must:`);
    console.log(`   1. Manually disable termination protection in AWS Console`);
    console.log(`   2. Re-run cdk destroy`);
}

/**
 * Final Synthesis
 * Generates CloudFormation templates
 */
console.log(`\n✅ CDK App Configuration Complete`);
console.log(`📋 Environment: ${config.envName}`);
console.log(`📍 Region: ${env.region}`);
console.log(`🔑 Account: ${env.account}`);
console.log(`📦 Stack Prefix: ${stackPrefix}\n`);

app.synth();
