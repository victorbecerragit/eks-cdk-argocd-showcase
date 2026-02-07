# Infrastructure as Code (AWS CDK)

This directory contains AWS infrastructure provisioning code using AWS CDK v2.

## Quick Overview

- **Technology**: AWS CDK v2 (TypeScript)
- **Purpose**: Define and deploy AWS infrastructure
- **Scope**: VPC, EKS, S3, IAM, CloudWatch, Load Balancers

## Directory Structure

```
iac/
├── bin/                 # CDK app entry point
│   └── app.ts          # Stack orchestration
├── lib/
│   ├── config/         # Environment configurations (dev/staging/prod)
│   ├── constructs/     # Reusable L3 CDK constructs
│   └── stacks/         # CloudFormation stack definitions
├── test/               # Unit tests
├── cdk.json            # CDK configuration
├── package.json        # Node.js dependencies
└── tsconfig.json       # TypeScript configuration
```

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Synthesize CloudFormation templates
npx cdk synth

# Deploy to AWS
npx cdk deploy

# Deploy to specific environment
npx cdk deploy -c environment=prod
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript |
| `npm run test` | Run unit tests |
| `npx cdk synth` | Generate CloudFormation template |
| `npx cdk diff` | Show infrastructure changes |
| `npx cdk deploy` | Deploy to AWS |
| `npx cdk destroy` | Tear down infrastructure |

## Configuration

Environment-specific configurations are in `/lib/config/`:
- `dev.ts` - Development (cost-optimized)
- `staging.ts` - Staging (HA testing)
- `prod.ts` - Production (high availability)

See `lib/config/README.md` for detailed configuration documentation.

## Environments

Deploy to specific environments:

```bash
# Dev (default)
npx cdk deploy

# Staging
npx cdk deploy -c environment=staging

# Production (requires approval)
npx cdk deploy -c environment=prod --require-approval always
```

## Troubleshooting

**"Cannot find module"**: Ensure you've run `npm install`

**TypeScript errors**: Run `npm run build -- --noEmit` to check

**Deployment fails**: Check AWS credentials with `aws sts get-caller-identity`

## See Also

- [Architecture Overview](../docs/ARCHITECTURE_OVERVIEW.md)
- [Deployment Guide](../docs/DEPLOYMENT_CHECKLIST.md)
- [AWS Setup](../AWS_SETUP.md)

---

For more information about using AWS CDK, see the [AWS CDK documentation](https://docs.aws.amazon.com/cdk/v2/guide/).
