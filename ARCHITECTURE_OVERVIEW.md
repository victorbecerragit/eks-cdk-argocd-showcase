# Project Architecture & Organization

## System Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AWS ACCOUNT (AWS CDK)                            │
│                              /iac directory                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐      ┌────────────────┐      ┌─────────────────┐  │
│  │   Network      │      │   EKS Cluster  │      │  Storage (S3)   │  │
│  │  (NAT, VPC,    │─────▶│ Control Plane  │◀─────│ Buckets         │  │
│  │   Subnets,     │      │  + Node Groups │      │ Encryption      │  │
│  │   Endpoints)   │      │                │      │ Versioning      │  │
│  └────────────────┘      └────────┬───────┘      └─────────────────┘  │
│                                   │                                      │
│                         (CloudFormation Stacks)                          │
└───────────────────────────────────┼──────────────────────────────────────┘
                                    │
                                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │          EKS CLUSTER (Kubernetes)                        │
        │          /platform directory                            │
        ├──────────────────────────────────────────────────────────┤
        │                                                          │
        │  ┌────────────────────────────────────────────────────┐ │
        │  │            SECURITY LAYER                          │ │
        │  │ ┌──────────────┐  ┌──────────────────────────────┐ │ │
        │  │ │ Pod Security │  │ Network Policies             │ │ │
        │  │ │ Policies     │  │ (default-deny)              │ │ │
        │  │ └──────────────┘  └──────────────────────────────┘ │ │
        │  └────────────────────────────────────────────────────┘ │
        │                                                          │
        │  ┌────────────────────────────────────────────────────┐ │
        │  │        MULTI-TENANCY ISOLATION                     │ │
        │  │ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │ │
        │  │ │Namespace │ │RBAC      │ │ Resource Quotas      │ │ │
        │  │ │ tenant-α │ │ Roles    │ │ Limit Ranges         │ │ │
        │  │ │ tenant-β │ │ Users    │ │ (CPU, Memory, Pods)  │ │ │
        │  │ │ platform │ │ RBAC     │ │                      │ │ │
        │  │ │ system   │ │ Bindings │ │                      │ │ │
        │  │ └──────────┘ └──────────┘ └──────────────────────┘ │ │
        │  └────────────────────────────────────────────────────┘ │
        │                                                          │
        │  ┌────────────────────────────────────────────────────┐ │
        │  │       OBSERVABILITY STACK                          │ │
        │  │ ┌──────────────┐  ┌──────────────────────────────┐ │ │
        │  │ │Prometheus    │  │Loki + Promtail              │ │ │
        │  │ │ Metrics      │  │ Logs & Log Shipping         │ │ │
        │  │ │ Scraping     │  │                             │ │ │
        │  │ │ Alerting     │  │AlertManager                 │ │ │
        │  │ │              │  │ Alert Routing               │ │ │
        │  │ │Grafana       │  │ Notification Channel        │ │ │
        │  │ │ Dashboards   │  │                             │ │ │
        │  │ └──────────────┘  └──────────────────────────────┘ │ │
        │  └────────────────────────────────────────────────────┘ │
        │                                                          │
        │  ┌────────────────────────────────────────────────────┐ │
        │  │     GITOPS ORCHESTRATION (ArgoCD)                  │ │
        │  │   Watches Git repo for changes                     │ │
        │  │   Auto-syncs cluster state                         │ │
        │  │   Manages all platform components                  │ │
        │  └────────────────────────────────────────────────────┘ │
        │                                                          │
        │  ┌────────────────────────────────────────────────────┐ │
        │  │       APPLICATION WORKLOADS                        │ │
        │  │ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │ │
        │  │ │tenant-α  │ │tenant-β  │ │ Custom Apps         │ │ │
        │  │ │pods      │ │pods      │ │ (Helm Charts)       │ │ │
        │  │ │services  │ │services  │ │                     │ │ │
        │  │ │ingress   │ │ingress   │ │                     │ │ │
        │  │ └──────────┘ └──────────┘ └──────────────────────┘ │ │
        │  └────────────────────────────────────────────────────┘ │
        │                                                          │
        └──────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │              GIT REPOSITORY                              │
        │              /platform (all manifests)                   │
        │                                                          │
        │  ┌────────────────────────────────────────────────────┐ │
        │  │ platform/                                         │ │
        │  │ ├─ tenants/           (namespace isolation)       │ │
        │  │ ├─ security/          (pod policies, net-pol)    │ │
        │  │ ├─ observability/     (prometheus, loki)         │ │
        │  │ └─ gitops/            (argocd apps)              │ │
        │  └────────────────────────────────────────────────────┘ │
        │                                                          │
        │  ArgoCD watches this directory and continuously         │
        │  syncs its contents to the cluster                      │
        │                                                          │
        └──────────────────────────────────────────────────────────┘
```

## Component Interactions

```
¹ DEPLOYMENT SEQUENCE
═══════════════════════════════════════════════════════════════════════

Step 1: AWS Infrastructure (One-time)
────────────────────────────────────────────────────────────────────────
  Developer
      ↓
  npm run build          # Compile CDK code
      ↓
  npx cdk deploy         # Synthesize & deploy CloudFormation templates
      ↓
  AWS CloudFormation     # Creates VPC, EKS, S3, IAM roles
      ↓
  ✅ EKS Cluster Ready


Step 2: Bootstrap Platform (One-time)
────────────────────────────────────────────────────────────────────────
  kubectl apply -f /platform/tenants/
      ↓
  kubectl apply -f /platform/security/
      ↓
  kubectl apply -f /platform/observability/helm-values/
      ↓
  kubectl apply -f /platform/gitops/app-of-apps.yaml
      ↓
  ✅ ArgoCD Running & Watching Git


Step 3: Continuous Deployment (Ongoing)
────────────────────────────────────────────────────────────────────────
  Developer pushes to Git
      ↓
  ArgoCD (in cluster) polls Git every 3 minutes
      ↓
  Change detected → Automatic sync
      ↓
  kubectl apply (automatic)
      ↓
  ✅ Changes deployed to cluster
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING DATA FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Application Workloads
    ↓ (Expose metrics on :8080/metrics)
    ↓
Prometheus ServiceMonitor
    ↓ (Scrapes every 30s)
    ↓
Prometheus Pod (prometheus ns)
    ↓ (Time-series database)
    ├─→ Grafana (Visualize dashboards)
    ├─→ AlertManager (Evaluate alert rules)
    └─→ Long-term storage (50GB PVC)


┌─────────────────────────────────────────────────────────────────┐
│                     LOGGING DATA FLOW                           │
└─────────────────────────────────────────────────────────────────┘

Pod Logs (stdout/stderr)
    ↓
Kubelet (reads pod logs)
    ↓
Promtail DaemonSet
    ↓ (Ships logs via API)
    ↓
Loki Distributor
    ↓
Loki Ingester
    ↓
Long-term Storage (50GB PVC)
    ↓
Grafana Loki Plugin (Search & visualize)
```

## GitOps Orchestration

```
┌─────────────────────────────────────────────────────────────────┐
│               ARGOCD APP-OF-APPS PATTERN                        │
└─────────────────────────────────────────────────────────────────┘

Git Repository
└── platform/gitops/
    └── app-of-apps.yaml
        ↓
        ArgoCD Application (root)
        ├─→ infrastructure-apps.yaml
        │   ├─→ ArgoCD Application: multi-tenancy
        │   ├─→ ArgoCD Application: security-policies
        │   ├─→ ArgoCD Application: prometheus-stack
        │   ├─→ ArgoCD Application: loki-stack
        │   ├─→ ArgoCD Application: observability-setup
        │   └─→ ArgoCD Application: tenant-apps
        │       ├─→ demo-app-tenantα (Helm)
        │       └─→ demo-app-tenantβ (Helm)
        │
        └─→ ApplicationSet (dynamic apps)
            └─→ Generates apps for each tenant
                (alpha, beta, staging)

Each Application:
  ├── Source: Git repo path (platform/...)
  ├── Destination: Cluster namespace
  ├── Sync Policy: Automated + prune + self-heal
  └── Health: Monitored by ArgoCD




┌─────────────────────────────────────────────────────────────────┐
│          MULTI-TENANCY ISOLATION MODEL                          │
└─────────────────────────────────────────────────────────────────┘

Namespace Isolation (Layer 1)
  ├── tenant-alpha (namespaced resources only)
  ├── tenant-beta (namespaced resources only)
  ├── platform (platform components)
  └── observability (monitoring stack)


RBAC Roles (Layer 2)
  ├── Admin Role (full cluster access)
  ├── Developer Role (namespace-scoped CRUDs)
  └── Viewer Role (read-only)


Resource Quotas (Layer 3)
  ├── tenant-alpha:
  │   ├── CPU: 4 cores
  │   ├── Memory: 8Gi
  │   └── Pods: 50
  │
  ├── tenant-beta:
  │   ├── CPU: 4 cores
  │   ├── Memory: 8Gi
  │   └── Pods: 50
  │
  └── platform:
      ├── CPU: 2 cores
      ├── Memory: 4Gi
      └── Pods: 30


Network Policies (Layer 4)
  ├── Ingress: Only from same namespace or platform ns
  └── Egress: To DNS, external APIs, same namespace


Pod Security Policies (Layer 5)
  ├── RESTRICTED: prod tenants
  │   ├── No privileged containers
  │   ├── No root user
  │   ├── Read-only filesystem
  │   └── Read capabilities drop
  │
  └── BASELINE: non-prod, observability
      └── Lesser restrictions
```

## Directory Purpose

```
┌─────────────────────────────────────────────────────────────────┐
│                  WHAT GOES WHERE?                               │
└─────────────────────────────────────────────────────────────────┘

NEW AWS INFRASTRUCTURE (EKS, VPC, S3, etc.)
  └─→ /iac/lib/constructs/ or /iac/lib/stacks/

NEW KUBERNETES MANIFEST (Deployment, Service, etc.)
  └─→ /platform/
      ├─ tenants/ (for tenant-specific resources)
      ├─ security/ (for security policies)
      ├─ observability/ (for monitoring)
      └─ gitops/ (for ArgoCD applications)

NEW HELM CHART
  └─→ /helm-charts/your-chart-name/

NEW DOCUMENTATION
  └─→ /docs/

NEW HELPER SCRIPT
  └─→ /scripts/

NEW TEST
  └─→ /iac/test/ (if CDK)
      or
      /platform/ with descriptive name (if K8s)
```

---

**Created**: February 2026  
**Version**: 1.0  
**Status**: Architecture Reference Guide
