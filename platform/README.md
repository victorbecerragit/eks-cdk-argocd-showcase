# Kubernetes Platform Configuration

This directory contains all in-cluster Kubernetes configurations and platform setup manifests.

## Quick Overview

- **Technology**: Kubernetes YAML manifests + Helm
- **Purpose**: Configure cluster workloads and platform features
- **Deployment**: kubectl apply or ArgoCD (recommended)

## Directory Structure

```
platform/
├── tenants/                 # Multi-tenant isolation
│   ├── namespaces.yaml      # Namespace definitions
│   └── rbac.yaml            # Role-based access control
├── security/                # Security policies
│   ├── pod-security-policies.yaml
│   └── network-policies.yaml
├── observability/           # Monitoring stack
│   ├── prometheus/
│   ├── loki/
│   └── *.yaml               # Configuration files
└── gitops/                  # ArgoCD orchestration
    ├── app-of-apps.yaml     # Root ArgoCD application
    ├── infrastructure-apps.yaml
    └── applications/        # Individual app definitions
```

## Quick Start

### Initial Platform Setup (One-time)

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

Once ArgoCD is running, all changes are automatically synced:

```bash
# Monitor sync status
kubectl get applications -n argocd

# View ArgoCD UI (port-forward)
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

## Components

### Tenants
- Service accounts per tenant
- Resource quotas (CPU, memory, pods)
- Namespace isolation

### Security
- Pod Security Policies (non-root, read-only filesystems)
- Network Policies (default-deny, cross-tenant isolation)
- RBAC enforcing least privilege

### Observability
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Dashboards and visualization
- **Loki**: Log aggregation and searching
- **AlertManager**: Alert routing and notifications

### GitOps
- **ArgoCD**: Continuous deployment from Git
- **App of Apps**: Hierarchical application structure
- **ApplicationSet**: Dynamic tenant deployment

## Deployment Order

1. **Tenants** (namespaces + RBAC)
2. **Security** (policies + network isolation)
3. **Observability** (monitoring stack)
4. **GitOps** (ArgoCD takes over)

## Common Tasks

### Add a New Tenant

1. Create tenant namespace in `tenants/namespaces.yaml`
2. Create tenant RBAC in `tenants/rbac.yaml`
3. Add tenant workload manifest in `gitops/applications/`
4. Commit and push (ArgoCD auto-syncs)

### Deploy an Application

1. Create Helm chart in `/helm-charts/`
2. Create ArgoCD application in `gitops/applications/`
3. Reference in `gitops/app-of-apps.yaml`
4. Commit and push (ArgoCD auto-deploys)

### Update Monitoring

1. Modify `observability/prometheus/values.yaml`
2. Add ServiceMonitors in `observability/service-monitors.yaml`
3. Define alert rules in `observability/alerting-rules.yaml`
4. Commit and push (ArgoCD updates stack)

## See Also

- [Platform Guide](../docs/PLATFORM.md)
- [Architecture Overview](../docs/ARCHITECTURE_OVERVIEW.md)
- [Multi-Tenancy Guide](../docs/MULTI_TENANCY.md)
- [Security Guide](../docs/SECURITY.md)
- [Observability Guide](../docs/OBSERVABILITY.md)
- [Deployment Checklist](../docs/DEPLOYMENT_CHECKLIST.md)

---

**ArgoCD is the recommended way to manage this directory.** Changes committed to Git are automatically applied to the cluster.
