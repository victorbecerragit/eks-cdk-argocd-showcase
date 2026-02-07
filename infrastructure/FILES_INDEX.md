# Infrastructure Files Index

Complete guide to all files in the `infrastructure/` directory structure.

## Directory Structure Overview

```
infrastructure/                          # New multi-tenant architecture
├── README.md                             # Complete technical documentation
├── QUICK_REFERENCE.md                    # Quick commands and specs
├── DEPLOYMENT_CHECKLIST.md               # Step-by-step deployment guide
├── ARCHITECTURE.md                       # Architecture diagrams & integration
├── FILES_INDEX.md                        # This file
│
├── multi-tenancy/                        # Tenant isolation configs
│   ├── namespaces.yaml                   # Namespace definitions + quotas + limits
│   └── rbac.yaml                         # Service accounts, Roles, RoleBindings
│
├── security/                             # Security policies & controls
│   ├── pod-security-policies.yaml        # Pod Security Policies (restricted/baseline)
│   └── network-policies.yaml             # Network isolation rules per tenant
│
├── observability/                        # Monitoring & logging stack
│   ├── service-monitors.yaml             # Prometheus ServiceMonitors + Alert rules
│   └── observability-stack.yaml          # AlertManager, configs, RBAC
│
├── helm-values/                          # Helm chart configurations
│   ├── prometheus-values.yaml            # Prometheus stack Helm values
│   └── loki-values.yaml                  # Loki stack Helm values
│
└── gitops/                               # ArgoCD GitOps applications
    ├── app-of-apps.yaml                  # Root ArgoCD app (orchestration)
    └── infrastructure-apps.yaml          # Infrastructure component apps
```

---

## File Descriptions

### Documentation Files

#### `README.md` (Comprehensive Guide)
**Purpose**: Complete technical documentation  
**Audience**: Platform engineers, DevOps teams  
**Contents**:
- Architecture overview with ASCII diagrams
- Core component explanations
- Multi-tenancy strategy details
- Security architecture walkthrough
- Observability stack configuration
- GitOps workflow explanation
- Step-by-step deployment instructions
- Operations & troubleshooting guide
- Cost optimization tips

**When to Use**: Reference for understanding the entire system

---

#### `QUICK_REFERENCE.md` (Cheat Sheet)
**Purpose**: Quick lookup for commands and specifications  
**Audience**: Operators, DevOps engineers  
**Contents**:
- File structure overview
- Key commands (deploy, monitor, access)
- Component specifications table
- Tenant resource quotas
- Network policies summary
- Alert definitions
- Private DNS names
- Troubleshooting quick fixes

**When to Use**: Daily operations, quick lookups

---

#### `DEPLOYMENT_CHECKLIST.md` (Step-by-Step)
**Purpose**: Detailed deployment verification checklist  
**Audience**: Deployment engineers, new operators  
**Contents**:
- 12 deployment phases with checkpoints
- Pre-deployment setup validation
- AWS infrastructure verification
- Kubernetes component checks
- Multi-tenancy setup verification
- Security policy validation
- Observability component verification
- Application deployment verification
- Production hardening steps
- Rollback procedures
- Post-deployment validation script

**When to Use**: During initial deployment, testing new versions

---

#### `ARCHITECTURE.md` (Design & Integration)
**Purpose**: Architecture diagrams and integration points  
**Audience**: Architects, senior engineers  
**Contents**:
- Executive summary
- Data flow diagram (Git → ArgoCD → Cluster)
- Security zones diagram
- Tenant isolation layers (5-layer diagram)
- GitOps workflow integration
- Observability integration
- Multi-tenancy integration
- Component dependencies tree
- Resource consumption estimates
- Scaling considerations
- High availability configuration
- Disaster recovery strategies
- Next steps & resources

**When to Use**: Architecture reviews, onboarding, system design decisions

---

### Kubernetes Manifests - Multi-Tenancy

#### `multi-tenancy/namespaces.yaml`
**Purpose**: Namespace isolation and resource boundaries  
**Resources Created**:
```yaml
Namespaces:
  - tenant-alpha      (production, strict)
  - tenant-beta       (production, less strict)
  - tenant-staging    (shared staging)
  - platform-tools    (infrastructure)
  - observability     (monitoring)

ResourceQuotas:
  - tenant-alpha: CPU 100-200, Mem 200-400GB, Pods 500, LB 5
  - tenant-beta: CPU 80-160, Mem 160-320GB, Pods 300, LB 3
  - tenant-staging: CPU 50-100, Mem 100-200GB, Pods 200, LB 2

LimitRanges (per-pod defaults):
  - CPU: 250m request → 500m limit
  - Memory: 256Mi request → 512Mi limit
  - Per-pod max: 4 CPU, 8GB memory
  - Per-container min: 50m CPU, 64Mi memory

NetworkPolicies (integrated):
  - Default deny ingress
  - Allow from same namespace
  - Allow prometheus scraping
  - Allow DNS
  - Allow controlled egress
```

**When to Apply**: First, before any tenant workloads

---

#### `multi-tenancy/rbac.yaml`
**Purpose**: Role-based access control per tenant  
**Resources Created**:
```yaml
ServiceAccounts:
  - tenant-alpha-admin       (full namespace access)
  - tenant-alpha-developer   (deploy, view, no delete)
  - tenant-beta-admin        (full namespace access)
  - tenant-beta-developer    (deploy, view, no delete)
  - prometheus              (cluster-wide metrics)
  - platform-admin          (cluster administration)

Roles (namespace-scoped):
  - tenant-alpha-admin       (all verbs on all resources)
  - tenant-alpha-developer   (pods, deployments, services, limited)
  - tenant-beta-admin        (all verbs on all resources)
  - tenant-beta-developer    (pods, deployments, services, limited)

ClusterRoles:
  - prometheus-scraper      (get/list/watch nodes, pods, services, metrics)
  - platform-admin          (cluster-wide read)

RoleBindings / ClusterRoleBindings:
  - Connect ServiceAccounts to Roles
  - Define user/group access (integrate with IAM/AD)
```

**When to Apply**: After namespaces, before tenant applications

---

### Kubernetes Manifests - Security

#### `security/pod-security-policies.yaml`
**Purpose**: Pod-level security enforcement  
**Resources Created**:
```yaml
PodSecurityPolicies:
  - restricted-alpha
    • No privilege escalation
    • No privileged containers
    • Must run as non-root (UID > 1000)
    • Drop ALL capabilities
    • SELinux enforcement required
    • Read-only root filesystem policy
    
  - baseline-beta
    • Allows some privileged features
    • Must not run as root
    • Drop NET_RAW capability only
    • More flexible for legacy apps

PodDisruptionBudgets:
  - prometheus-pdb        (minAvailable: 1)
  - grafana-pdb           (minAvailable: 1)
  - alertmanager-pdb      (minAvailable: 1)

SecurityContext ConfigMaps:
  - Example recommended configurations
  - Can be referenced in deployments
```

**When to Apply**: With namespace creation, before workloads

---

#### `security/network-policies.yaml`
**Purpose**: Network-level isolation and traffic control  
**Resources Created**:
```yaml
NetworkPolicies (per tenant):
  - default-deny-all-ingress    (deny all by default)
  - allow-same-namespace         (pods within namespace)
  - allow-nginx-ingress          (ingress controller access)
  - allow-prometheus-metrics     (prometheus scraping)
  - allow-dns-egress             (DNS queries)
  - allow-external-https         (controlled outbound)

Traffic Flow:
  ┌─ Internal pod-to-pod       ✓ Allowed
  ├─ Ingress → Pod             ✓ Allowed
  ├─ Pod → Prometheus          ✓ Allowed
  ├─ Pod → DNS                 ✓ Allowed
  ├─ Pod → External HTTPS      ✓ Allowed
  ├─ Pod → External HTTP       ✗ Blocked
  └─ Across namespaces         ✗ Blocked

Special Cases:
  - kube-system isolation       (system components only)
  - observability communication (all namespaces)
```

**When to Apply**: After namespaces, before tenants (if strict isolation needed)

---

### Kubernetes Manifests - Observability

#### `observability/service-monitors.yaml`
**Purpose**: Configure Prometheus metric scraping & alerts  
**Resources Created**:
```yaml
ServiceMonitors (for each metric source):
  - kube-apiserver          (Kubernetes API metrics)
  - kube-scheduler          (scheduler metrics)
  - kube-controller-manager (controller metrics)
  - kubelet                 (node metrics)
  - tenant-alpha-apps       (app metrics via :8080/metrics)
  - tenant-beta-apps        (app metrics)
  - nginx-ingress           (ingress controller metrics)
  - aws-load-balancer-controller (ALB controller metrics)

PrometheusRules (alert definitions):
  kubernetes.rules:
    - NodeCPUUsageHigh        (alert when > 80%)
    - NodeMemoryUsageHigh     (alert when > 80%)
    - PodCrashLooping         (alert on frequent restarts)
    - DiskSpaceUsageHigh      (alert when > 80%)
    - PersistentVolumeUsageHigh (alert when > 80%)
  
  tenant.rules:
    - TenantResourceQuotaExceeded (alert when > 90%)
    - TenantPodUnreachable    (alert on failed pods)

Scrape Configuration:
  - interval: 30s (default)
  - timeout: 10s (default)
  - scheme: https (for secure endpoints)
  - Custom relabeling (for labels)
```

**When to Apply**: After Prometheus is installed

---

#### `observability/observability-stack.yaml`
**Purpose**: Observability stack configuration and RBAC  
**Resources Created**:
```yaml
Namespace:
  - observability (with labels for monitoring)

ConfigMaps:
  - alertmanager-config
    • Slack webhook URLs
    • Routing rules (critical → #critical-alerts)
    • Tenant-specific routing
    • Receiver configurations (email, PagerDuty, etc.)
  
  - prometheus-additional-scrape-configs
    • CloudWatch exporter config
    • EKS control plane metrics
    • Custom scrape jobs
  
  - grafana-tenant-dashboard.json
    • Multi-tenant overview dashboard
    • Resource usage by tenant
    • Pod count and status metrics

Secrets:
  - observability-external-services
    • Grafana admin password
    • Slack webhook URLs
    • DataDog/New Relic API keys (optional)

RBAC:
  - observability-admin ServiceAccount
  - prometheus-scraper ClusterRole
  - Cluster-wide read permissions
```

**When to Apply**: After observability namespace created

---

### Helm Values Files

#### `helm-values/prometheus-values.yaml`
**Purpose**: Configuration for Prometheus Helm Chart  
**Chart**: `prometheus-community/kube-prometheus-stack`  
**Key Configurations**:
```yaml
PrometheusOperator:
  enabled: true
  manageResources: true

Prometheus:
  replicas: 2 (HA)
  retention: 15 days
  retentionSize: 50GB
  resources:
    requests: cpu 500m, mem 2Gi
    limits: cpu 1000m, mem 4Gi
  storageSpec: 50Gi PVC
  affinity: Pod anti-affinity (spread across nodes)

Grafana:
  enabled: true
  adminPassword: "changeme" (CHANGE IN PRODUCTION!)
  persistence: 10Gi
  datasources:
    - Prometheus (primary)
    - Loki (for logs)
  dashboards:
    - Kubernetes Cluster
    - Kubernetes Pods
  
AlertManager:
  enabled: true
  replicas: 3
  config: (routes alerts to Slack/email/etc)

Node Components:
  - prometheus-node-exporter (collect node metrics)
  - kubeStateMetrics (K8s object metrics)
  - kubelet monitoring (enabled)

ServiceMonitor:
  enabled: true
  interval: 30s
```

**When to Use**: Deploy via Helm or ArgoCD

---

#### `helm-values/loki-values.yaml`
**Purpose**: Configuration for Loki Helm Chart  
**Chart**: `grafana/loki-stack`  
**Key Configurations**:
```yaml
Loki:
  enabled: true
  replicas: 3 (HA)
  auth_enabled: false (set true for multi-tenancy)
  
  ingester:
    max_chunk_age: 2h
    chunk_idle_period: 3m
  
  limits_config:
    max_streams_per_user: 10000
    retention_period: 30d
  
  persistence: 50Gi
  resources:
    requests: cpu 100m, mem 128Mi
    limits: cpu 500m, mem 512Mi

Promtail:
  enabled: true
  daemonset: true (runs on every node)
  config:
    clients:
      - url: http://loki:3100/loki/api/v1/push
    scrape_configs:
      - kubernetes_sd: pod
      - relabel: pod_name, namespace, app, version
  resources:
    requests: cpu 50m, mem 64Mi
    limits: cpu 200m, mem 256Mi

Grafana-Loki:
  enabled: true (adds Loki datasource)
```

**When to Use**: Deploy via Helm or ArgoCD

---

### ArgoCD Applications

#### `gitops/infrastructure-apps.yaml`
**Purpose**: Define ArgoCD applications for infrastructure  
**Applications Defined**:
```yaml
Application: multi-tenancy
  - Source: infrastructure/multi-tenancy/
  - Sync: Automated (prune: true, selfHeal: true)
  - Retry: 5 times with backoff

Application: security-policies
  - Source: infrastructure/security/
  - Depends on: multi-tenancy
  - Sync: Automated

Application: prometheus-stack
  - Chart: prometheus-community/kube-prometheus-stack v54.0.0
  - Namespace: observability
  - Helm values: custom (retention, replicas, etc)
  - Sync: Automated

Application: loki-stack
  - Chart: grafana/loki-stack v2.9.0
  - Namespace: observability
  - Helm values: custom (retention, replicas, etc)
  - Sync: Automated

Application: observability-setup
  - Source: infrastructure/observability/
  - Creates: ServiceMonitors, PrometheusRules, ConfigMaps
  - Depends on: prometheus-stack, loki-stack
  - Sync: Automated

Application: tenant-alpha
  - Source: gitops/argocd/applications/tenant-alpha/
  - Namespace: tenant-alpha
  - Destination: https://kubernetes.default.svc
  - Sync: Automated

Application: tenant-beta
  - Source: gitops/argocd/applications/tenant-beta/
  - Namespace: tenant-beta
  - Sync: Automated
```

**When to Apply**: After ArgoCD is installed

---

#### `gitops/app-of-apps.yaml`
**Purpose**: Root ArgoCD application using App-of-Apps pattern  
**Resources Defined**:
```yaml
Application: app-of-apps-root
  ├─ Watches: infrastructure/gitops/
  ├─ Creates: infrastructure-apps.yaml
  ├─ Sync: Automated, prune enabled
  └─ Recursively manages all child apps

AppProjects:
  project: production
  ├─ sourceRepos: github.com, prometheus-community, grafana, argoproj
  ├─ destinations: all namespaces in cluster
  ├─ resources: all kinds allowed
  └─ restrictions: no ResourceQuota/LimitRange changes

  project: staging
  ├─ sourceRepos: github.com, prometheus-community, grafana
  ├─ destinations: tenant-staging, observability
  └─ restrictions: limited to staging

ApplicationSet: tenant-deployments
  ├─ Dynamically generates Applications:
  │  - tenant-alpha (production project)
  │  - tenant-beta (production project)
  │  - tenant-staging (staging project)
  ├─ Template: gitops/argocd/applications/tenant-{}/
  └─ Sync: Automated for each

Application: argo-rollouts
  ├─ Chart: argoproj/argo-rollouts (progressive delivery)
  ├─ Namespace: argo-rollouts
  ├─ Optional: for canary/blue-green deployments
  └─ Sync: Automated
```

**When to Apply**: Initial setup, app-of-apps bootstrap

---

## Complete Deployment Flow

```
1. Apply multi-tenancy/namespaces.yaml
   ├─ Creates namespaces
   ├─ Creates resource quotas
   └─ Creates limit ranges
   
2. Apply multi-tenancy/rbac.yaml
   ├─ Creates service accounts
   └─ Creates roles & bindings
   
3. Apply security/pod-security-policies.yaml
   ├─ Creates PSPs
   └─ Creates policy bindings
   
4. Apply security/network-policies.yaml
   └─ Creates network policies
   
5. Helm install prometheus-stack
   └─ Uses helm-values/prometheus-values.yaml
   
6. Helm install loki-stack
   └─ Uses helm-values/loki-values.yaml
   
7. Apply observability/observability-stack.yaml
   ├─ Creates ConfigMaps
   ├─ Creates Secrets
   └─ Creates RBAC
   
8. Apply observability/service-monitors.yaml
   ├─ Creates ServiceMonitors
   └─ Creates PrometheusRules
   
9. Apply gitops/app-of-apps.yaml
   └─ Bootstraps all of the above via ArgoCD
   
10. Apply gitops/infrastructure-apps.yaml
    └─ Creates specific infrastructure applications
    
11. Tenant applications auto-deploy via ApplicationSet
    ├─ tenant-alpha deployment
    ├─ tenant-beta deployment
    └─ tenant-staging deployment
```

---

## Usage Patterns

### Deploying Everything at Once (via ArgoCD)
```bash
kubectl apply -f infrastructure/gitops/app-of-apps.yaml
# ArgoCD automatically deploys everything in correct order
```

### Deploying Manually (for testing/troubleshooting)
```bash
# 1. Multi-tenancy foundation
kubectl apply -f infrastructure/multi-tenancy/

# 2. Security policies
kubectl apply -f infrastructure/security/

# 3. Observability (Helm + manifests)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  -f infrastructure/helm-values/prometheus-values.yaml \
  -n observability --create-namespace
kubectl apply -f infrastructure/observability/

# 4. Tenant applications
kubectl apply -f gitops/argocd/applications/
```

### Updating Configuration
```bash
# 1. Edit file
# 2. Commit to Git (if using ArgoCD)
# 3. ArgoCD auto-detects and syncs

# Manual update:
kubectl apply -f <updated-file>
```

### Removing All Infrastructure
```bash
# If using ArgoCD:
argocd app delete app-of-apps-root

# Or manually delete in reverse order:
kubectl delete -f infrastructure/gitops/app-of-apps.yaml
helm uninstall prometheus -n observability
helm uninstall loki -n observability
kubectl delete -f infrastructure/security/
kubectl delete -f infrastructure/multi-tenancy/
```

---

## File Sizes & Resource Impact

```
Multi-Tenancy Files:
  - namespaces.yaml: ~25KB (creates 5 namespaces + quotas)
  - rbac.yaml: ~20KB (creates 8+ roles/bindings)

Security Files:
  - pod-security-policies.yaml: ~8KB (2 PSPs + PDBs)
  - network-policies.yaml: ~15KB (10+ network policies)

Observability Files:
  - service-monitors.yaml: ~20KB (8+ ServiceMonitors + PrometheusRules)
  - observability-stack.yaml: ~12KB (ConfigMaps, Secrets, RBAC)

Helm Values:
  - prometheus-values.yaml: ~8KB
  - loki-values.yaml: ~6KB

GitOps Files:
  - app-of-apps.yaml: ~15KB (1 root app + projects + appset)
  - infrastructure-apps.yaml: ~12KB (6 applications)

Total: ~161KB of configuration
```

---

## Maintenance & Versioning

### Version Tracking
Each file includes version information in comments/metadata

### Update Frequency
- **Helm Charts**: Check monthly for updates
- **Kubernetes versions**: Align with EKS version (usually quarterly)
- **Configurations**: Update as needed based on requirements

### Backup Strategy
```bash
# Store entire infrastructure/ directory in Git
git add infrastructure/
git commit -m "Infrastructure configuration"

# Never store secrets in Git
# Use AWS Secrets Manager / External Secrets Operator
```

---

## Related CDK Files

These infrastructure files complement the CDK code:

```
lib/
├── constructs/
│   ├── eks-cluster-construct.ts    # EKS cluster setup
│   ├── argocd-construct.ts         # ArgoCD helm installation
│   ├── alb-controller-construct.ts # AWS load balancer setup
│   └── s3-storage-construct.ts     # S3 bucket setup
└── stacks/
    ├── network-stack.ts            # VPC, subnets, NAT
    ├── eks-stack.ts                # EKS cluster stack
    ├── storage-stack.ts            # S3 buckets
    └── gitops-stack.ts             # ArgoCD deployment
```

Infrastructure files extend these CDK stacks with:
- Multi-tenant namespace isolation
- Security policies and network controls
- Observability platform
- GitOps application orchestration

---

**Infrastructure Version**: 2.0  
**Last Updated**: February 2026  
**Status**: Production Ready  
**Maintainer**: Platform Engineering Team
