import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment-config';

/**
 * Network Stack Props
 * Uses the full EnvironmentConfig for access to all settings
 */
interface NetworkStackProps extends cdk.StackProps {
    config: EnvironmentConfig;
}

/**
 * Network Stack
 * 
 * Creates the foundational network infrastructure for EKS:
 * - VPC with public/private subnets across multiple AZs
 * - NAT Gateways for private subnet internet access
 * - VPC Flow Logs for network monitoring and troubleshooting
 * - VPC Endpoints for AWS services (cost optimization + security)
 * - Proper tagging for EKS auto-discovery
 */
export class NetworkStack extends cdk.Stack {
    public readonly vpc: ec2.IVpc;
    public readonly flowLogGroup: logs.ILogGroup;

    constructor(scope: Construct, id: string, props: NetworkStackProps) {
        super(scope, id, props);

        const { config } = props;
        const vpcConfig = config.vpc;

        /**
         * VPC Creation
         * 
         * Subnets:
         * - Public: Load balancers, NAT Gateways, bastion hosts
         * - Private: EKS nodes, application workloads
         * - Isolated: Databases, sensitive workloads (no internet access)
         */
        const vpc = new ec2.Vpc(this, 'Vpc', {
            vpcName: `${config.eks.clusterName}-vpc`,
            ipAddresses: ec2.IpAddresses.cidr(vpcConfig.cidr),
            maxAzs: vpcConfig.maxAzs,
            natGateways: vpcConfig.natGateways,

            // Subnet configuration optimized for EKS
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    // Public subnets for ALB/NLB
                },
                {
                    cidrMask: 22, // /22 = 1024 IPs per subnet (for EKS nodes)
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    // Private subnets for EKS nodes
                },
                {
                    cidrMask: 24,
                    name: 'Isolated',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    // Isolated subnets for databases/sensitive workloads
                },
            ],

            // Enable DNS support for EKS
            enableDnsHostnames: true,
            enableDnsSupport: true,
        });

        this.vpc = vpc;

        /**
         * EKS Subnet Tagging
         * 
         * Required tags for EKS to auto-discover subnets:
         * - kubernetes.io/cluster/{cluster-name}: owned/shared
         * - kubernetes.io/role/elb: 1 (public subnets for internet-facing LBs)
         * - kubernetes.io/role/internal-elb: 1 (private subnets for internal LBs)
         */
        const clusterName = config.eks.clusterName;

        // Tag public subnets for internet-facing load balancers
        vpc.publicSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add(`kubernetes.io/cluster/${clusterName}`, 'shared');
            cdk.Tags.of(subnet).add('kubernetes.io/role/elb', '1');
            cdk.Tags.of(subnet).add('Name', `${clusterName}-public-${index + 1}`);
        });

        // Tag private subnets for internal load balancers and EKS nodes
        vpc.privateSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add(`kubernetes.io/cluster/${clusterName}`, 'shared');
            cdk.Tags.of(subnet).add('kubernetes.io/role/internal-elb', '1');
            cdk.Tags.of(subnet).add('Name', `${clusterName}-private-${index + 1}`);
        });

        // Tag isolated subnets
        vpc.isolatedSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Name', `${clusterName}-isolated-${index + 1}`);
        });

        /**
         * VPC Flow Logs
         * 
         * Captures network traffic for:
         * - Security analysis and forensics
         * - Troubleshooting connectivity issues
         * - Compliance requirements
         */
        if (vpcConfig.enableVpcFlowLogs) {
            // CloudWatch Log Group for Flow Logs
            const flowLogGroup = new logs.LogGroup(this, 'VpcFlowLogGroup', {
                logGroupName: `/aws/vpc/${clusterName}-flow-logs`,
                retention: config.envName === 'prod'
                    ? logs.RetentionDays.ONE_YEAR
                    : logs.RetentionDays.ONE_MONTH,
                removalPolicy: config.envName === 'prod'
                    ? cdk.RemovalPolicy.RETAIN
                    : cdk.RemovalPolicy.DESTROY,
            });

            this.flowLogGroup = flowLogGroup;

            // IAM Role for Flow Logs
            const flowLogRole = new iam.Role(this, 'VpcFlowLogRole', {
                roleName: `${clusterName}-vpc-flow-log-role`,
                assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
            });

            flowLogGroup.grantWrite(flowLogRole);

            // Create VPC Flow Log
            new ec2.FlowLog(this, 'VpcFlowLog', {
                resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
                destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup, flowLogRole),
                trafficType: ec2.FlowLogTrafficType.ALL,
            });
        }

        /**
         * VPC Endpoints
         * 
         * Benefits:
         * - Cost optimization: No NAT Gateway charges for AWS service traffic
         * - Security: Traffic stays within AWS network
         * - Performance: Lower latency to AWS services
         */
        this.createVpcEndpoints(vpc, clusterName);

        /**
         * Stack Outputs
         * Export values for cross-stack references
         */
        new cdk.CfnOutput(this, 'VpcId', {
            value: vpc.vpcId,
            description: 'VPC ID',
            exportName: `${clusterName}-VpcId`,
        });

        new cdk.CfnOutput(this, 'VpcCidr', {
            value: vpc.vpcCidrBlock,
            description: 'VPC CIDR Block',
            exportName: `${clusterName}-VpcCidr`,
        });

        new cdk.CfnOutput(this, 'PublicSubnetIds', {
            value: vpc.publicSubnets.map(s => s.subnetId).join(','),
            description: 'Public Subnet IDs',
            exportName: `${clusterName}-PublicSubnetIds`,
        });

        new cdk.CfnOutput(this, 'PrivateSubnetIds', {
            value: vpc.privateSubnets.map(s => s.subnetId).join(','),
            description: 'Private Subnet IDs',
            exportName: `${clusterName}-PrivateSubnetIds`,
        });

        new cdk.CfnOutput(this, 'AvailabilityZones', {
            value: vpc.availabilityZones.join(','),
            description: 'Availability Zones',
            exportName: `${clusterName}-AvailabilityZones`,
        });
    }

    /**
     * Creates VPC Endpoints for AWS services
     * 
     * Gateway Endpoints (free):
     * - S3: Container images, logs, artifacts
     * - DynamoDB: State storage
     * 
     * Interface Endpoints (cost):
     * - ECR: Container registry (api + dkr)
     * - CloudWatch: Logs and metrics
     * - STS: IAM role assumption
     * - EC2: Instance metadata
     */
    private createVpcEndpoints(vpc: ec2.Vpc, clusterName: string): void {
        // Security group for Interface Endpoints
        const endpointSecurityGroup = new ec2.SecurityGroup(this, 'VpcEndpointSG', {
            vpc,
            securityGroupName: `${clusterName}-vpc-endpoints-sg`,
            description: 'Security group for VPC Interface Endpoints',
            allowAllOutbound: true,
        });

        // Allow HTTPS from within VPC
        endpointSecurityGroup.addIngressRule(
            ec2.Peer.ipv4(vpc.vpcCidrBlock),
            ec2.Port.tcp(443),
            'Allow HTTPS from VPC'
        );

        /**
         * Gateway Endpoints (FREE - no hourly charge)
         */

        // S3 Gateway Endpoint
        vpc.addGatewayEndpoint('S3Endpoint', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
        });

        // DynamoDB Gateway Endpoint
        vpc.addGatewayEndpoint('DynamoDbEndpoint', {
            service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
            subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
        });

        /**
         * Interface Endpoints (charged per hour + data processed)
         * Essential for EKS to function without NAT for AWS API calls
         */

        // ECR API Endpoint (for image metadata)
        vpc.addInterfaceEndpoint('EcrApiEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR,
            securityGroups: [endpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            privateDnsEnabled: true,
        });

        // ECR Docker Endpoint (for image layers)
        vpc.addInterfaceEndpoint('EcrDkrEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
            securityGroups: [endpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            privateDnsEnabled: true,
        });

        // CloudWatch Logs Endpoint
        vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            securityGroups: [endpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            privateDnsEnabled: true,
        });

        // STS Endpoint (for IRSA - IAM Roles for Service Accounts)
        vpc.addInterfaceEndpoint('StsEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.STS,
            securityGroups: [endpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            privateDnsEnabled: true,
        });

        // EC2 Endpoint (for node lifecycle)
        vpc.addInterfaceEndpoint('Ec2Endpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.EC2,
            securityGroups: [endpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            privateDnsEnabled: true,
        });

        // SSM Endpoint (for Systems Manager access to nodes)
        vpc.addInterfaceEndpoint('SsmEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.SSM,
            securityGroups: [endpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            privateDnsEnabled: true,
        });

        // SSM Messages Endpoint (for Session Manager)
        vpc.addInterfaceEndpoint('SsmMessagesEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
            securityGroups: [endpointSecurityGroup],
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            privateDnsEnabled: true,
        });
    }
}
