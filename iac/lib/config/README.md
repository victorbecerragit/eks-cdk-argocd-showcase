# Configuration Management

This directory contains all environment-specific configurations for the EKS CDK deployment. It's designed as a **runtime-configurable, type-safe infrastructure system** that supports multiple deployment environments.

## 📋 File Structure

```
lib/config/
├── index.ts                    # 🎯 Main entry point (config selection)
├── environment-config.ts       # 📐 Type definitions & validation logic
├── dev.ts                      # 🔧 Development environment config
├── staging.ts                  # 🚀 Staging environment config
├── prod.ts                     # 🏭 Production environment config
└── README.md                   # This file
```

## 🎯 Why This Pattern Matters

### 1. **Single Source of Truth**
All environment configurations are centralized and validated. No config spread across CDK stacks or environment variables scattered throughout the codebase.

### 2. **Runtime Environment Selection**
Deploy different environments **without code changes**:
```bash
ENVIRONMENT=dev npx cdk deploy    # Deploy to dev
ENVIRONMENT=prod npx cdk deploy   # Deploy to prod
```

Perfect for **CI/CD pipelines** that need to deploy the same code to multiple environments.

### 3. **Type Safety + Flexibility**
TypeScript ensures all required fields are present. Switch between static imports and dynamic selection:
```typescript
// Dynamic (recommended for CDK)
const config = getConfig('prod');

// Static (when you need specific environment)
import { ProdConfig } from './config';
```

### 4. **Automatic Validation**
Each config file validates on import:
```typescript
// This throws immediately if config is invalid
validateEnvironmentConfig(ProdConfig);
```

Invalid configs are caught **before CDK synthesis**, not during deployment.

### 5. **Safe Defaults**
Unknown environment → defaults to dev. Prevents accidental production deployments from typos.

## 🚀 How to Use

### Basic Usage in CDK App

**bin/app.ts:**
```typescript
import { getConfig } from '../lib/config';

const config = getConfig(); // Reads ENVIRONMENT env var or defaults to 'dev'

new EksStack(app, 'eks-stack', {
    config: config,
    description: `EKS Cluster for ${config.envName}`,
});
```

### With Explicit Environment

```typescript
import { getConfig } from '../lib/config';

const config = getConfig('prod'); // Explicit environment selection
```

### Direct Imports (When Needed)

```typescript
import { ProdConfig, EnvironmentConfig } from '../lib/config';

const config: EnvironmentConfig = ProdConfig;
```

## 📐 Configuration Structure

### VPCConfig
Networking layer for EKS cluster.

```typescript
vpc: {
    cidr: '10.0.0.0/16',              // Network CIDR block
    maxAzs: 2,                        // Availability zones
    natGateways: 1,                   // NAT gateways (1 for dev, 3 for prod)
    enableVpcFlowLogs: boolean,       // Network monitoring
}
```

**Environment Differences:**
- **Dev**: 2 AZs, 1 NAT (cost optimization)
- **Staging**: 2 AZs, 2 NATs (HA)
- **Prod**: 3 AZs, 3 NATs (full HA across zones)

### EKSConfig
Kubernetes cluster settings and observability.

```typescript
eks: {
    version: '1.31',                           // K8s version
    clusterName: 'dev-eks-cluster',           // Resource naming
    instanceTypes: ['t3.medium'],             // EC2 instance types
    minNodes: 2,                              // Min autoscaling
    maxNodes: 6,                              // Max autoscaling
    desiredNodes: 3,                          // Desired count
    enableClusterLogging: true,               // CloudWatch integration
    logTypes: ['api', 'audit', ...],         // Control plane logs
    capacityType: 'ON_DEMAND',               // ON_DEMAND or SPOT
}
```

**Environment Differences:**
| Setting | Dev | Staging | Prod |
|---------|-----|---------|------|
| Instance Types | t3.medium | t3.medium/large | t3.large/xlarge |
| Min/Max Nodes | 2/6 | 3/10 | 6/20 |
| Capacity Type | ON_DEMAND | ON_DEMAND | ON_DEMAND |
| Control Plane Logs | All 5 | 3 essential | 3 essential |

### ArgoCDConfig
GitOps continuous deployment.

```typescript
argocd: {
    namespace: 'argocd',                    // K8s namespace
    chartVersion: '7.7.10',                 // Helm chart version
    enableIngress: true,                    // Expose UI
    ingressClass: 'alb',                    // AWS ALB controller
    serverInsecure: false,                  // TLS enforcement
}
```

**Security Note:** `serverInsecure: false` enforced in production by validation.

### S3Config
Artifact storage and backup.

```typescript
s3: {
    bucketNamePrefix: 'eks-artifacts',     // Bucket name prefix
    enableVersioning: true,                 // Version control
    lifecycleDays: 90,                      // Retention period
}
```

**Environment Differences:**
- **Dev**: 90 days (cost optimization)
- **Staging**: 180 days (test recovery scenarios)
- **Prod**: 365 days (compliance/archival)

### Tags
Resource labeling for cost allocation and governance.

```typescript
tags: {
    Environment: 'dev',                    // Environment tier
    Project: 'eks-cdk-argocd-showcase',   // Project name
    ManagedBy: 'cdk',                      // Infrastructure tool
    Owner: 'devops-team',                  // Responsible team
    CostCenter: 'engineering',             // (Prod only)
}
```

## ✅ Validation Rules

The `validateEnvironmentConfig()` function enforces:

- **EKS Nodes**: `minNodes ≤ desiredNodes ≤ maxNodes`
- **Instance Types**: At least one specified
- **VPC CIDR**: Valid CIDR notation (e.g., `10.0.0.0/16`)
- **AZs**: At least 1
- **S3 Lifecycle**: At least 1 day
- **Cluster Logging**: If enabled, must specify log types
- **Production Security**: ArgoCD TLS must be enabled in prod

Invalid configs throw errors **on import**, catching issues during development/testing.

## 🔧 Environment Selection Priority

The `getConfig()` function checks in order:

1. **Explicit parameter**: `getConfig('prod')`
2. **Environment variable**: `ENVIRONMENT=staging`
3. **Default**: Falls back to `dev`

```typescript
// All equivalent to dev
getConfig();
getConfig('dev');
process.env.ENVIRONMENT = 'dev'; getConfig();
```

## 📊 Quick Reference: Environment Tiers

| Aspect | Dev | Staging | Prod |
|--------|-----|---------|------|
| **Purpose** | Testing, debugging | Pre-release validation | Live workloads |
| **VPC AZs** | 2 | 2 | 3 |
| **NAT Gateways** | 1 | 2 | 3 |
| **EKS Nodes** | 2-6 (3 desired) | 3-10 (5 desired) | 6-20 (9 desired) |
| **Instance Types** | t3.medium | t3.medium/large | t3.large/xlarge |
| **Capacity Type** | ON_DEMAND | ON_DEMAND | ON_DEMAND |
| **ArgoCD TLS** | Disabled (ALB handles) | Disabled | Enabled |
| **VPC Flow Logs** | ✅ | ✅ | ✅ |
| **S3 Retention** | 90 days | 180 days | 365 days |
| **Cost Optimization** | Minimal footprint | HA-ready | Full HA + compliance |

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
deploy:
  strategy:
    matrix:
      environment: [dev, staging, prod]
  steps:
    - uses: actions/checkout@v3
    - run: npm install
    - run: |
        ENVIRONMENT=${{ matrix.environment }} \
        npx cdk deploy --require-approval never
```

This deploys the same code to all 3 environments without code duplication.

## 🔐 Security Best Practices

1. **Use environment variables** for sensitive data (account IDs, credentials)
2. **Validation catches misconfigurations** before deployment
3. **Production security enforced** (TLS, multiple AZs, larger instances)
4. **Tags enable cost tracking** and compliance auditing
5. **VPC Flow Logs** provide network troubleshooting

## 📝 Adding a New Environment

To add a `qa` environment:

1. **Create lib/config/qa.ts:**
```typescript
import { EnvironmentConfig, validateEnvironmentConfig } from './environment-config';

export const QaConfig: EnvironmentConfig = {
    envName: 'qa',
    // ... configuration ...
};

validateEnvironmentConfig(QaConfig);
```

2. **Update lib/config/index.ts:**
```typescript
import { QaConfig } from './qa';

export function getConfig(environment?: string): EnvironmentConfig {
    switch (env.toLowerCase()) {
        case 'qa':
            return QaConfig;
        // ... other cases ...
    }
}

export { /* ..., */ QaConfig };
```

3. **Deploy:**
```bash
ENVIRONMENT=qa npx cdk deploy
```

## 🎓 Design Patterns Used

- **Factory Pattern**: `getConfig()` creates environment-specific configs
- **Strategy Pattern**: Different configurations for different deployment scenarios
- **Validation Pattern**: Type-safe configs with runtime validation
- **Centralization**: Single source of truth for infrastructure settings

## 📚 Further Reading

- [AWS CDK Configuration Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best_practices.html)
- [TypeScript Interfaces](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [Environment Variables in Node.js](https://nodejs.org/en/knowledge/file-system/security/introduction/)
