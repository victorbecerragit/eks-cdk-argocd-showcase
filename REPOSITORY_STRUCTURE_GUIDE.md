# Repository Structure & Organization Guide

## Current State Analysis

### 🔍 Problems with Current Organization

1. **Naming Confusion**: The `infrastructure/` folder contains **Kubernetes manifests**, not actual AWS infrastructure code
   - AWS infrastructure (EKS creation) is in `lib/` and `bin/`
   - In-cluster configuration is misleadingly named `infrastructure/`

2. **Unclear Separation of Concerns**:
   - CDK code (AWS provisioning) → `lib/` + `bin/`
   - Kubernetes manifests (in-cluster) → `infrastructure/` + `gitops/`
   - This causes confusion about what's "infrastructure"

3. **Fragmented GitOps Structure**:
   - ArgoCD manifests in `gitops/argocd/`
   - Kubernetes infrastructure in `infrastructure/gitops/`
   - Unclear hierarchy and deployment flow

4. **Missing Context for Developers**:
   - New developers don't immediately understand:
     - What creates the cluster (CDK)
     - What runs inside the cluster (K8s manifests)
     - What orchestrates deployment to cluster (ArgoCD)

---

## 📋 Proposed Structure

### Option A: **Recommended - Clear IaC vs In-Cluster Separation**

```
eks-cdk-argocd-showcase/
│
├── README.md                          # Project overview & quick start
├── AWS_SETUP.md                       # AWS account setup guide
├── DEPLOYMENT_GUIDE.md                # Step-by-step deployment instructions
│
│
├─── 📁 /iac                           # Infrastructure as Code (AWS Provisioning)
│    │
│    ├── bin/
│    │   ├── app.ts                    # CDK App entry point
│    │   └── README.md
│    │
│    ├── lib/
│    │   ├── config/                   # Environment configs (dev/staging/prod)
│    │   ├── constructs/               # Reusable L3 CDK constructs
│    │   └── stacks/                   # CloudFormation Stacks
│    │
│    ├── test/                         # CDK unit tests
│    ├── cdk.json
│    ├── cdk.context.json
│    ├── tsconfig.json
│    └── package.json
│
│
├─── 📁 /platform                      # Kubernetes Platform Configuration
│    │                                  # Everything that runs IN the cluster
│    │
│    ├── README.md                     # Platform architecture overview
│    │
│    ├── tenants/                      # Multi-tenant isolation
│    │   ├── namespaces.yaml           # Tenant namespaces & quotas
│    │   ├── rbac.yaml                 # RBAC roles & service accounts
│    │   └── README.md
│    │
│    ├── security/                     # Security policies
│    │   ├── pod-security-policies.yaml
│    │   ├── network-policies.yaml
│    │   └── README.md
│    │
│    ├── observability/                # Monitoring stack
│    │   ├── prometheus/
│    │   │   ├── service-monitors.yaml
│    │   │   ├── alerting-rules.yaml
│    │   │   └── values.yaml
│    │   ├── loki/
│    │   │   ├── config.yaml
│    │   │   └── values.yaml
│    │   └── README.md
│    │
│    └── gitops/                       # GitOps orchestration
│        ├── app-of-apps.yaml          # Root ArgoCD application
│        ├── infrastructure-apps.yaml  # Platform components apps
│        ├── applications/             # Application definitions
│        │   ├── tenants/
│        │   │   ├── alpha/demo-app.yaml
│        │   │   └── beta/demo-app.yaml
│        │   └── monitoring.yaml
│        └── README.md
│
│
├─── 📁 /helm-charts                   # Custom Helm charts
│    ├── demo-app/
│    │   ├── Chart.yaml
│    │   ├── values.yaml
│    │   └── templates/
│    └── README.md
│
│
├─── 📁 /docs                          # Documentation
│    ├── ARCHITECTURE.md               # System architecture diagrams
│    ├── DEPLOYMENT_CHECKLIST.md       # Pre/during/post deployment steps
│    ├── QUICK_REFERENCE.md            # Common commands
│    ├── MULTI_TENANCY.md              # Tenant isolation details
│    ├── SECURITY.md                   # Security architecture
│    ├── OBSERVABILITY.md              # Monitoring & logging setup
│    └── TROUBLESHOOTING.md
│
│
├─── 📁 /scripts                       # Helper scripts
│    ├── generate-templates.sh         # Generate CloudFormation templates
│    ├── quick-reference.sh
│    └── README.md
│
│
├─── 📁 /assets                        # Supporting assets
│    └── kubectl-layer/
│
│
└─── 📁 /.github                       # GitHub-specific files
     └── workflows/                    # CI/CD pipelines
```

---

## 📊 Directory Purpose Reference Table

| Directory | Purpose | Owner | Deployment | Tools |
|-----------|---------|-------|-----------|-------|
| `/iac` | AWS infrastructure provisioning | DevOps/Platform | AWS CloudFormation | CDK, TypeScript |
| `/platform` | In-cluster configuration | Platform Engineer | kubectl/GitOps | YAML, Helm |
| `/helm-charts` | Reusable Helm charts | Application/Platform | Helm | Helm |
| `/docs` | Architecture & operations guides | Everyone | N/A (reference) | Markdown |
| `/scripts` | Automation helpers | DevOps | Shell/bash | Bash/Shell |

---

## 🔄 Deployment Flow

```
1️⃣ PROVISION AWS INFRASTRUCTURE
   └─→ cd /iac
       npm install
       npx cdk deploy

2️⃣ CONFIGURE KUBERNETES PLATFORM
   └─→ kubectl apply -k /platform/tenants
       kubectl apply -k /platform/security
       kubectl apply -k /platform/observability

3️⃣ DEPLOY GITOPS ORCHESTRATION
   └─→ kubectl apply -f /platform/gitops/app-of-apps.yaml
       (ArgoCD takes over and syncs everything)

4️⃣ GITOPS MANAGES CLUSTER STATE
   └─→ Git commits → ArgoCD → Cluster auto-sync
```

---

## ✅ Benefits of Proposed Structure

### 🎯 **Clarity**
- **`/iac`**: Everything for creating AWS resources
- **`/platform`**: Everything for in-cluster configuration
- Clear separation of concerns

### 📚 **Developer Experience**
- New team members understand the flow immediately
- Directory names clearly indicate purpose
- Logical grouping of related files

### 🚀 **Scalability**
- Easy to add new observability tools
- Simple to add new tenants
- Clear location for new applications

### 🔐 **Security**
- Tenants isolated in separate directory
- Security policies grouped together
- Audit-friendly organization

### 🤖 **Automation**
- CI/CD can clearly target `/iac` or `/platform`
- Separate pipelines for AWS vs Kubernetes operations
- Easy to add pre-deployment validation

---

## 🔧 Migration Path (If adopting this structure)

### Step 1: Create new structure
```bash
mkdir -p iac/{bin,lib,test}
mkdir -p platform/{tenants,security,observability,gitops}
mkdir -p docs
mkdir -p helm-charts
```

### Step 2: Move files
```bash
# Move CDK code
mv bin/* iac/bin/
mv lib/* iac/lib/
mv test/* iac/test/
mv cdk.json cdk.context.json tsconfig.json package.json iac/

# Reorganize Kubernetes manifests
mv infrastructure/multi-tenancy/* platform/tenants/
mv infrastructure/security/* platform/security/
mv infrastructure/observability/* platform/observability/
mv gitops/argocd/* platform/gitops/
mv gitops/helm-charts/* helm-charts/
mv gitops/manifests/* platform/
```

### Step 3: Update documentation
- Move all architecture docs to `/docs`
- Update all README.md files with new paths
- Update CI/CD pipeline paths

---

## 🏗️ Alternative: Option B (If using monorepo)

If you prefer a monorepo approach with workspaces:

```
├── packages/
│   ├── iac/               # CDK (npm workspace)
│   └── platform/          # K8s configs (npm workspace)
├── docs/
├── scripts/
└── README.md
```

**Pros**: Better dependency management, separate package.json  
**Cons**: More complex CI/CD, requires npm workspaces

---

## 📌 Recommendation

**→ Use Option A** (Clear `/iac` and `/platform` separation)

**Why**:
- ✅ Simple to implement
- ✅ Easy to understand
- ✅ Clear deployment flow
- ✅ Works well for current project size
- ✅ Scales to larger teams

---

## 🔗 Next Steps

1. Review this structure with your team
2. Decide on migration timeline
3. Update CI/CD pipelines
4. Create comprehensive README files for each directory
5. Set up folder-level documentation standards

---

**Created**: February 2026  
**Status**: Recommendation Document  
**Last Updated**: Based on current codebase analysis
