# Repository Reorganization Implementation Guide

## Overview

This guide provides step-by-step instructions to reorganize the repository from the current structure to a clearer, more maintainable structure that clearly separates AWS infrastructure provisioning (CDK) from in-cluster Kubernetes configuration.

---

## Current vs. Proposed Structure Comparison

### Current Pain Points
```
infrastructure/          ← CONFUSING: This contains K8s manifests, not AWS infra!
├── ARCHITECTURE.md
├── multi-tenancy/
├── security/
├── observability/
├── helm-values/
└── gitops/

gitops/                  ← REDUNDANT: Also contains K8s configs
├── argocd/
├── helm-charts/
└── manifests/

This creates confusion: What's the difference between infrastructure/ and gitops/?
```

### Proposed Clear Structure
```
iac/                     ← Everything for AWS (CDK)
├── lib/                 # Source code
│   ├── config/
│   ├── constructs/
│   └── stacks/
├── bin/
├── test/
└── package.json

platform/                ← Everything for Kubernetes (declarative)
├── tenants/             # Multi-tenant configs
├── security/            # Security policies
├── observability/       # Monitoring stack
└── gitops/              # ArgoCD orchestration

docs/                    ← All documentation
├── ARCHITECTURE.md
├── DEPLOYMENT_CHECKLIST.md
├── QUICK_REFERENCE.md
├── MULTI_TENANCY.md
├── SECURITY.md
├── OBSERVABILITY.md
└── TROUBLESHOOTING.md

helm-charts/             ← Reusable Helm charts
```

---

## Implementation Plan

### Phase 1: Preparation (No breaking changes)

#### ✅ Task 1.1: Create new directory structure
```bash
# Navigate to repository root
cd /path/to/eks-cdk-argocd-showcase

# Create new directories
mkdir -p iac
mkdir -p platform/{tenants,security,observability,gitops/applications}
mkdir -p docs
mkdir -p helm-charts
```

#### ✅ Task 1.2: Copy CDK files to new iac/ directory
```bash
# Copy CDK configuration files
cp -v cdk.json iac/
cp -v cdk.context.json iac/
cp -v tsconfig.json iac/
cp -v jest.config.js iac/
cp -v package.json iac/
cp -v package-lock.json iac/

# Copy directories
cp -rv bin/* iac/bin/
cp -rv lib/* iac/lib/
cp -rv test/* iac/test/
cp -rv assets iac/
```

#### ✅ Task 1.3: Organize Kubernetes manifests
```bash
# Move multi-tenancy configs
cp -rv infrastructure/multi-tenancy/* platform/tenants/

# Move security configs
cp -rv infrastructure/security/* platform/security/

# Move observability configs
cp -rv infrastructure/observability/* platform/observability/
cp -rv infrastructure/helm-values/* platform/observability/

# Move ArgoCD applications
cp -rv gitops/argocd/applications/* platform/gitops/applications/

# Copy Helm charts
cp -rv gitops/helm-charts/* helm-charts/

# Move manifests if any
cp -rv gitops/manifests/* platform/ 2>/dev/null || true
```

#### ✅ Task 1.4: Organize documentation
```bash
# Create docs/ with all architecture and operational docs
cp -v infrastructure/README.md docs/PLATFORM.md
cp -v infrastructure/ARCHITECTURE.md docs/
cp -v infrastructure/DEPLOYMENT_CHECKLIST.md docs/
cp -v infrastructure/QUICK_REFERENCE.md docs/
cp -v infrastructure/FILES_INDEX.md docs/
cp -v infrastructure/PROJECT_SUMMARY.md docs/

# Copy existing docs
cp -rv docs/images docs/  # if exists
```

---

### Phase 2: Update Configuration Files

#### ✅ Task 2.1: Update iac/package.json

**Old paths** (in scripts):
```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc -w",
    "test": "jest --passWithNoTests --testPathPattern='.*\\.test\\.ts$'",
    "cdk": "cdk",
    "synth": "cdk synth -c environment=dev",
    "synth:prod": "cdk synth -c environment=prod --require-approval never"
  }
}
```

These paths work fine in `/iac` directory as-is (no changes needed).

#### ✅ Task 2.2: Create root-level package.json

**New file**: `/package.json` (root level)

```json
{
  "name": "eks-cdk-argocd-showcase",
  "version": "1.0.0",
  "description": "Production-ready EKS platform with CDK and GitOps",
  "private": true,
  "scripts": {
    "build": "cd iac && npm run build",
    "build:watch": "cd iac && npm run build:watch",
    "test": "cd iac && npm run test",
    "cdk": "cd iac && npm run cdk",
    "synth": "cd iac && npm run synth",
    "synth:staging": "cd iac && cdk synth -c environment=staging",
    "synth:prod": "cd iac && npm run synth:prod",
    "deploy": "cd iac && npm run cdk deploy",
    "deploy:prod": "cd iac && cdk deploy -c environment=prod --require-approval never"
  },
  "devDependencies": {}
}
```

#### ✅ Task 2.3: Update iac/README.md

```markdown
# Infrastructure as Code (AWS CDK)

This directory contains AWS infrastructure provisioning code using AWS CDK v2.

## Structure
- `lib/` - CDK source code
  - `config/` - Environment configurations
  - `constructs/` - Reusable L3 CDK constructs
  - `stacks/` - CloudFormation stacks
- `bin/` - CDK app entry point
- `test/` - Unit tests

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to AWS
npx cdk deploy

# Synth specific environment
npx cdk synth -c environment=prod
```

## Commands

- `npm run build` - Compile TypeScript
- `npm run test` - Run tests
- `npm run cdk` - Run CDK CLI
- `npx cdk synth` - Generate CloudFormation template
- `npx cdk diff` - Show infrastructure changes
- `npx cdk deploy` - Deploy to AWS

## Documentation

See `/docs/ARCHITECTURE.md` for the complete system architecture.
```

---

### Phase 3: Create new documentation structure

#### ✅ Task 3.1: Create platform/README.md

```markdown
# Kubernetes Platform Configuration

This directory contains all in-cluster Kubernetes configuration and platform setup.

## Structure

- `tenants/` - Multi-tenant isolation and quota management
  - `namespaces.yaml` - Tenant namespaces and resource quotas
  - `rbac.yaml` - Role-based access control
  
- `security/` - Security policies and isolation
  - `pod-security-policies.yaml` - Pod security standards
  - `network-policies.yaml` - Network isolation rules
  
- `observability/` - Monitoring and logging stack
  - `prometheus/` - Metrics collection and alerting
  - `loki/` - Log aggregation and search
  
- `gitops/` - ArgoCD orchestration
  - `app-of-apps.yaml` - Root ArgoCD application
  - `applications/` - Individual application definitions

## Deployment

### Initial Platform Setup (one-time)

```bash
# 1. Create tenants and namespaces
kubectl apply -f tenants/namespaces.yaml

# 2. Configure RBAC
kubectl apply -f tenants/rbac.yaml

# 3. Apply security policies
kubectl apply -f security/

# 4. Deploy observability stack
kubectl apply -f observability/

# 5. Deploy ArgoCD and activate continuous sync
kubectl apply -f gitops/app-of-apps.yaml
```

### Continuous Deployment

Once ArgoCD is running, all changes in the Git repository are automatically synced to the cluster.

```bash
# Monitor sync status
kubectl get applications -n argocd

# View ArgoCD UI (port-forward)
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

## Documentation

See `/docs/PLATFORM.md` for complete platform documentation.
See `/docs/MULTI_TENANCY.md` for multi-tenancy details.
See `/docs/OBSERVABILITY.md` for monitoring setup.
```

#### ✅ Task 3.2: Create docs/README.md

```markdown
# Documentation

This directory contains all project documentation.

## Core Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture, components, and data flow
- **[PLATFORM.md](PLATFORM.md)** - Kubernetes platform configuration guide
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Pre/during/post deployment steps

## Detailed Guides

- **[MULTI_TENANCY.md](MULTI_TENANCY.md)** - Multi-tenant isolation architecture
- **[SECURITY.md](SECURITY.md)** - Security policies and controls
- **[OBSERVABILITY.md](OBSERVABILITY.md)** - Monitoring, logging, and alerting setup
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Common commands and operations

## Getting Started

**For new developers:**
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
2. Read [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for setup process
3. See `/iac/README.md` for CDK changes
4. See `/platform/README.md` for Kubernetes changes

**For operators:**
1. Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common tasks
2. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if issues arise

**For security team:**
1. Review [SECURITY.md](SECURITY.md) for security architecture
2. Review [MULTI_TENANCY.md](MULTI_TENANCY.md) for isolation controls
```

---

### Phase 4: Validation & Testing

#### ✅ Task 4.1: Validate CDK code

```bash
# Navigate to iac directory
cd iac

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run tests
npm run test

# Synthesize all environments
npx cdk synth -c environment=dev
npx cdk synth -c environment=staging
npx cdk synth -c environment=prod
```

#### ✅ Task 4.2: Validate Kubernetes manifests

```bash
# Check YAML syntax (dry-run)
kubectl apply -f platform/tenants/namespaces.yaml --dry-run=client
kubectl apply -f platform/tenants/rbac.yaml --dry-run=client
kubectl apply -f platform/security/ --dry-run=client
kubectl apply -f platform/observability/ --dry-run=client
```

---

### Phase 5: Update CI/CD pipelines

#### ✅ Task 5.1: Update GitHub Actions workflows

**Example: `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy-infrastructure:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./iac
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npx cdk deploy

  deploy-platform:
    runs-on: ubuntu-latest
    needs: deploy-infrastructure
    if: success()
    steps:
      - uses: actions/checkout@v3
      - uses: azure/setup-kubectl@v3
      - run: kubectl apply -f platform/tenants/
      - run: kubectl apply -f platform/gitops/
```

---

### Phase 6: Clean up old directories

#### ⚠️ Task 6.1: Remove old infrastructure/ directory

**AFTER** confirming everything works:

```bash
# Backup old directory (just in case)
mv infrastructure infrastructure.backup

# After a week of verification, delete
rm -rf infrastructure.backup
```

#### ⚠️ Task 6.2: Reorganize gitops/ directory

**Option A**: Move remaining gitops content to platform/
```bash
# After copying, check for anything remaining
ls -la gitops/

# If empty, can remove:
rm -rf gitops
```

**Option B**: Keep gitops/ for GitOps-specific tools/configs
```bash
# Keep if you add GitOps-specific tooling
mkdir -p gitops
# Put any GitOps tool-specific files here
```

---

### Phase 7: Update documentation references

#### ✅ Task 7.1: Update root README.md

**Old sections:**
```markdown
├── infrastructure/   # Kubernetes configuration
├── gitops/          # ArgoCD setup
└── lib/             # CDK code
```

**New sections:**
```markdown
├── iac/                      # AWS Infrastructure as Code (CDK)
│   ├── lib/                  # CDK source
│   ├── bin/                  # CDK app entry point
│   └── test/                 # CDK tests
│
├── platform/                 # Kubernetes Platform
│   ├── tenants/              # Multi-tenancy
│   ├── security/             # Security policies
│   ├── observability/        # Monitoring stack
│   └── gitops/               # ArgoCD apps
│
├── helm-charts/              # Reusable Helm charts
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   └── QUICK_REFERENCE.md
│
└── scripts/                  # Helper scripts
```

---

## Validation Checklist

- [ ] All CDK files copied to `/iac`
- [ ] All Kubernetes manifests in `/platform`
- [ ] All Helm charts in `/helm-charts`
- [ ] All documentation in `/docs`
- [ ] `iac/package.json` updated with correct paths
- [ ] Root-level `package.json` created for convenience
- [ ] README.md files created for each major directory
- [ ] CDK code builds successfully: `npm run build`
- [ ] Kubernetes YAML validates: `kubectl apply --dry-run`
- [ ] CI/CD pipelines updated with new paths
- [ ] All team members notified of changes
- [ ] Old directories archived/removed after verification

---

## Troubleshooting

### Issue: "Cannot find module" in CDK

**Solution**: Ensure you're in the `/iac` directory before running CDK commands
```bash
cd iac
npm install
npm run build
```

### Issue: kubectl apply fails with "file not found"

**Solution**: Ensure you're running from the repository root
```bash
cd /path/to/eks-cdk-argocd-showcase
kubectl apply -f platform/tenants/namespaces.yaml
```

### Issue: Want to rollback changes

**Solution**: Use git to revert
```bash
# See what changed
git status

# Revert all changes
git checkout .

# Restore from backup
rm -rf iac platform helm-charts
mv infrastructure.backup infrastructure
# ... restore other directories
```

---

## Benefits After Reorganization

✅ **Clarity**: Obvious separation between AWS provisioning (CDK) and Kubernetes configuration  
✅ **Scalability**: Easy to add new components in organized directories  
✅ **Maintainability**: Clear file structure helps new developers understand the project  
✅ **Automation**: CI/CD can clearly target specific directories  
✅ **Documentation**: Self-documenting through directory names and organization  

---

**Created**: February 2026  
**Status**: Implementation Guide  
**Estimated Time**: 1-2 hours (including validation and testing)
