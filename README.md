# AWS EKS CDK & ArgoCD Showcase

A production-ready Infrastructure as Code (IaC) showcase demonstrating how to build, manage, and scale Amazon EKS clusters using AWS CDK and GitOps principles with ArgoCD.

---

## 📖 **Quick Start - Read This First!**

**New to this project?** → Start with [START_HERE.md](START_HERE.md) ⭐
- Navigation hub for all documentation
- Guides for different roles (developers, architects, DevOps)
- Links to comprehensive guides below
- ~5 minutes to get oriented

---

## 📚 **Documentation Guides** (Pick Your Path)

### 🎯 I'm a **Project Lead/Decision Maker**
- **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** (10 min) - Problem analysis & solution overview
- **[STRUCTURE_COMPARISON.md](STRUCTURE_COMPARISON.md)** (20 min) - Current vs. proposed structure analysis
- **Use for**: Understanding the project organization and making architectural decisions

### 🏗️ I'm an **Architect/Technical Lead**
- **[REPOSITORY_STRUCTURE_GUIDE.md](REPOSITORY_STRUCTURE_GUIDE.md)** (15 min) - Detailed structure proposal
- **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** (15 min) - System topology & diagrams
- **Use for**: Understanding system design and technical details

### 👨‍💻 I'm a **Developer** (Adding Code)
- **[WHERE_DOES_IT_GO.md](WHERE_DOES_IT_GO.md)** (10 min) - **Bookmark this!** Quick decision guide
- **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** (15 min) - Understand the system
- **Use for**: Daily reference on where to put files and how components work

### 🔧 I'm a **DevOps/Platform Engineer**
- **[REORGANIZATION_GUIDE.md](REORGANIZATION_GUIDE.md)** (40 min) - Step-by-step implementation guide
- **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** (15 min) - System architecture reference
- **Use for**: Implementing changes and deployment automation

### 🆕 I'm a **New Team Member**
1. Read **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** - Understand the system
2. Read **[WHERE_DOES_IT_GO.md](WHERE_DOES_IT_GO.md)** - Learn where things go
3. Bookmark **[WHERE_DOES_IT_GO.md](WHERE_DOES_IT_GO.md)** - Reference for daily work

---

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

### Current Structure (See [REPOSITORY_STRUCTURE_GUIDE.md](REPOSITORY_STRUCTURE_GUIDE.md) for detailed documentation)

```
├── bin/                     # CDK App entry point & Stack orchestration
├── lib/
│   ├── config/              # Environment configurations (dev/stage/prod)
│   ├── constructs/          # Reusable L3 CDK constructs
│   └── stacks/              # CloudFormation Stacks
├── infrastructure/          # Kubernetes multi-tenancy, security & observability configs
├── gitops/                  # ArgoCD manifests, Helm charts & applications
├── scripts/                 # Helper scripts for templates & commands
├── test/                    # Unit tests
└── docs/                    # Project documentation & architecture guides
```

### Recommended Structure (For better clarity)

See **[REPOSITORY_STRUCTURE_GUIDE.md](REPOSITORY_STRUCTURE_GUIDE.md)** for migration guide:

```
├── iac/                     # AWS Infrastructure (CDK) - All AWS provisioning code
├── platform/                # Kubernetes Configuration - All cluster configs
│   ├── tenants/             # Multi-tenant isolation & quotas
│   ├── security/            # Security policies & controls
│   ├── observability/       # Monitoring & logging stack
│   └── gitops/              # ArgoCD orchestration
├── helm-charts/             # Reusable Helm charts
├── docs/                    # All documentation
└── scripts/                 # Helper scripts
```

**Benefits of recommended structure:**
- ✅ Clear separation: `/iac` for AWS, `/platform` for K8s
- ✅ Single source of truth for each component type
- ✅ Faster developer onboarding
- ✅ Easier to find and maintain files
- ✅ Simplified CI/CD pipeline targeting

## ⚙️ Configuration

Configurations are centrally managed in `lib/config/`. The system uses strict typing and validation to prevent misconfigurations before deployment.

*   **Dev**: Cost-optimized (Spot instances, fewer replicas, single NAT Gateway).
*   **Staging**: HA testing (Multi-AZ, mixed instances).
*   **Prod**: High Availability, Security hardening, Compliance (termination protection, full logging).

See [lib/config/README.md](lib/config/README.md) for detailed configuration documentation and [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) for system architecture diagrams.

## 🧪 Testing & Validation

Follow these steps to validate your configuration and ensure the infrastructure code is sound.

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

### 3. Validate Each Environment
```bash
# Verify Dev Environment
npx cdk synth -c environment=dev

# Verify Staging Environment
npx cdk synth -c environment=staging

# Verify Production Environment
npx cdk synth -c environment=prod
```

See **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** for what each stack creates.

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

## ✅ Prerequisites & Setup

### New to AWS?
See **[AWS_SETUP.md](AWS_SETUP.md)** for complete instructions on:
- Setting up a new AWS account
- Creating IAM users and roles
- Configuring credentials
- Validating your setup

### Node.js & Tools
- Node.js 18+ (check with `node --version`)
- AWS CDK CLI (install with `npm install -g aws-cdk`)
- kubectl (install from [kubernetes.io](https://kubernetes.io/docs/tasks/tools/))
- AWS CLI (install from [aws.amazon.com](https://aws.amazon.com/cli/))

### Configure AWS Credentials

**See [AWS_SETUP.md](AWS_SETUP.md) for detailed instructions.** Quick options:

#### Option 1: AWS CLI Profile (Recommended)
```bash
# Configure your AWS credentials
aws configure --profile my-profile

# Set the profile for CDK
export AWS_PROFILE=my-profile

# Verify credentials work
aws sts get-caller-identity
```

#### Option 2: Environment Variables
```bash
# Set account and region
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1

# Verify
aws sts get-caller-identity
```

Once credentials are set, you're ready to deploy.

## 🚀 Deployment Guide

**See [DEPLOYMENT_CHECKLIST.md](infrastructure/DEPLOYMENT_CHECKLIST.md)** for detailed step-by-step instructions.

### Quick Deployment

To deploy the infrastructure to your AWS account:

```bash
# Deploy to Dev (Default)
npx cdk deploy --all

# Deploy to Staging
ENVIRONMENT=staging npx cdk deploy --all

# Deploy to Production (Requires manual approval)
ENVIRONMENT=prod npx cdk deploy --all --require-approval always
```

**What gets deployed:**
- VPC with multi-AZ subnets and VPC endpoints
- EKS cluster with managed node groups
- S3 storage buckets
- ArgoCD for GitOps (auto-deploys tenants and platform components)

See **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** for what each component does.

## 📋 CloudFormation Stacks Overview

The CDK synthesizes 4 main CloudFormation stacks per environment:

### Stack Breakdown

| Stack | Purpose | Key Resources |
|-------|---------|---|
| **Network** | VPC foundation with multi-AZ setup | VPC, Subnets, NAT Gateways, VPC Endpoints, Flow Logs |
| **EKS** | Kubernetes cluster with node groups | EKS Cluster, Node Groups, IRSA, ALB Controller, ArgoCD |
| **Storage** | Secure S3 bucket configuration | S3 Bucket with encryption, versioning, lifecycle |
| **GitOps** | Orchestration layer | ArgoCD bootstrap & App of Apps pattern |

### Environment Differences

| Resource | Dev | Staging | Prod |
|----------|-----|---------|------|
| **NAT Gateways** | 1 | 2 | 3 |
| **Node Group Min/Max** | 2-6 | 3-10 | 6-20 |
| **Instance Type** | t3.medium | t3.medium/large | t3.large/xlarge |
| **Termination Protection** | No | No | Yes |
| **S3 Lifecycle** | 90 days | 180 days | 365 days |

See **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** for complete system architecture and component details.

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

## 📚 Learning Resources

### Understanding the Project
- **[START_HERE.md](START_HERE.md)** - Navigation hub (5 min read) ⭐
- **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - Project overview (10 min read)
- **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** - System architecture & diagrams (15 min read)

### Making Changes
- **[WHERE_DOES_IT_GO.md](WHERE_DOES_IT_GO.md)** - Quick reference for file placement (bookmark this!)
- **[REPOSITORY_STRUCTURE_GUIDE.md](REPOSITORY_STRUCTURE_GUIDE.md)** - Detailed structure documentation

### Operations & Deployment
- **[DEPLOYMENT_CHECKLIST.md](infrastructure/DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment guide
- **[AWS_SETUP.md](AWS_SETUP.md)** - AWS account and credential setup
- **[QUICK_REFERENCE.md](infrastructure/QUICK_REFERENCE.md)** - Common commands & operations

### Repository Organization
- **[STRUCTURE_COMPARISON.md](STRUCTURE_COMPARISON.md)** - Current vs. recommended structure
- **[REORGANIZATION_GUIDE.md](REORGANIZATION_GUIDE.md)** - How to reorganize the repo (if needed)

## 🔔 Troubleshooting & Support

### Issue: "Where should I put this file?"
→ See **[WHERE_DOES_IT_GO.md](WHERE_DOES_IT_GO.md)** for a decision flowchart and quick reference

### Issue: "How should we organize this repository?"
→ See **[REPOSITORY_STRUCTURE_GUIDE.md](REPOSITORY_STRUCTURE_GUIDE.md)** and **[STRUCTURE_COMPARISON.md](STRUCTURE_COMPARISON.md)**

### Issue: "What's the system architecture?"
→ See **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** for diagrams and component descriptions

### Deployment Issues

**CDK CLI Version Mismatch Warning**

You may see:
```
Cloud assembly schema version mismatch: Maximum schema version supported is 38.x.x, but found 48.0.0
```

✅ **This is harmless** - Your deployments will work fine. To fix it (optional):
```bash
npm install -g aws-cdk@latest
cdk --version
```

**CDK Notices (32775, 34892)**

You may see notices about CLI versions and telemetry. ✅ **These are informational only** and don't affect deployments. To suppress:
```bash
cdk acknowledge 32775 34892
```

---

## ⚠️ Important Notes

- **Showcase Repository**: This is a production-ready showcase. Review all security groups and IAM permissions before deploying to a critical production environment.
- **Cost**: EKS, NAT Gateways, and compute resources incur AWS charges. Use **[QUICK_REFERENCE.md](infrastructure/QUICK_REFERENCE.md)** for cost-saving tips.
- **Termination Protection**: Production environment has termination protection enabled. See cleanup section for instructions.
