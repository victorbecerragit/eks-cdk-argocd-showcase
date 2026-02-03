import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';

export interface AlbControllerConstructProps {
    cluster: eks.Cluster;
}

export class AlbControllerConstruct extends Construct {
    constructor(scope: Construct, id: string, props: AlbControllerConstructProps) {
        super(scope, id);

        // TODO: Implement AWS Load Balancer Controller installation
        // 1. Create IRSA (IAM Role for Service Account)
        // 2. Install Helm Chart for AWS Load Balancer Controller

        /*
        const serviceAccount = props.cluster.addServiceAccount('aws-load-balancer-controller', {
            name: 'aws-load-balancer-controller',
            namespace: 'kube-system',
        });
        
        // Add policies to serviceAccount...

        props.cluster.addHelmChart('AwsLoadBalancerController', {
            chart: 'aws-load-balancer-controller',
            repository: 'https://aws.github.io/eks-charts',
            namespace: 'kube-system',
            release: 'aws-load-balancer-controller',
            values: {
                 clusterName: props.cluster.clusterName,
                 serviceAccount: {
                     create: false,
                     name: 'aws-load-balancer-controller',
                 },
                 region: props.cluster.stack.region,
                 vpcId: props.cluster.vpc.vpcId,
            },
        });
        */
    }
}
