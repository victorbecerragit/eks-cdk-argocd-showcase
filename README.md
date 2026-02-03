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
├── scripts/             # Helper scripts for template generation & commands
│   ├── generate-templates.sh    # Auto-generates CloudFormation templates
│   └── quick-reference.sh       # Quick reference for common CDK commands
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

### 3. Automated Template Generation
Use the provided script to automatically generate CloudFormation templates for all environments:

```bash
# Run the template generation script
./scripts/generate-templates.sh
```

This script will:
- Install dependencies
- Compile TypeScript
- Generate CloudFormation templates for all 3 environments (dev, staging, prod)
- Validate configurations
- Summarize generated artifacts

Alternatively, manually verify each environment:

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

## 📋 CloudFormation Templates Overview

The CDK synthesizes 4 main CloudFormation stacks per environment:

### Stack Breakdown

| Stack | Template | Size | Purpose |
|-------|----------|------|---------|
| **Network** | `EksShowcase-{env}-Network.template.json` | 34 KB | VPC foundation with multi-AZ subnets, VPC endpoints, flow logs |
| **EKS** | `EksShowcase-{env}-EKS.template.json` | 40 KB | Kubernetes cluster with managed node groups, IRSA, ALB controller, ArgoCD |
| **Storage** | `EksShowcase-{env}-Storage.template.json` | 7 KB | Secure S3 bucket with encryption, versioning, lifecycle policies |
| **GitOps** | `EksShowcase-{env}-GitOps.template.json` | 1 KB | GitOps orchestration layer (ArgoCD deployed via EKS stack) |

### Key Resources by Stack

**Network Stack Resources:**
- VPC (10.0.0.0/16)
- Public Subnets (1x /24 per AZ)
- Private Subnets (1x /22 per AZ)
- Isolated Subnets (1x /24 per AZ)
- NAT Gateway(s) - Environment-dependent (1 for dev, 2 for staging, 3 for prod)
- VPC Endpoints:
  - Gateway: S3, DynamoDB
  - Interface: ECR API, ECR DKR, CloudWatch, STS, EC2, SSM, SSM Messages
- VPC Flow Logs → CloudWatch Logs

**EKS Stack Resources:**
- EKS Cluster (Kubernetes v1.31)
- Managed Node Group (auto-scaling, mixed capacity types)
- Cluster Admin IAM Role
- OpenID Connect Provider (for IRSA)
- AWS Load Balancer Controller (with IRSA)
- ArgoCD Helm Release (v7.7.10)
- App of Apps Bootstrap Manifest
- Nested Templates:
  - Cluster Resource Provider (for EKS cluster management)
  - Kubectl Provider (for Kubernetes manifest deployment)

**Storage Stack Resources:**
- S3 Bucket with:
  - AES-256 server-side encryption
  - Versioning enabled
  - Lifecycle policies (transition to Infrequent Access)
  - Block all public access
  - Enforce SSL/TLS connections
  - Auto-delete cleanup (CDK custom resource)

**GitOps Stack Resources:**
- Minimal orchestration layer (resources primarily in EKS stack)
- ArgoCD bootstrap handled via EKS stack Helm charts

### Resource Counts by Environment

| Resource | Dev | Staging | Prod |
|----------|-----|---------|------|
| NAT Gateways | 1 | 2 | 3 |
| Node Group Min/Max | 2-6 | 3-10 | 6-20 |
| Instance Type | t3.medium | t3.medium/large | t3.large/xlarge |
| Capacity Type | SPOT/ON_DEMAND | ON_DEMAND | ON_DEMAND |
| S3 Lifecycle Days | 90 | 180 | 365 |
| Termination Protection | No | No | Yes |

## � Next Steps: Setup AWS Credentials
**New to AWS?** Start here: [AWS Account Setup Guide](AWS_SETUP.md) - Complete instructions for setting up a new AWS account, IAM users, and credentials.
Before deploying, you need to authenticate with AWS. Choose one method:

### Option 1: AWS CLI Profile (Recommended)
```bash
# Configure your AWS credentials
aws configure --profile my-profile

# Set the profile for CDK
export AWS_PROFILE=my-profile

# Verify credentials work
aws sts get-caller-identity
```

### Option 2: Environment Variables
```bash
# Set account and region
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1

# Verify
aws sts get-caller-identity
```

Once credentials are set, you're ready to deploy.

## �🚀 Deployment

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

## 🔔 Troubleshooting

### CDK CLI Version Mismatch Warning

You may see a warning like:
```
Cloud assembly schema version mismatch: Maximum schema version supported is 38.x.x, but found 48.0.0
```

**What it means**: Your CDK CLI version is older than the aws-cdk-lib version in the project.

**Impact**: ✅ **None** - Your `cdk synth` and deployments will work fine. This is just a version alignment warning.

**To fix it** (optional):
```bash
# Update the CDK CLI to the latest version
npm install -g aws-cdk@latest

# Verify
cdk --version
```

After updating, re-run your commands and the warning will disappear.

### CDK Notices (32775, 34892)

You may see notices like:
```
32775   (cli): CLI versions and CDK library versions have diverged
34892   CDK CLI will collect telemetry data on command usage starting at version 2.1100.0
```

**What they mean**: These are informational notices from AWS about upcoming changes and versioning updates.

**Impact**: ✅ **None** - These don't affect your deployment. They're just FYI messages.

**To suppress them**:
```bash
# Acknowledge a specific notice by ID
cdk acknowledge 32775
cdk acknowledge 34892

# Or suppress all notices
cdk acknowledge 32775 34892
```

The notices won't appear again once acknowledged.
