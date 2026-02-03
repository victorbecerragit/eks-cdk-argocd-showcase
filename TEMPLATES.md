# CloudFormation Templates - Complete Reference

## Overview

This document provides a complete reference for all CloudFormation templates generated for the AWS EKS CDK & ArgoCD Showcase project.

## Quick Start

### Generate All Templates
```bash
./scripts/generate-templates.sh
```

### Deploy to AWS
```bash
# Deploy to Dev
npx cdk deploy --all -c environment=dev

# Deploy to Staging
npx cdk deploy --all -c environment=staging

# Deploy to Production (requires manual approval)
npx cdk deploy --all -c environment=prod --require-approval always
```

---

## Generated Templates

### 1. Network Stack (`EksShowcase-{env}-Network.template.json`)

**Purpose:** VPC infrastructure foundation with networking components

**Size:** 34-48 KB (depending on environment)

**Key Resources:**
- AWS::EC2::VPC (10.0.0.0/16)
- AWS::EC2::Subnet (Public, Private, Isolated)
- AWS::EC2::NatGateway (1-3 NATs by environment)
- AWS::EC2::VPCEndpoint (S3, DynamoDB, ECR, CloudWatch, STS, EC2, SSM)
- AWS::Logs::LogGroup (VPC Flow Logs)
- AWS::EC2::SecurityGroup (VPC Endpoint SG)
- AWS::EC2::RouteTable & Associations

**Environment Differences:**

| Component | Dev | Staging | Prod |
|-----------|-----|---------|------|
| NAT Gateways | 1 (public-1) | 2 (public-1, public-2) | 3 (public-1, public-2, public-3) |
| Public Subnets | 1 (/24) | 2 (/24) | 3 (/24) |
| Private Subnets | 1 (/22) | 2 (/22) | 3 (/22) |
| Isolated Subnets | 1 (/24) | 2 (/24) | 3 (/24) |
| Flow Log Retention | 7 days | 30 days | 90 days |

**VPC Endpoints Created:**
- Gateway: S3, DynamoDB
- Interface: ECR API, ECR DKR, CloudWatch, STS, EC2, SSM, SSM Messages

---

### 2. EKS Stack (`EksShowcase-{env}-EKS.template.json`)

**Purpose:** Kubernetes cluster, node groups, and container networking

**Size:** 40-41 KB

**Key Resources:**
- AWS::EKS::Cluster (Kubernetes v1.31)
- AWS::EKS::Nodegroup (Managed)
- AWS::IAM::Role (Cluster Admin, Node Group, IRSA)
- AWS::EC2::SecurityGroup (Cluster control plane)
- AWS::IAM::OpenIDConnectProvider (for IRSA)
- AWS::Lambda::Function (kubectl handler)
- AWS::Lambda::Layer (kubectl layer)
- Custom Resources (Kubernetes manifest deployment)

**Nested Templates:**
- `EksShowcasedevEKSawscdkawseksClusterResourceProvider*.nested.template.json` (24 KB)
- `EksShowcasedevEKSawscdkawseksKubectlProvider*.nested.template.json` (7.9 KB)

**Environment Differences:**

| Component | Dev | Staging | Prod |
|-----------|-----|---------|------|
| Node Group Min | 2 | 3 | 6 |
| Node Group Desired | 3 | 5 | 8 |
| Node Group Max | 6 | 10 | 20 |
| Instance Types | t3.medium | t3.medium, t3.large | t3.large, t3.xlarge |
| Capacity Type | SPOT, ON_DEMAND | ON_DEMAND | ON_DEMAND |
| Spot Max Price | 70% | N/A | N/A |

**Kubernetes Add-ons Installed:**
- AWS Load Balancer Controller (IRSA enabled)
- ArgoCD (Helm chart v7.7.10, HTTPS enabled)

**IAM Policies Attached:**
- EKS Cluster Role (basic EKS permissions)
- Node Group Role (EC2, ECR, SSM, CloudWatch)
- ALB Controller Role (ALB, EC2, WAF, Shield permissions)
- ArgoCD Role (basic IRSA permissions)

---

### 3. Storage Stack (`EksShowcase-{env}-Storage.template.json`)

**Purpose:** Persistent data storage with security and compliance

**Size:** 4-7.1 KB

**Key Resources:**
- AWS::S3::Bucket (artifact storage)
- AWS::S3::BucketPolicy (SSL enforcement)
- AWS::S3::BucketVersioningConfiguration
- AWS::S3::BucketEncryption (AES-256)
- AWS::S3::BucketPublicAccessBlockConfiguration
- AWS::S3::LifecycleConfiguration
- AWS::Lambda::Function (custom resource for cleanup)

**S3 Configuration:**

| Setting | Dev | Staging | Prod |
|---------|-----|---------|------|
| Encryption | AES-256 | AES-256 | AES-256 |
| Versioning | Enabled | Enabled | Enabled |
| Block Public Access | Yes | Yes | Yes |
| Require SSL | Yes | Yes | Yes |
| Lifecycle (days to IA) | 30 | 60 | 90 |
| Lifecycle (expiration) | 90 | 180 | 365 |
| Removal Policy | Destroy | Destroy | Retain |

**Lifecycle Rules:**
- Transition to GLACIER_IR after configured days
- Expire non-current versions after configured days
- Auto-cleanup on stack deletion (dev/staging only)

---

### 4. GitOps Stack (`EksShowcase-{env}-GitOps.template.json`)

**Purpose:** GitOps orchestration and ArgoCD bootstrap

**Size:** 1.2 KB

**Key Resources:**
- Custom Resources (ArgoCD bootstrap)
- App of Apps manifest deployment

**Note:** Most GitOps resources are deployed via the EKS stack using Helm charts and Kubernetes manifests. This stack serves as the orchestration layer.

**ArgoCD Configuration:**
- Helm Chart: `argo/argo-cd` v7.7.10
- HTTPS Ingress: Enabled
- ALB Annotation: `alb.ingress.kubernetes.io/load-balancer-name: demo-argocd`
- App of Apps Pattern: Bootstrapped from `gitops/argocd/app-of-apps.yaml`

---

## Stack Dependencies

```
Network Stack (created first)
    ↓
    ├─→ EKS Stack (requires VPC ID)
    ├─→ Storage Stack (independent, parallel)
    ↓
GitOps Stack (requires EKS cluster ready)
```

**Deployment Order:**
1. Network (Foundation)
2. EKS + Storage (Parallel - no dependency)
3. GitOps (Requires functional EKS cluster)

---

## Resource Counts Summary

### Dev Environment
- **Network:** ~45 resources
- **EKS:** ~70 resources
- **Storage:** ~5 resources
- **Total:** ~120 resources

### Staging Environment
- **Network:** ~55 resources
- **EKS:** ~70 resources
- **Storage:** ~5 resources
- **Total:** ~130 resources

### Production Environment
- **Network:** ~65 resources
- **EKS:** ~70 resources
- **Storage:** ~5 resources
- **Total:** ~140 resources

---

## Template Generation Details

### What `generate-templates.sh` Does

1. **Installs Dependencies** - Checks node_modules, runs `npm install` if needed
2. **Compiles TypeScript** - Runs `npm run build` to verify type safety
3. **Synthesizes CloudFormation** - Runs `npx cdk synth` for all environments
4. **Validates Configuration** - Ensures all configs pass validation
5. **Summarizes Output** - Lists all generated templates and assets

### Generated Artifacts

All templates and assets are created in `cdk.out/`:

```
cdk.out/
├── EksShowcase-dev-Network.template.json
├── EksShowcase-dev-EKS.template.json
├── EksShowcase-dev-Storage.template.json
├── EksShowcase-dev-GitOps.template.json
├── EksShowcasedevEKSawscdkawseksClusterResourceProvider*.nested.template.json
├── EksShowcasedevEKSawscdkawseksKubectlProvider*.nested.template.json
├── [Staging templates...]
├── [Production templates...]
├── asset.*.zip (Lambda code packages)
├── asset.*/ (Asset directories)
├── manifest.json (CDK manifest)
└── tree.json (CDK construct tree)
```

---

## Customization

To modify templates:

1. **Network Configuration** - Edit `lib/config/{env}.ts` → `vpc` property
2. **EKS Configuration** - Edit `lib/config/{env}.ts` → `eks` property
3. **Storage Configuration** - Edit `lib/config/{env}.ts` → `s3` property
4. **ArgoCD Configuration** - Edit `lib/constructs/argocd-construct.ts`
5. **ALB Controller** - Edit `lib/constructs/alb-controller-construct.ts`

Then re-generate templates:
```bash
./scripts/generate-templates.sh
```

---

## Deployment Validation Checklist

- [ ] AWS credentials configured (`aws sts get-caller-identity` returns account info)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] AWS CDK CLI installed (`cdk --version`)
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript builds without errors (`npm run build`)
- [ ] CloudFormation templates generate (`npx cdk synth`)
- [ ] All 4 stacks appear in output
- [ ] Configuration validates for target environment

---

## Troubleshooting

### Schema Version Warning
```
Cloud assembly schema version mismatch: Maximum schema version supported is 38.x.x, but found 48.0.0
```
**Solution:** Safe to ignore. Templates still generate correctly.

### Missing Dependencies
```
Error: Cannot find module '@aws-cdk/...'
```
**Solution:** Run `npm install`

### Permission Denied on Scripts
```
Permission denied: ./scripts/generate-templates.sh
```
**Solution:** Run `chmod +x scripts/*.sh`

### Synthesis Fails
```
Error: Configuration validation failed
```
**Solution:** Check `lib/config/{env}.ts` for required fields. See `lib/config/README.md`

---

## Costs Estimation

**Dev Environment (monthly):**
- EKS Cluster: ~$73
- NAT Gateway: ~$45
- EC2 Instances (2-6 t3.medium Spot): ~$20-60
- VPC Endpoints: ~$7
- S3 Storage: ~$0.50
- **Total: ~$145-185**

**Staging Environment (monthly):**
- EKS Cluster: ~$73
- NAT Gateways (2x): ~$90
- EC2 Instances (3-10 t3.medium/large On-Demand): ~$60-200
- VPC Endpoints: ~$7
- S3 Storage: ~$1
- **Total: ~$231-371**

**Production Environment (monthly):**
- EKS Cluster: ~$73
- NAT Gateways (3x): ~$135
- EC2 Instances (6-20 t3.large/xlarge On-Demand): ~$200-600
- VPC Endpoints: ~$7
- S3 Storage: ~$2
- **Total: ~$417-817**

---

## Next Steps

1. Review generated templates in `cdk.out/`
2. Verify AWS credentials are set
3. Run `npx cdk diff -c environment=dev` to see what will be created
4. Deploy with `npx cdk deploy --all -c environment=dev`
5. Access ArgoCD via the ALB endpoint
6. Deploy applications using GitOps patterns

See [README.md](README.md) for detailed deployment instructions.
