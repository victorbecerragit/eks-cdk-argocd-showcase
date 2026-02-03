import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { Construct } from 'constructs';
import { ArgoCDConfig } from '../config/environment-config';

export interface ArgoCDConstructProps {
    cluster: eks.Cluster;
    config: ArgoCDConfig;
}

/**
 * ArgoCD Construct
 * 
 * Sets up the GitOps engine:
 * 1. Installs ArgoCD via Helm
 * 2. Configures ALB Ingress for external access
 * 3. Bootstraps the "App of Apps" pattern (Root Application)
 */
export class ArgoCDConstruct extends Construct {
    public readonly chart: eks.HelmChart;

    constructor(scope: Construct, id: string, props: ArgoCDConstructProps) {
        super(scope, id);

        const { cluster, config } = props;

        /**
         * 1. Install ArgoCD Helm Chart
         */
        this.chart = cluster.addHelmChart('ArgoCD', {
            chart: 'argo-cd',
            repository: 'https://argoproj.github.io/argo-helm',
            namespace: config.namespace,
            release: 'argo-cd',
            version: config.chartVersion,
            // Wait for resources to be ready
            wait: true,
            timeout: cdk.Duration.minutes(15),
            values: {
                // Server Configuration
                server: {
                    extraArgs: config.serverInsecure ? ['--insecure'] : [],
                    ingress: {
                        enabled: config.enableIngress,
                        ingressClassName: config.ingressClass, // 'alb'
                        annotations: config.enableIngress ? {
                            'alb.ingress.kubernetes.io/scheme': 'internet-facing',
                            'alb.ingress.kubernetes.io/target-type': 'ip',
                            'alb.ingress.kubernetes.io/group.name': 'argocd',
                            'alb.ingress.kubernetes.io/healthcheck-path': '/',
                            'alb.ingress.kubernetes.io/success-codes': '200-399',
                            // Note: Real ACM cert required for HTTPS
                            // 'alb.ingress.kubernetes.io/listen-ports': '[{"HTTP": 80}, {"HTTPS": 443}]',
                            // 'alb.ingress.kubernetes.io/ssl-redirect': '443',
                        } : {},
                    },
                    service: {
                        type: config.enableIngress ? 'NodePort' : 'ClusterIP',
                    }
                },
                // Disable DEX if not using SSO (optional, keeps it lighter)
                dex: { enabled: false },
                // Redis HA (High Availability) settings would go here for prod
                redis: { enabled: true },
            }
        });

        /**
         * 2. Bootstrap "App of Apps"
         * Applies the root application manifest that watches the Git repository.
         * This kicks off the GitOps loop.
         */
        const appOfAppsPath = path.join(__dirname, '../../gitops/argocd/app-of-apps.yaml');
        
        if (fs.existsSync(appOfAppsPath)) {
            // Read and parse the manifest
            const manifestString = fs.readFileSync(appOfAppsPath, 'utf8');
            const manifest = yaml.loadAll(manifestString) as Record<string, any>[];

            // Apply to cluster
            const appOfApps = cluster.addManifest('AppOfApps', ...manifest);
            
            // Ensure ArgoCD is installed first
            appOfApps.node.addDependency(this.chart);
        } else {
            console.warn(`⚠️  App-of-apps manifest not found at ${appOfAppsPath}. Skipping bootstrap.`);
        }
    }
}

