# Multi-Tenant EKS Architecture with ArgoCD GitOps and Prometheus Observability

This document describes the comprehensive multi-tenant Kubernetes architecture built on AWS EKS, leveraging ArgoCD for GitOps, and Prometheus for observability.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Multi-Tenancy Strategy](#multi-tenancy-strategy)
4. [Security Architecture](#security-architecture)
5. [Observability Stack](#observability-stack)
6. [GitOps Workflow](#gitops-workflow)
7. [Deployment Guide](#deployment-guide)
8. [Operations Guide](#operations-guide)

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS EKS Cluster                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Control Plane (Managed)                 │  │
│  │    (API Server, etcd, Scheduler, Controllers)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           △                                │
│                           │                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  Data Plane (Nodes)                 │  │
│  │  ┌────────────────┐  ┌────────────────────────────┐ │  │
│  │  │  System Zone   │  │    Application Zone        │ │  │
│  │  ├────────────────┤  ├────────────────────────────┤ │  │
│  │  │ kube-system    │  │ Tenant Namespaces         │ │  │
│  │  │ kube-node-     │  │ ├─ tenant-alpha           │ │  │
│  │  │   lease        │  │ ├─ tenant-beta            │ │  │
│  │  │ kube-public    │  │ ├─ tenant-staging         │ │  │
│  │  │ argocd         │  │ └─ ...                     │ │  │
│  │  │                │  │                            │ │  │
│  │  │ Observability  │  │ Isolated with:             │ │  │
│  │  │ ├─ prometheus  │  │ ├─ NetworkPolicies        │ │  │
│  │  │ ├─ grafana     │  │ ├─ ResourceQuota          │ │  │
│  │  │ ├─ loki        │  │ ├─ RBAC                   │ │  │
│  │  │ └─ alertmanager│  │ └─ PodSecurityPolicies   │ │  │
│  │  │                │  │                            │ │  │
│  │  │ Platform Tools │  │ Per-Tenant:                │ │  │
│  │  │ ├─ ALB        │  │ ├─ ServiceAccounts        │ │  │
│  │  │ │  Controller  │  │ ├─ Roles & RoleBindings   │ │  │
│  │  │ └─ Others     │  │ └─ Limited permissions     │ │  │
│  │  └────────────────┘  └────────────────────────────┘ │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Network: VPC with subnets per AZ, security groups,       │
│  NAT Gateways, VPC Flow Logs                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            △
                            │
                    Git Repository
                (Infrastructure as Code)
                    ┌──────────┐
                    │  GitHub  │
                    └─────┬────┘
                          │
                    ┌─────▼────────────────┐
                    │      ArgoCD          │
                    │  (GitOps Controller) │
                    └──────────────────────┘
```

### Directory Structure

```
infrastructure/
├── multi-tenancy/           # Tenant isolation configs
│   ├── namespaces.yaml     # Namespace definitions + quotas
│   └── rbac.yaml           # Role-based access control
├── security/               # Security policies
│   ├── pod-security-policies.yaml
│   └── network-policies.yaml
├── observability/          # Monitoring stack
│   ├── service-monitors.yaml
│   └── observability-stack.yaml
├── helm-values/           # Helm chart configurations
│   ├── prometheus-values.yaml
│   └── loki-values.yaml
└── gitops/                # ArgoCD applications
    ├── app-of-apps.yaml
    └── infrastructure-apps.yaml
```

---

## Core Components

### 1. **Kubernetes Cluster (EKS)**
- **Region**: Multi-AZ deployment for HA
- **Version**: 1.27+ (Kubernetes)
- **Node Groups**: 
  - System (platform tools): 3 nodes, m5.large
  - Application (tenants): 3-10 nodes, auto-scaling
- **Networking**: VPC with private/public subnets, NAT, VPC Flow Logs

### 2. **ArgoCD - GitOps Engine**
- **Namespace**: `argocd`
- **Function**: Continuously syncs Git state to cluster
- **Access**: ALB-based Ingress, RBAC controlled
- **Application Pattern**: App-of-Apps for hierarchical management

### 3. **Prometheus - Metrics**
- **Namespace**: `observability`
- **Components**:
  - Prometheus Operator
  - Prometheus Stateful Set (HA, 2 replicas)
  - AlertManager for alert routing
  - Node Exporter & kube-state-metrics
- **Retention**: 15 days, 50GB storage
- **ServiceMonitors**: Auto-discover and scrape metrics

### 4. **Grafana - Visualization**
- **Namespace**: `observability`
- **Dashboards**: Pre-configured for multi-tenant view
- **Data Sources**: Prometheus, Loki
- **Persistence**: 10GB storage

### 5. **Loki - Log Aggregation**
- **Namespace**: `observability`
- **Components**: Loki, Promtail (DaemonSet)
- **Retention**: Configurable per tenant
- **Querying**: LogQL language, Grafana integration

### 6. **AWS Load Balancer Controller**
- **Namespace**: `kube-system`
- **Function**: Provisions AWS ALBs/NLBs for Ingress
- **IAM**: Attached to worker node roles

---

## Multi-Tenancy Strategy

### Namespace Isolation

Each tenant gets a dedicated namespace with strict boundaries:

```yaml
Tenant Resources:
├── tenant-alpha
│   ├── Pods, Deployments, Services
│   ├── ConfigMaps, Secrets (encrypted)
│   ├── PersistentVolumes (isolated)
│   └── Ingress (ALB per tenant)
├── tenant-beta
│   └── (Similar structure)
└── tenant-staging
    └── (Shared staging environment)
```

### Resource Quotas

Hard limits prevent resource starvation:

```
tenant-alpha:
  CPU: 100 cores (request), 200 cores (limit)
  Memory: 200GB (request), 400GB (limit)
  Pods: 500
  Services (LB): 5
  PVCs: 20

tenant-beta:
  CPU: 80 cores (request), 160 cores (limit)
  Memory: 160GB (request), 320GB (limit)
  Pods: 300
  Services (LB): 3
```

### RBAC (Role-Based Access Control)

Three-tier permission model:

| Role | Capabilities | Restrictions |
|------|--------------|--------------|
| **Admin** | Full control within namespace | Cannot delete namespace, modify quotas |
| **Developer** | Deploy, scale, update workloads | Cannot delete, no secrets access |
| **Viewer** | Read-only access | No modifications |

Examples in `infrastructure/multi-tenancy/rbac.yaml`

### Network Isolation

eBPF-based network policies enforce security:

```
tenant-alpha ←→ tenant-beta:     ✗ DENIED
tenant-alpha ←→ (internal pods): ✓ ALLOWED
tenant-alpha → DNS (kube-system): ✓ ALLOWED
tenant-alpha → External HTTPS:    ✓ ALLOWED
Prometheus → tenant-* (metrics):  ✓ ALLOWED
```

---

## Security Architecture

### Pod Security Policies

Two policy levels applied:

1. **RESTRICTED** (tenant-alpha, production)
   - No privilege escalation
   - No privileged containers
   - Must run as non-root
   - Drop ALL capabilities
   - SELinux enforcement

2. **BASELINE** (tenant-beta, less restrictive)
   - Allows some flexibility
   - Still enforces non-root
   - Drops NET_RAW capability

### Network Policies

Default-deny ingress, explicit allow-list:

```
┌──────────────┐
│ tenant-alpha │
└────────┬─────┘
         │
         ├─→ Allow: Same namespace pods
         ├─→ Allow: Ingress controller (HTTP)
         ├─→ Allow: Prometheus (metrics scraping)
         ├─→ Allow: DNS (kube-system)
         └─→ Deny: All other traffic
```

### Secrets Management

- **Kubernetes Secrets**: Encrypted at rest (AWS KMS)
- **Sensitive Data**: Use External Secrets Operator (ESO) for AWS Secrets Manager
- **Access Control**: RBAC limits secret access

### Image Registry Security

- Use AWS ECR with:
  - Image scanning
  - Lifecycle policies
  - Access control via IAM
  - Private registry (no public access)

---

## Observability Stack

### Metrics Collection

**Prometheus scrapes metrics from:**

```
Services monitored:
├── Kubernetes API Server
├── Kubelet (node exports)
├── Controller Manager
├── Scheduler
├── kube-state-metrics (K8s objects)
├── Node Exporter (node resources)
├── Tenant workloads (ServiceMonitor)
├── AWS Load Balancer Controller
└── Ingress Nginx Controller

Metrics examples:
├── container_cpu_usage_seconds_total
├── container_memory_usage_bytes
├── kube_pod_status_phase
├── kube_node_status_allocatable
├── http_requests_total
└── ...
```

### Log Aggregation

**Loki collects logs via Promtail:**

```
Node (DaemonSet) → /var/log/containers/*
                → Promtail
                → Loki (log storage)
                → Grafana (visualization)
```

**Log labels:**
```
- namespace
- pod_name
- container
- app
- version
```

### Alert Rules

Pre-configured alerts in `infrastructure/observability/service-monitors.yaml`:

```yaml
Alert Examples:
├── NodeCPUUsageHigh (> 80%)
├── NodeMemoryUsageHigh (> 80%)
├── PodCrashLooping (> 0.1 restarts/min)
├── DiskSpaceUsageHigh (> 80%)
├── PersistentVolumeUsageHigh (> 80%)
├── TenantResourceQuotaExceeded (> 90%)
└── TenantPodUnreachable (Unknown/Failed state)
```

**Alert Routing (AlertManager):**
```
Critical alerts → #critical-alerts Slack
Warnings        → #warnings Slack
Tenant-alpha    → #tenant-alpha-alerts Slack
Tenant-beta     → #tenant-beta-alerts Slack
```

### Dashboards

Pre-built Grafana dashboards:

1. **Multi-Tenant Overview**
   - Resource usage by tenant
   - Pod counts, memory, CPU
   - ResourceQuota status

2. **Kubernetes Cluster**
   - Node status and capacity
   - Pod distribution
   - Network metrics

3. **Tenant Workloads**
   - Application metrics
   - Error rates, latency
   - Request volumes

---

## GitOps Workflow

### App-of-Apps Pattern

Hierarchical application management:

```
app-of-apps (root)
├── infrastructure-apps (controls + deploys)
│   ├── multi-tenancy (namespaces, RBAC)
│   ├── security-policies (network, PSP)
│   ├── prometheus-stack (Helm)
│   ├── loki-stack (Helm)
│   └── observability-setup (ServiceMonitors)
│
├── tenant-deployments (ApplicationSet, dynamic)
│   ├── tenant-alpha (prod)
│   ├── tenant-beta (prod)
│   └── tenant-staging (canary)
│
└── argo-rollouts (progressive delivery)
```

### Sync Strategy

**Automated Sync:**
```yaml
syncPolicy:
  automated:
    prune: true        # Delete resources removed from Git
    selfHeal: true     # Auto-sync if drift detected
  syncOptions:
    - CreateNamespace=true
  retry:
    limit: 5           # Retry failed syncs
    backoff:
      duration: 5s
      maxDuration: 3m
```

### Change Management

1. **Developer**: Creates PR with infrastructure/app changes
2. **Review**: Code review in GitHub
3. **Test**: Changes tested in staging environment
4. **Merge**: Approved PR merged to main branch
5. **Sync**: ArgoCD detects change, applies to production
6. **Observe**: Prometheus/Grafana track deployment metrics

---

## Deployment Guide

### Prerequisites

```bash
# AWS credentials configured
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# CDK toolkit bootstrapped
npx cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION}
```

### Step 1: Deploy Infrastructure (CDK)

```bash
# Synthesize CloudFormation templates
npx cdk synth -c environment=prod

# Deploy stacks (in order)
npx cdk deploy EksShowcase-prod-Network --require-approval never
npx cdk deploy EksShowcase-prod-EKS --require-approval never
npx cdk deploy EksShowcase-prod-Storage --require-approval never
npx cdk deploy EksShowcase-prod-GitOps --require-approval never
```

**Outputs to save:**
- Cluster name: `EksShowcase-prod-EKS-ClusterName...`
- ArgoCD ALB endpoint: `EksShowcase-prod-GitOps-ArgoCDEndpoint...`

### Step 2: Configure kubeconfig

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --name $(aws cloudformation describe-stacks \
    --stack-name EksShowcase-prod-EKS \
    --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
    --output text) \
  --region us-east-1

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### Step 3: Deploy Multi-Tenancy Foundation

```bash
# Apply namespace and RBAC
kubectl apply -f infrastructure/multi-tenancy/namespaces.yaml
kubectl apply -f infrastructure/multi-tenancy/rbac.yaml

# Verify
kubectl get namespaces -L tenant
kubectl get role -A
```

### Step 4: Deploy Security Policies

```bash
# Apply Pod Security Policies
kubectl apply -f infrastructure/security/pod-security-policies.yaml

# Apply Network Policies
kubectl apply -f infrastructure/security/network-policies.yaml

# Verify
kubectl get psp
kubectl get networkpolicies -A
```

### Step 5: Deploy Observability Stack (via Helm + ArgoCD)

**Option A: Using Helm directly**

```bash
# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus Stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  -f infrastructure/helm-values/prometheus-values.yaml \
  --namespace observability \
  --create-namespace

# Install Loki Stack
helm install loki grafana/loki-stack \
  -f infrastructure/helm-values/loki-values.yaml \
  --namespace observability

# Verify
kubectl get pods -n observability
kubectl get pvc -n observability
```

**Option B: Using ArgoCD (Recommended)**

```bash
# Update Git repository URL in infrastructure/gitops/infrastructure-apps.yaml
sed -i 's|https://github.com/your-org/|https://github.com/YOUR_ORG/|g' \
  infrastructure/gitops/infrastructure-apps.yaml

# Apply ArgoCD applications
kubectl apply -f infrastructure/gitops/app-of-apps.yaml

# Monitor sync progress
argocd app wait app-of-apps-root
```

### Step 6: Deploy Sample Tenant Applications

```bash
# Create Ingress namespaces if needed
kubectl label namespace ingress-nginx name=ingress-nginx

# Deploy tenant demo applications via ArgoCD
kubectl apply -f infrastructure/gitops/infrastructure-apps.yaml

# Verify tenants
kubectl get namespaces -L tenant
kubectl get pods -n tenant-alpha
kubectl get pods -n tenant-beta
```

### Step 7: Access Grafana & Prometheus

```bash
# Port forward (dev/test)
kubectl port-forward -n observability svc/prometheus-grafana 3000:80 &
kubectl port-forward -n observability svc/prometheus-operated 9090:9090 &

# Access
# Grafana: http://localhost:3000 (admin/changeme)
# Prometheus: http://localhost:9090

# Production: Use ALB Ingress
kubectl get ingress -n observability
```

---

## Operations Guide

### Monitoring Tenant Health

```bash
# Check tenant resource usage
kubectl top nodes -l workload=application
kubectl top pods -n tenant-alpha
kubectl top pods -n tenant-beta

# View resource quotas
kubectl describe resourcequota -A

# Check pod events
kubectl describe pod -n tenant-alpha <pod-name>
```

### Scaling Operations

**Horizontal Scaling:**

```bash
# Scale tenant deployment
kubectl scale deployment demo-app-alpha -n tenant-alpha --replicas=5

# HPA will auto-scale based on metrics
kubectl get hpa -n tenant-alpha
```

**Vertical Scaling:**

```bash
# Adjust resource requests/limits
kubectl set resources deployment demo-app-alpha \
  -n tenant-alpha \
  --requests=cpu=500m,memory=512Mi \
  --limits=cpu=1000m,memory=1Gi
```

### Troubleshooting

**Pod not scheduling:**

```bash
# Check events
kubectl describe pod -n tenant-alpha <pod-name>

# Check quotas
kubectl get resourcequota -n tenant-alpha

# Check limits exceeded
kubectl describe limitrange -n tenant-alpha
```

**Network connectivity issues:**

```bash
# Test pod-to-pod connectivity
kubectl run -it debug --image=busybox --restart=Never -n tenant-alpha -- sh
/ # wget -O- http://demo-app-alpha.tenant-alpha.svc.cluster.local

# Check network policies
kubectl get networkpolicies -n tenant-alpha
kubectl describe networkpolicy <policy-name> -n tenant-alpha
```

**Prometheus not scraping:**

```bash
# Check ServiceMonitors
kubectl get servicemonitor -A
kubectl describe servicemonitor -A

# Check Prometheus targets
# Visit http://prometheus:9090/targets
```

### Backup & Disaster Recovery

```bash
# Backup Prometheus data
kubectl exec -n observability prometheus-0 -- \
  tar czf /tmp/prometheus-backup.tar.gz /prometheus

# Backup etcd (managed by AWS)
# AWS handles etcd backups automatically

# Restore Grafana dashboards (stored in configmaps)
kubectl get configmap -n observability -o yaml > grafana-dashboards.yaml
```

### Updating ArgoCD Applications

```bash
# Update image/version in Git
# Commit and push to repository
git add .
git commit -m "Update app version"
git push origin main

# ArgoCD automatically syncs (if automated: true)
# Monitor sync status
argocd app get app-of-apps-root
```

### Adding a New Tenant

1. **Create namespace and RBAC:**

```yaml
# infrastructure/multi-tenancy/namespaces.yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-gamma
  labels:
    tenant: gamma
```

2. **Create ApplicationSet entry** or individual Application:

```yaml
# Update infrastructure/gitops/app-of-apps.yaml
- tenant: gamma
  namespace: tenant-gamma
  project: production
```

3. **Create tenant application directory:**

```bash
mkdir -p gitops/argocd/applications/tenant-gamma
# Copy demo-app.yaml template and customize
```

4. **Commit and push:**

```bash
git add .
git commit -m "Add tenant-gamma"
git push origin main
```

ArgoCD automatically syncs the new tenant!

---

## Cost Optimization

### Resource Efficiency

```yaml
# Use cluster autoscaler to right-size nodes
      autoscaling:
        minSize: 3
        maxSize: 10
        desiredSize: 5

# Set resource requests/limits accurately
      resources:
        requests:
          cpu: 250m        # Actual usage
          memory: 256Mi
        limits:
          cpu: 500m        # 2x buffer
          memory: 512Mi
```

### Storage Optimization

```yaml
# Loki retention policy
      limits_config:
        retention_period: 30d  # Adjust per needs
        
# Prometheus retention
      retentionSize: "50GB"   # Stop ingestion when full
      retention: 15d           # Auto-delete after 15 days
```

### Monitoring Costs

Use AWS Cost Explorer integrating with Prometheus:

```yaml
# Custom metric for cost tracking
      prometheus:
        recording_rules:
        - alert: PVCUsageAbove50Percent
          expr: (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) > 0.5
```

---

## Additional Resources

- **Kubernetes Documentation**: https://kubernetes.io/docs/
- **ArgoCD Documentation**: https://argo-cd.readthedocs.io/
- **Prometheus Documentation**: https://prometheus.io/docs/
- **AWS EKS Best Practices**: https://aws.github.io/aws-eks-best-practices/
- **OWASP Container Security**: https://cheatsheetseries.owasp.org/cheatsheets/Kubernetes_Security_Cheat_Sheet.html

---

## Support & Contributions

For issues, questions, or contributions:

1. Open an issue in the GitHub repository
2. Submit a PR for improvements
3. Contact the platform engineering team

---

**Last Updated**: February 2026
**Architecture Version**: 2.0
**Kubernetes**: 1.27+
**EKS**: Latest managed version
