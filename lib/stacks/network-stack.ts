import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VPCConfig } from '../config/environment-config';

interface NetworkStackProps extends cdk.StackProps {
    vpcConfig: VPCConfig;
}

export class NetworkStack extends cdk.Stack {
    public readonly vpc: ec2.IVpc;

    constructor(scope: Construct, id: string, props: NetworkStackProps) {
        super(scope, id, props);

        // TODO: Implement VPC creation
        /*
        this.vpc = new ec2.Vpc(this, 'Vpc', {
            ipAddresses: ec2.IpAddresses.cidr(props.vpcConfig.cidr),
            maxAzs: props.vpcConfig.maxAzs,
            natGateways: props.vpcConfig.natGateways,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                }
            ]
        });
        */

        // Placeholder
        this.vpc = {} as ec2.IVpc;
    }
}
