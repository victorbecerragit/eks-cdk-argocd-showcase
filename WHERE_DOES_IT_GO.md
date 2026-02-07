# Quick Decision & Organization Guide

## "Where Does This Go?" - Decision Flowchart

```
START: You want to add/modify something
│
├─→ Is it AWS-related? (VPC, EKS, S3, IAM, CloudFormation, etc.)
│   │
│   └─→ YES
│       │
│       ├─ Is it a TypeScript construct or stack definition?
│       │  └─→ YES: Put in /iac/lib/
│       │         (constructs/ or stacks/)
│       │
│       └─ Is it a configuration (dev/staging/prod)?
│          └─→ YES: Put in /iac/lib/config/
│                   (environment-specific)
│
│
├─→ Is it Kubernetes-related? (Deployments, Services, RBAC, Policies, etc.)
│   │
│   └─→ YES
│       │
│       ├─ Is it namespaces, quotas, or RBAC?
│       │  └─→ YES: Put in /platform/tenants/
│       │
│       ├─ Is it security policies (PSP, NetworkPolicy)?
│       │  └─→ YES: Put in /platform/security/
│       │
│       ├─ Is it observability (Prometheus, Loki, Grafana)?
│       │  └─→ YES: Put in /platform/observability/
│       │
│       └─ Is it an ArgoCD application or GitOps orchestration?
│          └─→ YES: Put in /platform/gitops/
│
│
├─→ Is it a Helm chart?
│   │
│   └─→ YES: Put in /helm-charts/
│
│
├─→ Is it documentation?
│   │
│   └─→ YES: Put in /docs/
│
│
├─→ Is it a helper script?
│   │
│   └─→ YES: Put in /scripts/
│
│
└─→ END: File placed in correct location
```

---

## Organization at a Glance

### 📁 **iac/** - AWS Infrastructure (CDK)

```
What goes here?
- AWS VPC, Subnets, NAT Gateways
- EKS Cluster, Node Groups
- S3 Buckets, IAM Roles
- CloudWatch, Load Balancers
- Any TypeScript/CDK code

What DOESN'T go here?
- Kubernetes manifests (YAML)
- Helm charts
- ArgoCD applications
- Security policies for pods
- Monitoring configurations in YAML
```

**Example changes:**
```bash
# Modify EKS node group size
iac/lib/stacks/eks-stack.ts

# Change VPC CIDR
iac/lib/config/prod.ts

# Add new environment
iac/lib/config/new-environment.ts
```

---

### 📁 **platform/** - Kubernetes Configuration

#### **platform/tenants/** - Multi-Tenant Setup
```yaml
What goes here?
- Namespace definitions
- Resource quotas per tenant
- RBAC role definitions
- Service accounts for tenants
- Kubernetes RBAC bindings

Example file names:
- tenants/namespaces.yaml
- tenants/rbac.yaml
- tenants/quotas.yaml
```

#### **platform/security/** - Security Policies
```yaml
What goes here?
- Pod Security Policies
- Network Policies
- Security contexts
- Pod security standards (PSS)
- Network egress/ingress rules

Example file names:
- security/pod-security-policies.yaml
- security/network-policies.yaml
- security/security-context.yaml
```

#### **platform/observability/** - Monitoring Stack
```
What goes here?
- Prometheus configuration
- Loki configuration
- Grafana dashboards
- AlertManager setup
- Service Monitors
- Recording rules
- Alert rules

Example files:
- observability/prometheus/values.yaml
- observability/prometheus/service-monitors.yaml
- observability/loki/config.yaml
- observability/observability-stack.yaml
```

#### **platform/gitops/** - ArgoCD Applications
```yaml
What goes here?
- ArgoCD Application definitions
- App-of-Apps root application
- ApplicationSets for dynamic apps
- ArgoCD project definitions
- Application sync policies

Example files:
- gitops/app-of-apps.yaml
- gitops/applications/tenants/alpha/demo-app.yaml
- gitops/infrastructure-apps.yaml
```

---

### 📁 **helm-charts/** - Reusable Helm Charts

```
What goes here?
- Chart.yaml definitions
- values.yaml default values
- Templates for rendering K8s manifests
- Charts for applications
- Custom Helm libraries

What DOESN'T go here?
- Helm values for deployment (those go in /platform/observability/)
- ArgoCD Helm values (those go in /platform/gitops/)
```

**Example structure:**
```
helm-charts/
├── demo-app/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── configmap.yaml
│
├── api-service/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│
└── README.md
```

---

### 📁 **docs/** - All Documentation

```
What goes here?
- Architecture documentation
- Deployment guides
- Quick reference cards
- Security documentation
- Multi-tenancy guides
- Troubleshooting guides
- How-to guides
- Configuration documentation

What DOESN'T go here?
- Code comments (those go in source files)
- README.md for directories (those in each directory)
- Generated documentation (builds in CI/CD, not in git)
```

**Structure:**
```
docs/
├── ARCHITECTURE.md           (System architecture & diagrams)
├── PLATFORM.md              (Kubernetes platform guide)
├── MULTI_TENANCY.md         (Tenant isolation details)
├── SECURITY.md              (Security architecture)
├── OBSERVABILITY.md         (Monitoring & logging)
├── DEPLOYMENT_CHECKLIST.md  (Step-by-step deployment)
├── QUICK_REFERENCE.md       (Common commands)
├── TROUBLESHOOTING.md       (Problem solving)
└── images/
    └── architecture-diagram.png
```

---

### 📁 **scripts/** - Helper Scripts

```
What goes here?
- Bash/shell scripts for automation
- CDK template generation
- Kubernetes setup helpers
- Backup/restore scripts
- Health check scripts
- Deployment automation

What DOESN'T go here?
- Python/Node.js applications (those go in src/)
- Test scripts (those go in /iac/test/)
```

---

## Quick Reference: File Location Lookup

| Item | Location | Format |
|------|----------|--------|
| EKS Cluster Config | `/iac/lib/stacks/eks-stack.ts` | TypeScript |
| Node Group Settings | `/iac/lib/config/[env].ts` | TypeScript |
| Tenant Namespaces | `/platform/tenants/namespaces.yaml` | YAML |
| RBAC Roles | `/platform/tenants/rbac.yaml` | YAML |
| Network Policies | `/platform/security/network-policies.yaml` | YAML |
| Pod Security Policy | `/platform/security/pod-security-policies.yaml` | YAML |
| Prometheus Config | `/platform/observability/prometheus/values.yaml` | YAML |
| Prometheus Rules | `/platform/observability/prometheus/alerting-rules.yaml` | YAML |
| Loki Config | `/platform/observability/loki/config.yaml` | YAML |
| ArgoCD Root App | `/platform/gitops/app-of-apps.yaml` | YAML |
| Tenant App | `/platform/gitops/applications/tenants/[name]/` | YAML |
| Helm Chart | `/helm-charts/[chart-name]/` | YAML + Templates |
| Architecture Docs | `/docs/ARCHITECTURE.md` | Markdown |
| Deployment Guide | `/docs/DEPLOYMENT_CHECKLIST.md` | Markdown |

---

## Common Scenarios

### Scenario 1: "I want to add a new tenant (tenant-gamma)"

**Files to create/modify:**

1. **Create namespaces** for tenant-gamma
   ```
   /platform/tenants/namespaces.yaml
   (Add namespace definition for tenant-gamma)
   ```

2. **Create RBAC** for tenant-gamma
   ```
   /platform/tenants/rbac.yaml
   (Add roles and bindings for tenant-gamma)
   ```

3. **Add security policies** if needed
   ```
   /platform/security/network-policies.yaml
   (Add network policy for tenant-gamma isolation)
   ```

4. **Create tenant application** in ArgoCD
   ```
   /platform/gitops/applications/tenants/gamma/
   demo-app.yaml (or custom app.yaml)
   ```

5. **Update main ArgoCD app** (if needed)
   ```
   /platform/gitops/infrastructure-apps.yaml
   (Reference new tenant-gamma app)
   ```

### Scenario 2: "I want to increase EKS cluster size"

**Files to modify:**

1. **Update node group config**
   ```
   /iac/lib/config/prod.ts
   (Increase desiredCapacity and maxSize)
   ```

2. **Deploy changes**
   ```bash
   cd iac
   npm run build
   npx cdk deploy -c environment=prod
   ```

### Scenario 3: "I want to add Datadog monitoring"

**Option A: Helm Chart (simple)**
```
/platform/observability/
├── datadog/
│   └── values.yaml (Datadog Helm values)
└── observability-stack.yaml (update to include Datadog app)
```

**Option B: Custom Chart (advanced)**
```
/helm-charts/datadog-agent/
├── Chart.yaml
├── values.yaml
└── templates/
```

**Then reference in ArgoCD:**
```
/platform/gitops/infrastructure-apps.yaml
(Add ArgoCD Application for datadog-agent)
```

### Scenario 4: "I want to document the tenant isolation architecture"

**Create documentation file:**
```
/docs/TENANT_ISOLATION.md
(Document isolation layers, quotas, RBAC, etc.)
```

---

## File Naming Conventions

### In `/iac/`
```
✅ DO:
- eks-stack.ts          (stack files)
- alb-controller-construct.ts (construct files)
- prod.ts, staging.ts   (environment files)

❌ DON'T:
- AWS-EKS-Stack.ts      (Use kebab-case)
- EksStackThing.ts      (Use descriptive names)
```

### In `/platform/`
```
✅ DO:
- namespaces.yaml       (resource kind in plural)
- rbac.yaml             (functional name)
- network-policies.yaml (resource kind + attribute)

❌ DON'T:
- my-namespaces.yaml    (Avoid "my-", be specific)
- all-rules.yaml         (Too vague)
```

### In `/docs/`
```
✅ DO:
- ARCHITECTURE.md       (All caps, descriptive)
- DEPLOYMENT_CHECKLIST.md (All caps, specific)
- QUICK_REFERENCE.md    (All caps, clear purpose)

❌ DON'T:
- doc.md                (Too vague)
- arch.md               (Use full words)
```

---

## Summary Table

| Question | Answer | Location |
|----------|--------|----------|
| Where is the AWS infrastructure code? | `/iac/` | All CDK TypeScript |
| Where are Kubernetes configurations? | `/platform/` | All YAML manifests |
| Where is the ArgoCD setup? | `/platform/gitops/` | ArgoCD Applications |
| Where are tenant isolation configs? | `/platform/tenants/` | Namespaces + RBAC |
| Where are security policies? | `/platform/security/` | PSP + Network Policies |
| Where is monitoring configured? | `/platform/observability/` | Prometheus + Loki + Grafana |
| Where are Helm charts? | `/helm-charts/` | Reusable chart templates |
| Where is documentation? | `/docs/` | Architecture + Guides |
| Where are helper scripts? | `/scripts/` | Automation scripts |
| Where is environment config? | `/iac/lib/config/` | Dev/Staging/Prod config |

---

## Checklist: "Did I put it in the right place?"

Before committing, ask yourself:

- [ ] Is it TypeScript/CDK code? → `/iac/`
- [ ] Is it YAML Kubernetes manifest? → `/platform/`
- [ ] Does it include environment vars? → Check if it's in `/iac/lib/config/`
- [ ] Is it documentation? → `/docs/`
- [ ] Is it a reusable Helm chart? → `/helm-charts/`
- [ ] Is it a helper script? → `/scripts/`
- [ ] Have I used consistent naming convention?
- [ ] Have I added a README to any new directories?
- [ ] Have I updated relevant index files if needed?

---

## Getting Help

**Confused about organization?**
→ Re-read this guide or check REPOSITORY_STRUCTURE_GUIDE.md

**Need step-by-step migration?**
→ Follow REORGANIZATION_GUIDE.md

**Want to see architecture?**
→ Check ARCHITECTURE_OVERVIEW.md

**Questions about where something goes?**
→ Run through the decision flowchart at the top of this document

---

**Created**: February 2026  
**Purpose**: Quick reference for repository organization  
**Status**: Ready to use
