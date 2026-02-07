# Multi-Tenant EKS Architecture - Quick Reference

## File Structure

```
infrastructure/
├── README.md                          # Full documentation
├── multi-tenancy/
│   ├── namespaces.yaml               # Tenant namespaces, quotas, limits
│   └── rbac.yaml                     # Roles and permissions
├── security/
│   ├── pod-security-policies.yaml    # Pod security standards
│   └── network-policies.yaml         # Network isolation rules
├── observability/
│   ├── service-monitors.yaml         # Prometheus scrape configs
│   └── observability-stack.yaml      # AlertManager, configs
├── helm-values/
│   ├── prometheus-values.yaml        # Prometheus Helm chart values
│   └── loki-values.yaml              # Loki Helm chart values
└── gitops/
    ├── app-of-apps.yaml              # Root ArgoCD app
    └── infrastructure-apps.yaml      # Infrastructure apps definition
```

## Key Commands

### Deploy All Infrastructure

```bash
# 1. Deploy networking
npx cdk deploy EksShowcase-prod-Network --require-approval never

# 2. Deploy EKS cluster
npx cdk deploy EksShowcase-prod-EKS --require-approval never

# 3. Deploy storage
npx cdk deploy EksShowcase-prod-Storage --require-approval never

# 4. Deploy GitOps
npx cdk deploy EksShowcase-prod-GitOps --require-approval never

# 5. Apply multi-tenancy configs
kubectl apply -f infrastructure/multi-tenancy/namespaces.yaml
kubectl apply -f infrastructure/multi-tenancy/rbac.yaml

# 6. Apply security policies
kubectl apply -f infrastructure/security/pod-security-policies.yaml
kubectl apply -f infrastructure/security/network-policies.yaml

# 7. Deploy observability (via Helm or ArgoCD)
kubectl apply -f infrastructure/gitops/app-of-apps.yaml
```

### Monitor Deployments

```bash
# Watch ArgoCD syncing
kubectl get app -n argocd
argocd app list
argocd app wait app-of-apps-root

# Check observability stack
kubectl get pods -n observability
kubectl get svc -n observability

# View tenant namespaces
kubectl get ns -L tenant,environment
kubectl get pods -n tenant-alpha
kubectl get pods -n tenant-beta

# Check resource quotas
kubectl describe resourcequota -A
```

### Access Dashboards

```bash
# Grafana (port-forward)
kubectl port-forward -n observability svc/prometheus-grafana 3000:80

# Prometheus UI
kubectl port-forward -n observability svc/prometheus-operated 9090:9090

# ArgoCD UI (get ALB endpoint)
kubectl get ingress -n argocd
```

## Component Overview

| Component | Namespace | Purpose | HA |
|-----------|-----------|---------|-----|
| **ArgoCD** | argocd | GitOps engine | ✓ |
| **Prometheus** | observability | Metrics collection | ✓ (2 replicas) |
| **Grafana** | observability | Visualization | ✗ (1 replica) |
| **AlertManager** | observability | Alert routing | ✓ |
| **Loki** | observability | Log aggregation | ✓ |
| **Promtail** | observability | Log shipper | ✓ (DaemonSet) |
| **Tenant Alpha** | tenant-alpha | Production workloads | ✓ |
| **Tenant Beta** | tenant-beta | Production workloads | ✓ |
| **Tenant Staging** | tenant-staging | Staging/testing | ✓ |

## Tenant Specifications

### Tenant Alpha (Production)
- **CPU Request**: 100 cores → **Limit**: 200 cores
- **Memory Request**: 200GB → **Limit**: 400GB
- **Max Pods**: 500
- **Max Services (LB)**: 5
- **Security**: RESTRICTED Pod Security Policy
- **Use Case**: Production workloads

### Tenant Beta (Production)
- **CPU Request**: 80 cores → **Limit**: 160 cores
- **Memory Request**: 160GB → **Limit**: 320GB
- **Max Pods**: 300
- **Max Services (LB)**: 3
- **Security**: BASELINE Pod Security Policy
- **Use Case**: Production workloads (less intensive)

### Tenant Staging (Shared)
- **CPU Request**: 50 cores → **Limit**: 100 cores
- **Memory Request**: 100GB → **Limit**: 200GB
- **Max Pods**: 200
- **Max Services (LB)**: 2
- **Use Case**: Staging, canary testing

## Observability Metrics

### Scrape Targets
- ✓ Kubernetes API Server
- ✓ Kubelet (nodes)
- ✓ kube-state-metrics
- ✓ Node Exporter
- ✓ Ingress Nginx Controller
- ✓ AWS Load Balancer Controller
- ✓ Tenant workloads (auto-discovered)

### Pre-Configured Alerts
- `NodeCPUUsageHigh` (> 80%)
- `NodeMemoryUsageHigh` (> 80%)
- `PodCrashLooping` (frequent restarts)
- `DiskSpaceUsageHigh` (> 80%)
- `PersistentVolumeUsageHigh` (> 80%)
- `TenantResourceQuotaExceeded` (> 90%)

### Alert Routing
- **Critical**: #critical-alerts (Slack)
- **Warning**: #warnings (Slack)
- **Tenant Alpha**: #tenant-alpha-alerts (Slack)
- **Tenant Beta**: #tenant-beta-alerts (Slack)

## Network Policies

### Allowed Traffic
```
Inside namespace       ✓ Pods can communicate
Ingress controller    ✓ Can route to pods (ports 8080, 8443)
Prometheus scraping   ✓ Can access metrics (ports 9090, 8080)
DNS (kube-system)     ✓ Can resolve names (UDP 53)
External HTTPS        ✓ Can reach outside (TCP 443)
```

### Denied Traffic
```
Across namespaces     ✗ tenant-alpha ↔ tenant-beta
Non-approved ports    ✗ Only whitelisted ports allowed
Outbound HTTP         ✗ Only HTTPS allowed (HTTP blocked)
```

## RBAC Roles

### Tenant Admin
- Deploy/update/delete within namespace
- Manage ConfigMaps, Secrets
- Cannot delete namespace or modify quotas

### Tenant Developer
- Deploy applications
- View logs and status
- Cannot delete resources
- Cannot access secrets

### Prometheus ServiceAccount
- Read cluster-wide metrics
- List nodes, pods, services
- Access non-resource URLs (/metrics)

## Helm Chart Versions

```
prometheus-community/kube-prometheus-stack: 54.0.0
  - Prometheus Operator
  - Prometheus
  - Grafana
  - AlertManager

grafana/loki-stack: 2.9.0
  - Loki
  - Promtail
```

## Key Configuration Values

```yaml
# Prometheus Retention
retention: 15 days
retentionSize: 50GB
replicas: 2 (HA)

# Grafana
adminPassword: "changeme" (UPDATE IN PRODUCTION!)
persistence: 10Gi

# Loki
replicas: 3 (HA)
retention: 30 days (configurable)
persistence: 50Gi

# Alertmanager
resolve_timeout: 5m
group_wait: 10s (critical) / 30s (normal)
repeat_interval: 12h
```

## DNS Names (Internal)

```
Prometheus:    prometheus-operated.observability.svc.cluster.local:9090
Grafana:       prometheus-grafana.observability.svc.cluster.local:80
Loki:          loki.observability.svc.cluster.local:3100
AlertManager:  prometheus-alertmanager.observability.svc.cluster.local:9093
Prometheus Op: prometheus-operator.observability.svc.cluster.local:8080
```

## Troubleshooting

### Prometheus not scraping metrics

```bash
# Check ServiceMonitors exist
kubectl get servicemonitor -A

# View Prometheus targets
# Access http://prometheus:9090/targets in UI

# Check RBAC for prometheus ServiceAccount
kubectl get clusterrolebinding | grep prometheus
```

### Pod not starting

```bash
# Check events
kubectl describe pod <pod-name> -n <namespace>

# Verify quotas not exceeded
kubectl describe resourcequota -n <namespace>

# Check limits
kubectl describe limitrange -n <namespace>

# View logs
kubectl logs <pod-name> -n <namespace> --previous
```

### Network policy blocking traffic

```bash
# View network policies
kubectl get networkpolicies -n <namespace>

# Describe specific policy
kubectl describe networkpolicy <policy-name> -n <namespace>

# Test connectivity
kubectl run debug --image=busybox -it --rm -n <namespace> -- sh
# From pod: wget -O- http://target-service
```

### Unable to connect to Grafana

```bash
# Check Grafana pod status
kubectl get pods -n observability -l app.kubernetes.io/name=grafana

# Check service
kubectl get svc -n observability | grep grafana

# Check ingress (if using)
kubectl get ingress -n observability

# Port forward directly
kubectl port-forward -n observability svc/prometheus-grafana 3000:80
```

## Adding a New Tenant

1. Create namespace and quotas
2. Create RBAC roles
3. Create ApplicationSet entry in ArgoCD
4. Push changes to Git
5. ArgoCD syncs automatically

See `infrastructure/README.md` for detailed steps.

## Performance Tuning

### For High Load Tenants

```yaml
# Increase Prometheus scrape intervals
  endpoints:
  - port: metrics
    interval: 15s  # From 30s

# Increase Loki retention
  retention: 7d    # Reduce to save storage

# Increase pod limits
  limits:
    memory: "2Gi"  # From 512Mi
```

### For Cost Optimization

```yaml
# Reduce storage
  retentionSize: "30GB"  # From 50GB
  retention: 7d          # From 15d

# Scale down non-critical replicas
  replicas: 1            # Production: 2+

# Use node affinity for bin-packing
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution: []
```

## Security Best Practices

- [ ] Change Grafana admin password from default
- [ ] Enable TLS for ArgoCD ingress
- [ ] Use AWS Secrets Manager for sensitive values
- [ ] Regularly rotate credentials
- [ ] Enable audit logging for EKS
- [ ] Review and update network policies quarterly
- [ ] Scan container images for vulnerabilities
- [ ] Keep Kubernetes version updated

## Useful Links

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/grafana/latest/
- **Loki Docs**: https://grafana.com/docs/loki/latest/
- **Kubernetes RBAC**: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- **Network Policies**: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- **Resource Quotas**: https://kubernetes.io/docs/concepts/policy/resource-quotas/

---

**Architecture Version**: 2.0  
**Last Updated**: February 2026  
**Maintained By**: Platform Engineering Team
