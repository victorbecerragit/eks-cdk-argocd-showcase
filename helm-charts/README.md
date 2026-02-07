# Reusable Helm Charts

This directory contains reusable Helm charts for deploying applications to the Kubernetes platform.

## Overview

- **Purpose**: Define reusable, templated Kubernetes resources
- **Format**: Helm 3 compatible
- **Deployment**: Manual with Helm CLI or via ArgoCD

## Directory Structure

```
helm-charts/
├── demo-app/              # Example application chart
│   ├── Chart.yaml        # Chart metadata
│   ├── values.yaml       # Default configuration
│   └── templates/        # Resource templates
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       └── _helpers.tpl
└── README.md             # This file
```

## Charts Included

### demo-app
A sample application Helm chart demonstrating:
- Kubernetes Deployment
- Service configuration
- Ingress setup
- ConfigMap/Secret management
- Helper templates

**To deploy:**
```bash
# Using Helm
helm install demo helm-charts/demo-app -n tenant-alpha

# Using ArgoCD (recommended)
# Reference in platform/gitops/applications/
```

## Creating a New Chart

### 1. Generate Chart Structure
```bash
helm create helm-charts/your-app
```

### 2. Edit Files
- **Chart.yaml**: Name, version, description
- **values.yaml**: Default configuration
- **templates/**: Kubernetes manifests

### 3. Template Syntax
```yaml
# In templates/deployment.yaml
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
      - name: app
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```

### 4. Test Chart
```bash
# Validate syntax
helm lint helm-charts/your-app

# Preview rendered manifests
helm template your-app helm-charts/your-app

# Dry-run install
helm install --dry-run --debug your-app helm-charts/your-app
```

### 5. Deploy
```bash
# Direct with Helm
helm install your-app helm-charts/your-app -n your-namespace

# Via ArgoCD (recommended)
# Create platform/gitops/applications/your-app.yaml
```

## Chart Best Practices

### File Organization
```
chart-name/
├── Chart.yaml              # Chart metadata (required)
├── values.yaml             # Default values (required)
├── README.md               # Chart documentation
├── values-dev.yaml         # Environment overrides
├── values-prod.yaml        # Environment overrides
└── templates/
    ├── _helpers.tpl        # Template helpers
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── configmap.yaml
    ├── secrets.yaml
    └── NOTES.txt           # Post-install notes
```

### Template Naming Conventions
- Use descriptive names: `deployment.yaml`, not `dep.yaml`
- Use helpers: `_helpers.tpl` for common patterns
- Add `.tpl` suffix for partial templates

### Values Structure
```yaml
# values.yaml - Organized by component
replicaCount: 1

image:
  repository: myapp
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  hosts:
    - host: example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 500m
    memory: 512Mi
```

## Deploying Helm Charts

### Direct Deployment
```bash
# Install
helm install release-name ./helm-charts/chart-name -n namespace

# Upgrade
helm upgrade release-name ./helm-charts/chart-name -n namespace

# Uninstall
helm uninstall release-name -n namespace
```

### With Values Overrides
```bash
helm install myapp ./helm-charts/demo-app \
  -n production \
  --values helm-charts/demo-app/values-prod.yaml \
  --set image.tag=v1.2.3

```

### Via ArgoCD (Recommended)
Create `platform/gitops/applications/myapp.yaml`:
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/your-repo
    path: helm-charts/demo-app
    targetRevision: HEAD
    helm:
      releaseName: myapp
      values: |
        replicaCount: 3
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Common Patterns

### Environment-Specific Values
```bash
# In values.yaml
environment: dev

# In Chart.yaml or Helmfile
--values helm-charts/demo-app/values-${ENVIRONMENT}.yaml
```

### Conditional Resources
```yaml
# In templates/ingress.yaml
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "demo-app.fullname" . }}
spec:
  ...
{{- end }}
```

### Named Templates
```yaml
# In templates/_helpers.tpl
{{- define "demo-app.fullname" -}}
{{ .Release.Name }}-{{ .Chart.Name }}
{{- end }}

# Usage in templates/deployment.yaml
metadata:
  name: {{ include "demo-app.fullname" . }}
```

## Helm Commands Reference

| Command | Purpose |
|---------|---------|
| `helm create` | Generate new chart |
| `helm lint` | Validate chart syntax |
| `helm template` | Render manifests |
| `helm install` | Deploy chart |
| `helm upgrade` | Update deployment |
| `helm rollback` | Revert to previous version |
| `helm uninstall` | Remove deployment |
| `helm list` | List deployments |
| `helm values` | Show current values |

## See Also

- [Helm Documentation](https://helm.sh/docs/)
- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Platform/GitOps Guide](../platform/README.md)
- [Architecture Overview](../docs/ARCHITECTURE_OVERVIEW.md)

---

**Tip**: Use ArgoCD to deploy Helm charts from Git. This enables continuous deployment and version control for all changes.
