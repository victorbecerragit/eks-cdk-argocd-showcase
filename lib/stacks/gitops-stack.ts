import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import { ArgoCDConfig } from '../config/environment-config';
import { ArgoCDConstruct } from '../constructs/argocd-construct';

interface GitOpsStackProps extends cdk.StackProps {
    cluster: eks.Cluster;
    argocdConfig: ArgoCDConfig;
}

export class GitOpsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: GitOpsStackProps) {
        super(scope, id, props);

        new ArgoCDConstruct(this, 'ArgoCDConstruct', {
            cluster: props.cluster,
            config: props.argocdConfig,
        });

        // Future: Bootstrap app-of-apps or other GitOps configurations
    }
}
