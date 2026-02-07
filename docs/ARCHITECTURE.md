# Multi-Tenant EKS Architecture - Summary & Integration Guide

## Executive Summary

A production-ready, multi-tenant Kubernetes platform on AWS EKS with GitOps (ArgoCD) and comprehensive observability (Prometheus/Grafana/Loki).

**Key Features:**
- ✓ Strict namespace-based tenant isolation
- ✓ Network policies for cross-tenant security
- ✓ Role-based access control (RBAC) per tenant
- ✓ Resource quotas and limit ranges
- ✓ Pod security policies (restricted/baseline)
- ✓ Prometheus for metrics collection
- ✓ Grafana for visualization
- ✓ Loki for log aggregation
- ✓ ArgoCD for GitOps continuous deployment
- ✓ AlertManager for intelligent alert routing
- ✓ High availability for critical components

---

## Architecture Diagrams

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Git Repository (GitHub)                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  infrastructure/       gitops/                             │ │
│  │  ├─ multi-tenancy/    ├─ argocd/applications/            │ │
│  │  ├─ security/         └─ helm-charts/demo-app/           │ │
│  │  ├─ observability/                                        │ │
│  │  ├─ helm-values/                                          │ │
│  │  └─ gitops/                                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────┬──────────────────────────────────────────────────────────┘
         │ Git Webhooks / Polling
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ArgoCD (argocd ns)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  App Controller  │  Web Server  │  Repo Server            │ │
│  │  (monitors Git)  │  (UI/API)    │  (clones repo)          │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────┬──────────────────────────────────────────────────────────┘
         │ Apply manifests
         │
         ▼
    ┌────────────────────────────────────────────────────────────┐
    │              EKS Cluster - Kubernetes API                  │
    ├────────────────────────────────────────────────────────────┤
    │                                                            │
    │  ┌─────────────────┐ ┌──────────────────┐ ┌────────────┐ │
    │  │  tenant-alpha   │ │  tenant-beta     │ │ observ.   │ │
    │  │                 │ │                  │ │           │ │
    │  │  Deployments    │ │  Deployments    │ │ Prometheus│ │
    │  │  Services       │ │  Services       │ │ Grafana   │ │
    │  │  Ingress        │ │  Ingress        │ │ Loki      │ │
    │  │  ConfigMaps     │ │  ConfigMaps     │ │ AlertMgr  │ │
    │  │  Secrets        │ │  Secrets        │ │ Promtail  │ │
    │  └─────────────────┘ └──────────────────┘ └───────┬───┘ │
    │         △                    △                     │     │
    │         │                    │                     │     │
    │         │ Resource Quotas    │                     │     │
    │         │ Network Policies    │              Scrapes     │
    │         │ RBAC / PSP          │              Metrics     │
    │         │                     │                     │     │
    │  ┌──────┴─────────────────────┴──────────────────────┐   │
    │  │         Kubernetes Control Plane (Managed)       │   │
    │  │  API Server│Scheduler│Controllers│etcd           │   │
    │  └───────────────────────────────────────────────────┘   │
    │                                                            │
    │  Worker Nodes:                                            │
    │  ├─ kubelet (container runtime: containerd)             │
    │  ├─ kube-proxy (networking)                             │
    │  ├─ aws-cni (networking)                                │
    │  └─ cloud-provider-aws                                   │
    │                                                            │
    └────────────────────────────────────────────────────────────┘
         △              △              △
         │              │              │
    Monitoring    Logging          Config

Prometheus scrapers:
├─ Kubelet metrics (node resource)
├─ kube-state-metrics (K8s object state)
├─ Node Exporter (node resources)
├─ Service endpoints (port 9090, :8080)
└─ Custom app metrics (port 8080)

Promtail shippers:
├─ Pod logs (containers)
├─ System logs (/var/log)
└─ Application stdout

Alerts:
├─ Alertmanager (routes)
├─ Slack channels
└─ On-call notifications
```

### Security Zones

```
┌──────────────────────────────────────────────────────────────────┐
│                    AWS VPC (Multi-AZ)                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Public Subnets (NAT Gateway, ALB)                       │  │
│  │  ├─ Ingress Nginx Controller                             │  │
│  │  ├─ ALB for ArgoCD                                       │  │
│  │  ├─ ALB for Tenant Applications                          │  │
│  │  └─ NAT Gateway (outbound traffic)                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          △                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Private Subnets (EKS Cluster & Data Plane)             │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │ Control Plane (AWS Managed)                         ││  │
│  │  │ ├─ API Server (port 443)                           ││  │
│  │  │ ├─ etcd (encrypted)                                ││  │
│  │  │ ├─ Scheduler                                       ││  │
│  │  │ └─ Controller Manager                              ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │ Data Plane (Worker Nodes)                           ││  │
│  │  │ [Security Groups]                                   ││  │
│  │  │                                                     ││  │
│  │  │  Node 1 (AZ-a)        Node 2 (AZ-b)  Node 3 (AZ-c)││  │
│  │  │  ┌────────────┐       ┌────────────┐ ┌────────────┐││  │
│  │  │  │ Kubelet    │       │ Kubelet    │ │ Kubelet    │││  │
│  │  │  │ containerd │       │ containerd │ │ containerd │││  │
│  │  │  │ kube-proxy │       │ kube-proxy │ │ kube-proxy │││  │
│  │  │  │ Pods       │       │ Pods       │ │ Pods       │││  │
│  │  │  └────────────┘       └────────────┘ └────────────┘││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  │                                                          │  │
│  │  [Network Policies - Pod to Pod Communication]         │  │
│  │  [Security Groups - Network boundary]                  │  │
│  │  [Encryption in Transit - TLS]                         │  │
│  │  [Encryption at Rest - KMS]                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Tenant Isolation Layers

```
LAYER 1: Namespace Isolation
┌─────────────────┬─────────────────┬──────────────────┐
│  tenant-alpha   │  tenant-beta     │ tenant-staging   │
├─────────────────┼─────────────────┼──────────────────┤
│ Separate etcd   │ Separate etcd    │ Separate etcd    │
│ resources       │ resources        │ resources        │
└─────────────────┴─────────────────┴──────────────────┘
         △
         │
LAYER 2: RBAC (Role-Based Access Control)
┌──────────────────────────────────────────────────────┐
│ Tenant Admin     Tenant Developer    Tenant Viewer   │
│ ├─ SA            ├─ SA               ├─ SA           │
│ └─ Role          └─ Role             └─ Role         │
└──────────────────────────────────────────────────────┘
         △
         │
LAYER 3: Pod Security Policies
┌──────────────────────────────────────────────────────┐
│ RESTRICTED (alpha)    │    BASELINE (beta)           │
│ ├─ No privilege       │ ├─ Some flexibility         │
│ ├─ Non-root only      │ ├─ Non-root only            │
│ ├─ Drop ALL caps      │ ├─ Drop NET_RAW             │
│ └─ Read-only fs opt   │ └─ Flexible volume mount     │
└──────────────────────────────────────────────────────┘
         △
         │
LAYER 4: Network Policies (SECurity Policies)
┌──────────────────────────────────────────────────────┐
│ Default Deny ALL                                     │
│ ├─ Ingress: Allow internal + prometheus             │
│ ├─ Egress: Allow DNS + internal + external HTTPS    │
│ └─ Cross-namespace: DENIED                           │
└──────────────────────────────────────────────────────┘
         △
         │
LAYER 5: Resource Quotas & Limits
┌──────────────────────────────────────────────────────┐
│ Quota (hard limits)  │  LimitRange (per-pod limits)  │
│ ├─ CPU              │ ├─ CPU min/max/default         │
│ ├─ Memory           │ ├─ Memory min/max/default      │
│ ├─ Pods             │ └─ PVC min/max                 │
│ └─ Services         │                                │
└──────────────────────────────────────────────────────┘
```

---

## Integration Points

### GitOps Workflow Integration

```
Developer → GitHub PR
  │
  ▼
Code Review (required approvals)
  │
  ▼ (approved)
Merge to main branch
  │
  ▼ (webhook triggered)
ArgoCD detects change
  │
  ├─ App-of-Apps controller
  ├─ Infrastructure apps controller
  ├─ Tenant apps controller
  │
  ▼
Apply manifests to cluster
  │
  ├─ Create/update resources
  ├─ Validate against policies
  │
  ▼
Prometheus scrapes metrics
  │
  ▼
Grafana visualizes deployment
  │
  ▼
Alerts if issues detected
  │
  ▼ (if event triggered)
AlertManager routes to Slack
```

### Observability Integration

```
Application Workload (tenant-alpha pod)
  │
  ├─ Metrics (port 8080:/metrics)
  │   └─ Prometheus ServiceMonitor scrapes → Prometheus
  │       │
  │       └─ Grafana queries Prometheus
  │           │
  │           ├─ Multi-Tenant Overview dashboard
  │           ├─ Pod metrics dashboard
  │           └─ Custom alerts
  │
  ├─ Logs (stderr, stdout)
  │   └─ Promtail ships to Loki
  │       │
  │       └─ Grafana queries Loki
  │           │
  │           ├─ Pod logs view
  │           ├─ Filtered by namespace/pod/app
  │           └─ Log-based alerts (optional)
  │
  └─ Events
      └─ Prometheus scrapes kube-events (via kube-state-metrics)
          │
          └─ Alert on errors/warnings
              │
              └─ AlertManager → Slack
```

### Multi-Tenancy Integration

```
New Tenant Request
  │
  ▼
Create Git PR:
  ├─ infrastructure/multi-tenancy/namespaces.yaml (add namespace + quotas)
  ├─ infrastructure/multi-tenancy/rbac.yaml (add roles)
  ├─ infrastructure/gitops/app-of-apps.yaml (add ApplicationSet entry)
  └─ gitops/argocd/applications/tenant-X/ (create app manifests)
  │
  ▼ (approved & merged)
ArgoCD syncs changes:
  │
  ├─ Creates namespace
  ├─ Applies resource quotas
  ├─ Applies RBAC roles
  ├─ Applies network policies
  ├─ Applies pod security policies
  ├─ Creates Ingress controller integration
  │
  ▼
Prometheus auto-discovers metrics:
  │
  ├─ ServiceMonitor for tenant workloads
  ├─ Scrapes pod metrics (port 8080:/metrics)
  ├─ Scrapes node metrics
  │
  ▼
Grafana visualizes:
  │
  ├─ Tenant resource usage
  ├─ Tenant pod status
  └─ Tenant application metrics

AlertManager routes tenant alerts:
  │
  └─ To tenant-specific Slack channel
```

---

## Component Dependencies

```
App-of-Apps (root)
│
├─ Infrastructure-Apps
│  │
│  ├─ Multi-Tenancy (no deps)
│  │   └─ Creates: namespaces, quotas, limits
│  │
│  ├─ Security-Policies (depends on: Multi-Tenancy)
│  │   └─ Creates: PSP, NetworkPolicies
│  │
│  ├─ Prometheus-Stack (depends on: Multi-Tenancy, Security-Policies)
│  │   ├─ Creates: observability namespace
│  │   ├─ Creates: prometheus, grafana, alertmanager
│  │   └─ Requires: ServiceMonitor CRD (from Prometheus Operator)
│  │
│  ├─ Loki-Stack (depends on: Prometheus-Stack)
│  │   ├─ Creates: loki pods
│  │   └─ Creates: promtail daemonset
│  │
│  └─ Observability-Setup (depends on: Prometheus-Stack, Loki-Stack)
│      ├─ Creates: ServiceMonitors
│      ├─ Creates: PrometheusRules (alerts)
│      └─ Creates: ConfigMaps (configurations)
│
└─ Tenant-Deployments (ApplicationSet)
   ├─ tenant-alpha (depends on: Infrastructure-Apps)
   ├─ tenant-beta (depends on: Infrastructure-Apps)
   └─ tenant-staging (depends on: Infrastructure-Apps)
```

---

## Resource Consumption Estimates

### Control Plane (AWS Managed)
- **Cost**: ~$0.20/hour
- **Included**: API Server, etcd, Controllers
- **HA**: Multi-AZ, auto-scaled

### Data Plane (Worker Nodes)

```
System Workloads (platform-tools namespace):
├─ 3 nodes × t3.large (2 CPU, 8GB mem)
├─ ArgoCD: 2 replicas
├─ AWS ALB Controller: 2 replicas
├─ Monitoring agents
└─ System services (metrics-server, dns, etc.)

Application Workloads (tenant namespaces):
├─ 3-10 nodes × t3.large to t3.xlarge (auto-scaling)
├─ Tenant pods (compute based on deployment)
├─ Horizontal Pod Autoscaler (scales pods)
└─ Auto-scaling group (scales nodes)

Observability Stack (observability namespace):
├─ Prometheus: 2 replicas × 1 CPU, 2GB mem → Storage: 50GB
├─ Grafana: 1 replica × 250m CPU, 512MB mem → Storage: 10GB
├─ Loki: 3 replicas × 100m CPU, 128MB mem each → Storage: 50GB
├─ AlertManager: 3 replicas
├─ Promtail: 1 pod per node (DaemonSet)
└─ Node Exporter: 1 pod per node (DaemonSet)
```

**Estimated Monthly Cost** (us-east-1):
- EKS Control Plane: ~$150
- 6 t3.large nodes (reserved): ~$800
- Storage (EBS): ~$250
- Data transfer (minimal): ~$50
- **Total**: ~$1,250/month

---

## Scaling Considerations

### Horizontal Scaling (adding pods)

```
Manual scaling:
  kubectl scale deployment <app> --replicas=5 -n tenant-alpha

Automatic scaling (HPA):
  - CPU threshold: 70%
  - Memory threshold: 80%
  - Min replicas: 2
  - Max replicas: 10
```

### Vertical Scaling (adding resources per pod)

```
Adjust in deployment:
  resources:
    requests:      # Guaranteed allocation
      cpu: 500m
      memory: 512Mi
    limits:        # Maximum allowed
      cpu: 1000m
      memory: 1Gi
```

### Cluster Scaling (adding nodes)

```
Auto-scaling group:
- Min nodes: 3
- Desired: 5
- Max nodes: 10

Cluster Autoscaler monitors:
  - Pod queue (pending pods)
  - Node utilization
  - Resource quotas
  - Automatically adds/removes nodes
```

---

## High Availability Configuration

| Component | Replicas | Node Affinity | Persistence |
|-----------|----------|---------------|-------------|
| Prometheus | 2 | Pod Anti-Affinity | 50GB PVC |
| Grafana | 1 | - | 10GB PVC |
| Loki | 3 | Pod Anti-Affinity | 50GB PVC |
| AlertManager | 3 | Pod Anti-Affinity | - |
| ArgoCD API | 2 | Pod Anti-Affinity | 5GB PVC |
| Tenant Apps | 2+ | Pod Anti-Affinity | Varies |

---

## Disaster Recovery

### RTO/RPO Targets

| Component | RTO | RPO | Method |
|-----------|-----|-----|--------|
| Kubernetes Cluster | 30min | 0 | AWS managed (auto-recovery) |
| Etcd (API state) | 5min | 0 | AWS managed (snapshots) |
| Application data | 1hr | 15min | Velero (optional) |
| Prometheus metrics | 24hr | 15 days | Retention policy |
| Grafana dashboards | 1hr | 0 | GitOps (version control) |

### Backup Strategy

```
Automated:
├─ EKS Control Plane (AWS handles)
├─ Prometheus PVC (EBS snapshots)
└─ Grafana configs (ConfigMaps in Git)

Manual (optional):
├─ Velero for application state
├─ S3 for long-term metric retention
└─ Cross-region replication
```

---

## Next Steps

1. **Review** this architecture with your platform/security team
2. **Customize** tenant specifications and resource quotas
3. **Configure** external integrations (Slack, DataDog, etc.)
4. **Deploy** using `DEPLOYMENT_CHECKLIST.md`
5. **Test** multi-tenant isolation and failover scenarios
6. **Document** runbooks specific to your organization
7. **Monitor** and optimize based on actual usage patterns

---

## Additional Resources

- [kubernetes-architect Skill](../../.github/skills/kubernetes-architect/SKILL.md)
- [Full Documentation](./README.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

---

**Version**: 2.0  
**Last Updated**: February 2026  
**Status**: Production Ready
