import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/stacks/network-stack';
import { EksStack } from '../lib/stacks/eks-stack';
import { StorageStack } from '../lib/stacks/storage-stack';
import { GitOpsStack } from '../lib/stacks/gitops-stack';
import { DevConfig } from '../lib/config/dev';

const app = new cdk.App();

// In a real scenario, you might select config based on context or env var
const config = DevConfig;

const networkStack = new NetworkStack(app, `NetworkStack-${config.envName}`, {
    env: { account: config.account, region: config.region },
    vpcConfig: config.vpc,
});

const storageStack = new StorageStack(app, `StorageStack-${config.envName}`, {
    env: { account: config.account, region: config.region },
});

const eksStack = new EksStack(app, `EksStack-${config.envName}`, {
    env: { account: config.account, region: config.region },
    vpc: networkStack.vpc,
    eksConfig: config.eks,
});

new GitOpsStack(app, `GitOpsStack-${config.envName}`, {
    env: { account: config.account, region: config.region },
    cluster: eksStack.cluster,
    argocdConfig: config.argocd,
});

cdk.Tags.of(app).add('Project', 'eks-cdk-argocd-showcase');
cdk.Tags.of(app).add('Environment', config.envName);
