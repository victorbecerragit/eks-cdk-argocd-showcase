import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment-config';
import { ArgoCDConstruct } from '../constructs/argocd-construct';

export interface GitOpsStackProps extends cdk.StackProps {
    cluster: eks.Cluster;
    config: EnvironmentConfig;
}

/**
 * GitOps Stack
 * 
 * Deploys the Continuous Delivery layer:
 * - ArgoCD (GitOps Engine)
 * - Initial Application Bootstrap (App of Apps)
 */
export class GitOpsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: GitOpsStackProps) {
        super(scope, id, props);

        const { cluster, config } = props;

        new ArgoCDConstruct(this, 'ArgoCDConstruct', {
            cluster: cluster,
            config: config.argocd,
        });

        // Add additional GitOps related resources here if needed in future
        // e.g. External Secrets Operator, Crossplane, etc.
    }
}

