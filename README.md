# AWS EKS CDK & ArgoCD Showcase

A production-ready Infrastructure as Code (IaC) showcase demonstrating how to build, manage, and scale Amazon EKS clusters using AWS CDK and GitOps principles with ArgoCD.

## 🚀 Overview

This project implements a complete Kubernetes platform on AWS, following best practices for security, scalability, and observability. It is designed to demonstrate a "Battery-Included" EKS setup that is ready for application deployment via GitOps.

### Key Features

*   **Multi-Environment Support**: Type-safe configuration for Dev, Staging, and Production environments (config-as-code).
*   **Infrastructure as Code**: Native TypeScript implementation using AWS CDK v2.
*   **Production Networking**:
    *   VPC with Public/Private/Isolated subnets across multiple AZs.
    *   VPC Endpoints (S3, ECR, STS, etc.) for cost optimization and security.
    *   VPC Flow Logs enabled for observability.
    *   Automatic subnet tagging for AWS Load Balancer discovery.
*   **EKS Cluster Architecture**:
    *   Managed Node Groups with support for Spot and On-Demand instances.
    *   Control Plane Logging integration with CloudWatch.
    *   IAM Roles for Service Accounts (IRSA) configured.
    *   AWS Load Balancer Controller installed for Ingress management.
*   **GitOps Engine (ArgoCD)**:
    *   ArgoCD pre-installed via Helm.
    *   "App of Apps" pattern bootstrapped automatically.
    *   ALB Ingress integration for secure UI access.
*   **Persistent Storage**: Secure S3 buckets with default encryption, versioning, and lifecycle policies.

## 🛠 Project Structure

```
├── bin/                 # CDK App entry point & Stack orchestration
├── lib/
│   ├── config/          # Environment configurations (dev/stage/prod) & Validation
│   ├── constructs/      # Reusable L3 CDK constructs (EKS, S3, ALB, ArgoCD)
│   └── stacks/          # CloudFormation Stacks (Network, Storage, EKS, GitOps)
├── gitops/              # ArgoCD manifests & Helm charts
└── test/                # Unit tests
```

## ⚙️ Configuration

Configurations are centrally managed in `lib/config/`. The system uses strict typing and validation to prevent misconfigurations before deployment.

*   **Dev**: Cost-optimized (Spot instances, fewer replicas, single NAT Gateway).
*   **Staging**: HA testing (Multi-AZ, mixed instances).
*   **Prod**: High Availability, Security hardening, Compliance (termination protection, full logging).

See [lib/config/README.md](lib/config/README.md) for detailed configuration documentation.

## 🧪 Testing & Validation

Follow these steps to validate your configuration updates and ensure the infrastructure code is sound.

### 1. Prerequisites
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build
```

### 2. Validation Steps
Run a dry-run synthesis to generate CloudFormation templates without deploying:
```bash
npx cdk synth
```

Check for any TypeScript type errors:
```bash
npm run build -- --noEmit
```

### 3. Verify Environment Selection
Ensure that the configuration loading works for all target environments:

```bash
# 1. Verify Dev Environment (default)
npx cdk synth -c environment=dev

# 2. Verify Staging Environment
npx cdk synth -c environment=staging

# 3. Verify Production Environment
npx cdk synth -c environment=prod
```

### ✅ Expected Output
If everything is configured correctly, you should see:
*   ✅ No TypeScript compilation errors.
*   ✅ CloudFormation templates generated for all stacks (`Network`, `EKS`, `Storage`, `GitOps`).
*   ✅ Console output confirming validation (e.g., `✓ Configuration validation passed for environment: prod`).
*   ✅ Different resource counts/properties reflecting the environment differences (e.g., Prod showing 3 NAT Gateways vs 1 in Dev).

## 🚀 Deployment

To deploy the infrastructure to your AWS account:

```bash
# Deploy to Dev (Default)
npx cdk deploy --all

# Deploy to Staging
ENVIRONMENT=staging npx cdk deploy --all

# Deploy to Production (Requires manual approval)
ENVIRONMENT=prod npx cdk deploy --all --require-approval always
```

## 🧹 Cleanup

To destroy resources and stop incurring costs:

```bash
# Dev/Staging
npx cdk destroy --all

# Production
# Note: Termination protection is enabled for Production. 
# You must disable it in the CloudFormation console before destroying.
ENVIRONMENT=prod npx cdk destroy --all
```

---
**Note**: This is a showcase repository. Please review all security groups and IAM permissions before deploying to a critical production environment.
