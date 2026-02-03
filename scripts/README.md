# Template Generation Scripts

This directory contains helper scripts for generating CloudFormation templates and common CDK operations.

## Scripts

### 1. `generate-templates.sh` - Automated Template Generation

Automatically generates CloudFormation templates for **all environments** (dev, staging, prod).

**What it does:**
- Installs npm dependencies
- Compiles TypeScript
- Synthesizes CloudFormation templates for all 3 environments
- Displays summary of generated artifacts
- Validates configuration for each environment

**Usage:**
```bash
./scripts/generate-templates.sh
```

**Expected Output:**
```
✓ All templates generated successfully!

Next Steps:
  1. Review the generated templates in: cdk.out/
  2. Deploy with: npx cdk deploy --all -c environment=dev
  3. Or use: ./scripts/quick-reference.sh for more commands
```

### 2. `quick-reference.sh` - Command Reference Guide

Displays a quick reference of common CDK commands.

**Usage:**
```bash
./scripts/quick-reference.sh
```

**Includes:**
- Template generation
- TypeScript compilation
- Environment-specific synthesis
- Deployment commands
- Cleanup/destroy commands
- Template file locations

## Manual Commands

If you prefer to run commands manually:

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Generate templates for specific environment
npx cdk synth -c environment=dev
npx cdk synth -c environment=staging
npx cdk synth -c environment=prod

# 4. Deploy
npx cdk deploy --all -c environment=dev

# 5. View changes before deploying
npx cdk diff -c environment=dev

# 6. Destroy infrastructure
npx cdk destroy --all -c environment=dev
```

## Generated Templates Location

All CloudFormation templates are generated in the `cdk.out/` directory:

```
cdk.out/
├── EksShowcase-dev-Network.template.json
├── EksShowcase-dev-EKS.template.json
├── EksShowcase-dev-Storage.template.json
├── EksShowcase-dev-GitOps.template.json
├── EksShowcase-staging-Network.template.json
├── EksShowcase-staging-EKS.template.json
├── EksShowcase-staging-Storage.template.json
├── EksShowcase-staging-GitOps.template.json
├── EksShowcase-prod-Network.template.json
├── EksShowcase-prod-EKS.template.json
├── EksShowcase-prod-Storage.template.json
├── EksShowcase-prod-GitOps.template.json
└── [nested templates and assets...]
```

## Template Summary

### File Sizes by Environment

| Environment | Network | EKS | Storage | GitOps | Total |
|-------------|---------|-----|---------|--------|-------|
| Dev | 34 KB | 40 KB | 7.1 KB | 1.2 KB | ~82 KB |
| Staging | 36 KB | 41 KB | 7.1 KB | 1.2 KB | ~85 KB |
| Prod | 48 KB | 41 KB | 4.0 KB | 1.2 KB | ~94 KB |

### Key Differences by Environment

**Dev:**
- 1 NAT Gateway
- 2-6 node capacity
- t3.medium instances
- Optional Spot pricing
- 90-day S3 lifecycle

**Staging:**
- 2 NAT Gateways (HA)
- 3-10 node capacity
- Mixed t3.medium/large instances
- On-Demand capacity
- 180-day S3 lifecycle

**Production:**
- 3 NAT Gateways (Full HA)
- 6-20 node capacity
- t3.large/xlarge instances
- On-Demand capacity only
- 365-day S3 lifecycle
- CloudFormation termination protection enabled

## Troubleshooting

### Schema Version Warning

If you see:
```
Cloud assembly schema version mismatch: Maximum schema version supported is 38.x.x, but found 48.0.0
```

This warning can be safely ignored - templates still generate successfully.

### Permission Denied on Scripts

Make scripts executable:
```bash
chmod +x scripts/generate-templates.sh
chmod +x scripts/quick-reference.sh
```

### Templates Not Generating

Ensure you have:
1. AWS credentials configured
2. Node.js 18+ installed
3. TypeScript dependencies installed (`npm install`)

See the main [README.md](../README.md) for detailed setup instructions.
