import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { EKSConfig } from '../config/environment-config';

export interface EksClusterConstructProps {
    vpc: ec2.IVpc;
    config: EKSConfig;
}

/**
 * EKS Cluster Construct
 * 
 * Creates a production-ready EKS cluster with:
 * - Managed Node Groups (Auto-scaling)
 * - Control Plane Logging (CloudWatch)
 * - OIDC Provider (for IRSA)
 * - Secure communication channels
 */
export class EksClusterConstruct extends Construct {
    public readonly cluster: eks.Cluster;
    public readonly adminRole: iam.Role;

    constructor(scope: Construct, id: string, props: EksClusterConstructProps) {
        super(scope, id);

        const { vpc, config } = props;

        // 1. Create Cluster Admin Role
        // This role will be mapped to system:masters
        this.adminRole = new iam.Role(this, 'ClusterAdminRole', {
            assumedBy: new iam.AccountRootPrincipal(),
            roleName: `${config.clusterName}-admin-role`,
            description: 'EKS Cluster Administrator Role',
        });

        // 2. Create EKS Cluster
        this.cluster = new eks.Cluster(this, 'Cluster', {
            clusterName: config.clusterName,
            vpc: vpc,
            vpcSubnets: [
                // Control plane ENIs placed in private subnets
                { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
            ],
            defaultCapacity: 0, // We will use Managed Node Groups instead
            version: eks.KubernetesVersion.of(config.version),
            
            // Security settings
            endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE, // Best practice for GitOps + Dev access
            
            // Logging
            clusterLogging: config.enableClusterLogging ? [
                eks.ClusterLoggingTypes.API,
                eks.ClusterLoggingTypes.AUDIT,
                eks.ClusterLoggingTypes.AUTHENTICATOR,
                eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
                eks.ClusterLoggingTypes.SCHEDULER,
            ] : [],

            // Access Management
            mastersRole: this.adminRole,
            
            // KubectlLayer: Required for EKS cluster to manage kubectl
            // For production, use the official @aws-cdk/lambda-layer-kubectl package
            kubectlLayer: new lambda.LayerVersion(this, 'KubectlLayer', {
                code: lambda.Code.fromAsset(`${__dirname}/../../assets/kubectl-layer`),
                compatibleRuntimes: [
                    lambda.Runtime.PYTHON_3_9,
                    lambda.Runtime.PYTHON_3_10,
                    lambda.Runtime.PYTHON_3_11,
                    lambda.Runtime.PYTHON_3_12,
                    lambda.Runtime.PYTHON_3_13,
                ],
                description: 'Kubectl layer for EKS cluster management',
            }),
        });

        // 3. Add Managed Node Group
        // Creates the worker nodes for the cluster
        this.cluster.addNodegroupCapacity('DefaultNodeGroup', {
            nodegroupName: `${config.clusterName}-default-ng`,
            
            // Scaling configuration
            minSize: config.minNodes,
            maxSize: config.maxNodes,
            desiredSize: config.desiredNodes,
            
            // Compute configuration
            instanceTypes: config.instanceTypes.map(t => new ec2.InstanceType(t)),
            capacityType: config.capacityType === 'SPOT' 
                ? eks.CapacityType.SPOT 
                : eks.CapacityType.ON_DEMAND,
            
            // Networking: Place nodes in private subnets
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            
            // AMI Type (AL2_x86_64 is standard, use AL2023 or BOTTLEROCKET for newer)
            amiType: eks.NodegroupAmiType.AL2_X86_64,
            
            // Labels and Taints for scheduling
            labels: {
                role: 'worker',
                lifecycle: config.capacityType || 'ON_DEMAND',
            },
        });

        // 4. Output Cluster Config
        new cdk.CfnOutput(this, 'ClusterName', {
            value: this.cluster.clusterName,
            description: 'EKS Cluster Name',
            exportName: `${config.clusterName}-ClusterName`,
        });

        new cdk.CfnOutput(this, 'ClusterEndpoint', {
            value: this.cluster.clusterEndpoint,
            description: 'EKS Cluster Endpoint',
            exportName: `${config.clusterName}-ClusterEndpoint`,
        });
        
        new cdk.CfnOutput(this, 'ClusterAdminRoleArn', {
            value: this.adminRole.roleArn,
            description: 'ARN of the EKS Cluster Admin Role',
            exportName: `${config.clusterName}-AdminRoleArn`,
        });
    }
}

