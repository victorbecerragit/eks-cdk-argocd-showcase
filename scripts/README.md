# Helper Scripts

Utility scripts for managing the AWS CDK Infrastructure and Kubernetes platform deployments. These scripts simplify common operations across the reorganized project structure.

## Project Structure Context

This showcase project is organized as follows:
```
├── iac/              # AWS Infrastructure as Code (CDK) - where CDK commands run
├── platform/         # Kubernetes configuration manifests
├── docs/             # Comprehensive documentation
├── helm-charts/      # Reusable Helm charts
└── scripts/          # Helper scripts (this directory)
```

The scripts in this directory work with the `/iac/` directory where all CDK code resides.

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
# From root directory
./scripts/generate-templates.sh

# Or from /iac directory
cd iac && npm run build
```

**Expected Output:**
```
✓ All templates generated successfully!

Next Steps:
  1. Review the generated templates in: iac/cdk.out/
  2. Deploy with: npm run deploy (from root, or cd iac && npm run deploy)
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

All CDK operations can be run from the root directory using delegated npm scripts:

```bash
# From root directory:

# 1. Install dependencies (installs for /iac)
npm install

# 2. Build TypeScript
npm run build

# 3. Generate templates for specific environment
npm run synth          # generates for dev (default)
npm run synth:staging  # generates for staging
npm run synth:prod     # generates for prod

# 4. Deploy infrastructure
npm run deploy      # deploy to dev
npm run deploy:prod # deploy to prod with approval

# 5. View changes before deploying
cd iac && npx cdk diff -c environment=dev

# 6. Destroy infrastructure
npm run destroy
```

Or run commands directly from `/iac/` directory:

```bash
cd iac
npm run build
npx cdk synth -c environment=dev
```

## Generated Templates Location

All CloudFormation templates are generated in the `iac/cdk.out/` directory:

```
iac/cdk.out/
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
1. AWS credentials configured (see [AWS_SETUP.md](../AWS_SETUP.md))
2. Node.js 18+ installed
3. TypeScript dependencies installed (`npm install`)
4. Working in the root directory or `/iac/` directory

See the main [README.md](../README.md) and [docs/START_HERE.md](../docs/START_HERE.md) for detailed setup instructions.

## Related Documentation

- **[../README.md](../README.md)** - Main project documentation
- **[../AWS_SETUP.md](../AWS_SETUP.md)** - AWS account setup and credential configuration
- **[../docs/DEPLOYMENT_CHECKLIST.md](../docs/DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment guide
- **[../docs/QUICK_REFERENCE.md](../docs/QUICK_REFERENCE.md)** - Common operations reference
- **[../docs/START_HERE.md](../docs/START_HERE.md)** - Navigation hub for all documentation
