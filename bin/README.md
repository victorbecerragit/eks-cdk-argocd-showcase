# Application Entry Point

This directory contains the CDK application entry point (`app.ts`), which orchestrates all infrastructure stacks for EKS, networking, storage, and GitOps.

## 📋 What's Here

- **app.ts** - Main CDK application that:
  - Selects environment configuration (dev/staging/prod)
  - Validates AWS credentials
  - Creates stacks in correct dependency order
  - Applies global tagging and safety features

## 🚀 Quick Start

### Prerequisites
```bash
# Set AWS credentials
export AWS_PROFILE=your-profile
# OR
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1
```

### Deploy to Dev (Default)
```bash
npx cdk deploy
```

### Deploy to Staging
```bash
ENVIRONMENT=staging npx cdk deploy
```

### Deploy to Production
```bash
ENVIRONMENT=prod npx cdk deploy --require-approval=always
```

### Using CDK Context Parameter
```bash
npx cdk deploy -c environment=prod
```

## 📊 Environment Selection (Priority Order)

1. **CDK Context** (highest priority)
   ```bash
   npx cdk deploy -c environment=staging
   ```

2. **Environment Variable**
   ```bash
   ENVIRONMENT=prod npx cdk deploy
   ```

3. **Default**
   ```bash
   npx cdk deploy  # Uses dev
   ```

## 🔍 Useful Commands

### List all stacks
```bash
npx cdk list
```

### List stacks for specific environment
```bash
ENVIRONMENT=prod npx cdk list
```

### Synthesize CloudFormation templates
```bash
ENVIRONMENT=staging npx cdk synth
```

### Preview changes (diff)
```bash
ENVIRONMENT=prod npx cdk diff
```

### Deploy with confirmation
```bash
ENVIRONMENT=prod npx cdk deploy --require-approval=always
```

### Deploy specific stack only
```bash
ENVIRONMENT=dev npx cdk deploy EksShowcase-dev-Network
```

### Destroy infrastructure
```bash
# Dev/Staging (no protection)
ENVIRONMENT=dev npx cdk destroy

# Production (requires manual removal of termination protection first)
# 1. Go to AWS CloudFormation Console
# 2. Select stack → Stack Actions → Edit Stack Settings
# 3. Disable "Termination Protection"
# 4. Then run:
ENVIRONMENT=prod npx cdk destroy
```

## 📋 Stack Dependency Order

The app creates stacks in this order:

```
1️⃣ Network Stack (VPC, Subnets, NAT Gateways)
   ↓
2️⃣ EKS Stack (Kubernetes Cluster) ← depends on Network
   ↓
3️⃣ GitOps Stack (ArgoCD) ← depends on EKS

2️⃣ Storage Stack (S3 Buckets) ← runs in parallel with EKS
```

## 🏷️ Naming Convention

Stack names follow the pattern: `EksShowcase-{environment}-{component}`

**Examples:**
- `EksShowcase-dev-Network`
- `EksShowcase-prod-EKS`
- `EksShowcase-staging-Storage`
- `EksShowcase-prod-GitOps`

## 🔐 Production Safety Features

### Termination Protection
Production stacks are automatically protected against accidental deletion:

```bash
# To destroy production, you must:
# 1. Disable termination protection in AWS Console
# 2. Re-run destroy command
ENVIRONMENT=prod npx cdk destroy
```

### Approval Required
Always deploy production with approval flag:

```bash
ENVIRONMENT=prod npx cdk deploy --require-approval=always
```

## 🏷️ Global Tagging

All resources are tagged with values from the environment config:

**Dev/Staging tags:**
- Environment: dev/staging
- Project: eks-cdk-argocd-showcase
- ManagedBy: cdk
- Owner: devops-team

**Production tags (additional):**
- CostCenter: engineering

View tags in AWS Console → Resource Groups & Tag Editor.

## 🔧 Customization

### Change Default Environment
Edit `bin/app.ts` line ~21:
```typescript
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
```

### Modify Stack Prefix
Edit line ~68:
```typescript
const stackPrefix = `EksShowcase-${config.envName}`;
```

### Adjust Termination Protection
Edit lines ~151-156 to change which environments get protection.

## 📊 Configuration Source

Configurations are loaded from `lib/config/`:
- `lib/config/dev.ts` - Development environment
- `lib/config/staging.ts` - Staging environment
- `lib/config/prod.ts` - Production environment

See [lib/config/README.md](../lib/config/README.md) for detailed configuration documentation.

## ❌ Troubleshooting

### "AWS Account and Region must be specified"
```bash
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1
npx cdk deploy
```

### "Unknown environment: qa"
Currently supports: `dev`, `staging`, `prod`

To add a new environment:
1. Create `lib/config/qa.ts`
2. Update `lib/config/index.ts`
3. Deploy: `ENVIRONMENT=qa npx cdk deploy`

### Check AWS Credentials
```bash
aws sts get-caller-identity

# Should output:
# {
#   "Account": "123456789012",
#   "UserId": "AIDAI...",
#   "Arn": "arn:aws:iam::123456789012:user/..."
# }
```

## 📚 Further Reading

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [Configuration Guide](../lib/config/README.md)
- [Stack Implementation Guide](../lib/stacks/README.md)
