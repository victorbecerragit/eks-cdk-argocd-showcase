# Multi-Tenant EKS Deployment Checklist

Use this checklist to ensure all components are properly deployed.

## Phase 1: Pre-Deployment Setup

- [ ] AWS credentials configured
  ```bash
  export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  export AWS_REGION=us-east-1
  export AWS_PROFILE=default
  ```

- [ ] AWS CDK bootstrapped
  ```bash
  npx cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION}
  ```

- [ ] Git repository configured
  ```bash
  # Update repository URL in:
  # - infrastructure/gitops/infrastructure-apps.yaml
  # - infrastructure/gitops/app-of-apps.yaml
  ```

- [ ] Environment variables set
  ```bash
  echo $AWS_ACCOUNT_ID
  echo $AWS_REGION
  # Should output valid values
  ```

## Phase 2: AWS Infrastructure Deployment

### Network Stack
- [ ] Deploy network stack
  ```bash
  npx cdk deploy EksShowcase-prod-Network --require-approval never
  ```

- [ ] Verify VPC created
  ```bash
  aws ec2 describe-vpcs --filters 'Name=tag:Name,Values=EksShowcase*'
  ```

- [ ] Verify NAT gateways
  ```bash
  aws ec2 describe-nat-gateways --filter 'Name=tag:Name,Values=EksShowcase*'
  ```

- [ ] Verify subnets
  ```bash
  aws ec2 describe-subnets --filters 'Name=tag:Name,Values=EksShowcase*'
  ```

### EKS Cluster Stack
- [ ] Deploy EKS stack
  ```bash
  npx cdk deploy EksShowcase-prod-EKS --require-approval never
  ```

- [ ] Verify cluster created
  ```bash
  aws eks list-clusters
  ```

- [ ] Verify cluster is ACTIVE
  ```bash
  aws eks describe-cluster --name EksShowcase-prod-EKS \
    --query 'cluster.status'
  ```

- [ ] Verify node groups
  ```bash
  aws eks list-nodegroups --cluster-name EksShowcase-prod-EKS
  ```

- [ ] Verify nodes are READY
  ```bash
  kubectl get nodes -o wide
  # All nodes should be in Ready state
  ```

### Storage Stack
- [ ] Deploy storage stack
  ```bash
  npx cdk deploy EksShowcase-prod-Storage --require-approval never
  ```

- [ ] Verify S3 buckets created
  ```bash
  aws s3 ls | grep EksShowcase
  ```

### GitOps Stack
- [ ] Deploy GitOps stack
  ```bash
  npx cdk deploy EksShowcase-prod-GitOps --require-approval never
  ```

- [ ] Verify ArgoCD namespace
  ```bash
  kubectl get namespace argocd
  ```

- [ ] Verify ArgoCD pods
  ```bash
  kubectl get pods -n argocd
  # All pods should be Running
  ```

## Phase 3: Configure kubeconfig

- [ ] Update kubeconfig
  ```bash
  CLUSTER_NAME=$(aws cloudformation describe-stacks \
    --stack-name EksShowcase-prod-EKS \
    --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
    --output text)
  
  aws eks update-kubeconfig --name ${CLUSTER_NAME} --region ${AWS_REGION}
  ```

- [ ] Verify cluster access
  ```bash
  kubectl cluster-info
  kubectl get nodes
  # Should list worker nodes
  ```

- [ ] Verify core services
  ```bash
  kubectl get pods -n kube-system
  kubectl get pods -n kube-node-lease
  ```

## Phase 4: Deploy Multi-Tenancy Foundation

- [ ] Create tenant namespaces
  ```bash
  kubectl apply -f infrastructure/multi-tenancy/namespaces.yaml
  ```

- [ ] Verify namespaces created
  ```bash
  kubectl get namespaces -L tenant,environment
  # Should show: tenant-alpha, tenant-beta, tenant-staging, platform-tools, observability
  ```

- [ ] Verify resource quotas
  ```bash
  kubectl get resourcequota -A
  kubectl describe resourcequota -A
  ```

- [ ] Apply RBAC
  ```bash
  kubectl apply -f infrastructure/multi-tenancy/rbac.yaml
  ```

- [ ] Verify roles created
  ```bash
  kubectl get role -A
  kubectl get rolebinding -A
  kubectl get clusterrole | grep tenant
  ```

- [ ] Verify service accounts
  ```bash
  kubectl get serviceaccount -n tenant-alpha
  kubectl get serviceaccount -n tenant-beta
  ```

## Phase 5: Deploy Security Policies

- [ ] Apply pod security policies
  ```bash
  kubectl apply -f infrastructure/security/pod-security-policies.yaml
  ```

- [ ] Verify PSP created
  ```bash
  kubectl get psp
  # Should show: restricted-alpha, baseline-beta, etc.
  ```

- [ ] Apply network policies
  ```bash
  kubectl apply -f infrastructure/security/network-policies.yaml
  ```

- [ ] Verify network policies
  ```bash
  kubectl get networkpolicies -A
  # Should show policies in each tenant namespace
  ```

- [ ] Test network isolation
  ```bash
  # Run test pod in tenant-alpha
  kubectl run test-alpha --image=busybox -it --rm -n tenant-alpha -- sh
  # From pod, try: wget -O- http://demo-app-beta.tenant-beta
  # Should timeout (connection refused)
  ```

## Phase 6: Deploy Observability Stack

### Method A: Using Prometheus Helm Charts

- [ ] Add Helm repositories
  ```bash
  helm repo add prometheus-community \
    https://prometheus-community.github.io/helm-charts
  helm repo add grafana https://grafana.github.io/helm-charts
  helm repo update
  ```

- [ ] Create observability namespace
  ```bash
  kubectl create namespace observability
  kubectl label namespace observability name=observability
  ```

- [ ] Install Prometheus Stack
  ```bash
  helm install prometheus \
    prometheus-community/kube-prometheus-stack \
    -f infrastructure/helm-values/prometheus-values.yaml \
    -n observability
  ```

- [ ] Verify Prometheus installation
  ```bash
  kubectl get pods -n observability
  kubectl get pvc -n observability
  kubectl get svc -n observability
  ```

- [ ] Install Loki Stack
  ```bash
  helm install loki grafana/loki-stack \
    -f infrastructure/helm-values/loki-values.yaml \
    -n observability
  ```

- [ ] Verify Loki installation
  ```bash
  kubectl get pods -n observability | grep loki
  kubectl get pvc -n observability | grep loki
  ```

### Method B: Using ArgoCD

- [ ] Update Git repository URL in infrastructure files
  ```bash
  sed -i 's|https://github.com/your-org/|https://github.com/YOUR_ORG/|g' \
    infrastructure/gitops/*.yaml
  git add .
  git commit -m "Update repository URL"
  git push
  ```

- [ ] Apply ArgoCD apps
  ```bash
  kubectl apply -f infrastructure/gitops/app-of-apps.yaml
  kubectl apply -f infrastructure/gitops/infrastructure-apps.yaml
  ```

- [ ] Monitor ArgoCD sync
  ```bash
  kubectl get applications -n argocd
  argocd app list
  argocd app wait app-of-apps-root
  ```

## Phase 7: Verify Observability Components

- [ ] Verify Prometheus scrape targets
  ```bash
  # Port forward
  kubectl port-forward -n observability svc/prometheus-operated 9090:9090 &
  # Access: http://localhost:9090/targets
  # Should show all targets as UP
  ```

- [ ] Verify Grafana datasources
  ```bash
  # Port forward
  kubectl port-forward -n observability svc/prometheus-grafana 3000:80 &
  # Access: http://localhost:3000 (admin/changeme)
  # Check Configuration > Data Sources
  # Should show: Prometheus (green), Loki (green)
  ```

- [ ] Verify AlertManager
  ```bash
  kubectl get alertmanager -n observability
  kubectl logs -n observability alertmanager-0
  ```

- [ ] Verify ServiceMonitors are discovered
  ```bash
  kubectl get servicemonitor -A
  kubectl describe servicemonitor -A
  # Check: tenant-alpha-apps, tenant-beta-apps, etc.
  ```

## Phase 8: Deploy Sample Tenant Applications

- [ ] Create tenant application directories
  ```bash
  mkdir -p gitops/argocd/applications/tenant-alpha
  mkdir -p gitops/argocd/applications/tenant-beta
  ```

- [ ] Copy demo applications
  ```bash
  cp gitops/argocd/applications/tenant-alpha/demo-app.yaml \
     gitops/argocd/applications/tenant-alpha/
  cp gitops/argocd/applications/tenant-beta/demo-app.yaml \
     gitops/argocd/applications/tenant-beta/
  ```

- [ ] Deploy tenant applications
  ```bash
  # Via ArgoCD (recommended)
  kubectl apply -f infrastructure/gitops/infrastructure-apps.yaml
  
  # Or directly
  kubectl apply -f gitops/argocd/applications/tenant-alpha/demo-app.yaml
  kubectl apply -f gitops/argocd/applications/tenant-beta/demo-app.yaml
  ```

- [ ] Verify tenant pods
  ```bash
  kubectl get pods -n tenant-alpha
  kubectl get pods -n tenant-beta
  # All pods should be Running
  ```

- [ ] Verify tenant services
  ```bash
  kubectl get svc -n tenant-alpha
  kubectl get svc -n tenant-beta
  ```

- [ ] Verify tenant ingress
  ```bash
  kubectl get ingress -n tenant-alpha
  kubectl get ingress -n tenant-beta
  # Should show ALB endpoint
  ```

## Phase 9: Verify Metrics Collection

- [ ] Check Prometheus for tenant metrics
  ```bash
  # Access http://localhost:9090 (with port-forward)
  # Query: up{namespace="tenant-alpha"}
  # Should return metrics with value 1
  ```

- [ ] Check Grafana dashboards
  ```bash
  # Access http://localhost:3000
  # Navigate to: Dashboards > Browse
  # Should show: Kubernetes Cluster, Multi-Tenant Overview, etc.
  ```

- [ ] Verify log collection
  ```bash
  # Check Loki has logs
  kubectl logs -n observability -l app=loki
  # Should show "logs received" messages
  ```

## Phase 10: Access Applications

- [ ] Get ArgoCD endpoint
  ```bash
  kubectl get ingress -n argocd
  # Copy ALB endpoint, access in browser
  ```

- [ ] Login to Grafana
  ```bash
  # URL: http://localhost:3000 (with port-forward)
  # Username: admin
  # Password: changeme
  # Change password immediately!
  ```

- [ ] Login to Prometheus
  ```bash
  # URL: http://localhost:9090
  # Query some metrics: up, container_cpu_usage_seconds_total
  ```

- [ ] Access tenant applications
  ```bash
  # Get ingress endpoints
  kubectl get ingress -n tenant-alpha
  kubectl get ingress -n tenant-beta
  # Access via ALB DNS
  ```

## Phase 11: Production Hardening

- [ ] Change Grafana admin password
  ```bash
  kubectl exec -n observability <grafana-pod> -- \
    grafana-cli admin reset-admin-password <new-password>
  
  # Or via UI: Profile > Change Password
  ```

- [ ] Configure Slack webhook for alerts
  ```bash
  # Update infrastructure/observability/observability-stack.yaml
  # Set slack_api_url in alertmanager config
  kubectl apply -f infrastructure/observability/observability-stack.yaml
  ```

- [ ] Enable TLS for ArgoCD
  ```bash
  # Update ingress annotations in lib/constructs/argocd-construct.ts
  # Add SSL certificate ARN
  ```

- [ ] Configure external secrets
  ```bash
  # Install External Secrets Operator
  helm install external-secrets \
    external-secrets/external-secrets \
    -n external-secrets-system \
    --create-namespace
  
  # Create SecretStore for AWS Secrets Manager
  ```

- [ ] Enable VPC flow logs
  ```bash
  # Check in network-stack.ts - should be enabled
  # Verify in CloudWatch Logs
  ```

- [ ] Enable EKS control plane logging
  ```bash
  # Check in eks-cluster-construct.ts
  # View logs in CloudWatch
  ```

## Phase 12: Documentation & Handoff

- [ ] Document cluster endpoint
  ```bash
  kubectl cluster-info | grep 'Kubernetes master'
  ```

- [ ] Document accessible endpoints
  - [ ] Grafana URL and credentials reset procedure
  - [ ] Prometheus URL
  - [ ] ArgoCD URL and login procedure
  - [ ] Tenant application URLs

- [ ] Create runbook for common tasks
  - [ ] Scaling applications
  - [ ] Adding new tenants
  - [ ] Troubleshooting pod issues
  - [ ] Accessing logs

- [ ] Document alerts configuration
  - [ ] Slack channels
  - [ ] Alert routing rules
  - [ ] On-call escalation procedures

- [ ] Create disaster recovery plan
  - [ ] Backup procedures
  - [ ] Restore procedures
  - [ ] RTO/RPO targets

## Rollback Procedures

If deployment fails at any stage:

### Network Stack Failure
```bash
npx cdk destroy EksShowcase-prod-Network
# Fix issues in lib/stacks/network-stack.ts
# Redeploy
```

### EKS Stack Failure
```bash
# Delete stack (preserves data)
aws cloudformation delete-stack --stack-name EksShowcase-prod-EKS

# Fix issues in lib/stacks/eks-stack.ts
# Redeploy: npx cdk deploy EksShowcase-prod-EKS
```

### Observability Deployment Failure
```bash
# Delete Helm release
helm uninstall prometheus -n observability
helm uninstall loki -n observability

# Fix values file
# Redeploy
```

### ArgoCD Application Failure
```bash
# Delete failed application
kubectl delete application <app-name> -n argocd

# Check logs for errors
kubectl logs -n argocd argocd-application-controller-0

# Fix manifests in Git
# Reapply application
```

## Post-Deployment Validation

Run this script to verify all components:

```bash
#!/bin/bash
set -e

echo "=== Checking Kubernetes Cluster ==="
kubectl cluster-info
kubectl get nodes

echo "=== Checking Namespaces ==="
kubectl get ns -L tenant

echo "=== Checking Observability Stack ==="
kubectl get pods -n observability
kubectl get pvc -n observability

echo "=== Checking Multi-Tenancy ==="
kubectl get resourcequota -A
kubectl get networkpolicies -A

echo "=== Checking Tenants ==="
kubectl get pods -n tenant-alpha
kubectl get pods -n tenant-beta

echo "=== Checking ArgoCD ==="
kubectl get app -n argocd

echo "✅ All components verified!"
```

Save as `scripts/validate-deployment.sh` and run:
```bash
bash scripts/validate-deployment.sh
```

---

**Last Updated**: February 2026
**Status**: Ready for deployment
