import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AlbControllerProps {
    cluster: eks.Cluster;
    vpcId: string;
    region: string;
}

/**
 * AWS Load Balancer Controller Construct
 * 
 * Installs the AWS Load Balancer Controller to manage ALBs and NLBs for the EKS cluster.
 * 
 * Features:
 * - Creates IRSA (IAM Role for Service Account) with required permissions
 * - Installs the Helm chart
 * - Configures the controller with cluster name and VPC ID
 */
export class AlbControllerConstruct extends Construct {
    constructor(scope: Construct, id: string, props: AlbControllerProps) {
        super(scope, id);

        const { cluster, vpcId, region } = props;

        /**
         * 1. Create IAM Role for Service Account (IRSA)
         * This allows the controller pod to assume an IAM role with permissions to manage ELBs.
         */
        const albServiceAccount = cluster.addServiceAccount('aws-load-balancer-controller', {
            name: 'aws-load-balancer-controller',
            namespace: 'kube-system',
        });

        // Add the required policy statements for the AWS Load Balancer Controller
        // These permissions allow the controller to describe and manage ELBs, Target Groups, Security Groups, etc.
        // This is a minimal set of permissions required. For production, consider using the managed policy if available or fetching the latest JSON.
        
        const lbPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'iam:CreateServiceLinkedRole',
                'ec2:DescribeAccountAttributes',
                'ec2:DescribeAddresses',
                'ec2:DescribeAvailabilityZones',
                'ec2:DescribeInternetGateways',
                'ec2:DescribeVpcs',
                'ec2:DescribeSubnets',
                'ec2:DescribeSecurityGroups',
                'ec2:DescribeInstances',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DescribeTags',
                'ec2:GetCoipPoolUsage',
                'ec2:DescribeCoipPools',
                'elasticloadbalancing:DescribeLoadBalancers',
                'elasticloadbalancing:DescribeLoadBalancerAttributes',
                'elasticloadbalancing:DescribeListeners',
                'elasticloadbalancing:DescribeListenerCertificates',
                'elasticloadbalancing:DescribeSSLPolicies',
                'elasticloadbalancing:DescribeRules',
                'elasticloadbalancing:DescribeTargetGroups',
                'elasticloadbalancing:DescribeTargetGroupAttributes',
                'elasticloadbalancing:DescribeTargetHealth',
                'elasticloadbalancing:DescribeTags',
                // Management actions
                'elasticloadbalancing:CreateLoadBalancer',
                'elasticloadbalancing:DeleteLoadBalancer',
                'elasticloadbalancing:ModifyLoadBalancerAttributes',
                'elasticloadbalancing:CreateListener',
                'elasticloadbalancing:DeleteListener',
                'elasticloadbalancing:CreateRule',
                'elasticloadbalancing:DeleteRule',
                'elasticloadbalancing:CreateTargetGroup',
                'elasticloadbalancing:DeleteTargetGroup',
                'elasticloadbalancing:ModifyTargetGroup',
                'elasticloadbalancing:ModifyTargetGroupAttributes',
                'elasticloadbalancing:RegisterTargets',
                'elasticloadbalancing:DeregisterTargets',
                'elasticloadbalancing:SetWebAcl',
                'elasticloadbalancing:ModifyListener',
                'elasticloadbalancing:AddListenerCertificates',
                'elasticloadbalancing:RemoveListenerCertificates',
                'elasticloadbalancing:SetIpAddressType',
                'elasticloadbalancing:SetSecurityGroups',
                'elasticloadbalancing:SetSubnets',
                'elasticloadbalancing:DeleteSharedTrustStoreAssociation',
                'elasticloadbalancing:CreateSharedTrustStoreAssociation',
                'elasticloadbalancing:ExplainTargetHealth',
                // Tags
                'elasticloadbalancing:AddTags',
                'elasticloadbalancing:RemoveTags',
                'ec2:CreateTags',
                'ec2:DeleteTags',
                // Security Groups
                'ec2:AuthorizeSecurityGroupIngress',
                'ec2:RevokeSecurityGroupIngress',
                'ec2:CreateSecurityGroup',
                'ec2:DeleteSecurityGroup',
                // WAF
                'waf-regional:GetWebACLForResource',
                'waf-regional:GetWebACL',
                'waf-regional:AssociateWebACL',
                'waf-regional:DisassociateWebACL',
                'wafv2:GetWebACLForResource',
                'wafv2:GetWebACL',
                'wafv2:AssociateWebACL',
                'wafv2:DisassociateWebACL',
                'shield:GetSubscriptionState',
                'shield:DescribeProtection',
                'shield:CreateProtection',
                'shield:DeleteProtection',
                // ACM
                'acm:DescribeCertificate',
                'acm:ListCertificates',
                'acm:GetCertificate',
                // Cognitio
                'cognito-idp:DescribeUserPoolClient'
            ],
            resources: ['*'],
        });

        albServiceAccount.addToPrincipalPolicy(lbPolicy);


        /**
         * 2. Install AWS Load Balancer Controller Helm Chart
         */
        const albControllerChart = new eks.HelmChart(this, 'ALBControllerChart', {
            cluster,
            chart: 'aws-load-balancer-controller',
            repository: 'https://aws.github.io/eks-charts',
            namespace: 'kube-system',
            release: 'aws-load-balancer-controller',
            version: '1.7.1', // Use a pinned stable version
            values: {
                clusterName: cluster.clusterName,
                region: region,
                vpcId: vpcId,
                serviceAccount: {
                    create: false, // We created it above via CDK
                    name: albServiceAccount.serviceAccountName,
                },
                // Default ingress class config
                enableShield: false,
                enableWaf: false,
                enableWafv2: false,
            },
        });
        
        // Ensure the service account is created before the helm chart is installed
        albControllerChart.node.addDependency(albServiceAccount);
    }
}

