/**
 * Configuration Module Index
 * 
 * This module provides a centralized way to load environment-specific configurations.
 * It abstracts the complexity of configuration management and enables single-point imports.
 */

import { EnvironmentConfig } from './environment-config';
import { DevConfig } from './dev';
import { StagingConfig } from './staging';
import { ProdConfig } from './prod';

/**
 * Retrieves the configuration for a specified environment.
 * 
 * Priority:
 * 1. Explicit environment parameter
 * 2. ENVIRONMENT environment variable
 * 3. Defaults to 'dev'
 * 
 * @param environment - Optional environment name ('dev', 'staging', 'prod')
 * @returns EnvironmentConfig object for the specified environment
 * @throws Console warning if unknown environment provided (defaults to dev)
 * 
 * @example
 * // From environment variable
 * const config = getConfig(); // Uses process.env.ENVIRONMENT
 * 
 * // Explicit parameter
 * const prodConfig = getConfig('prod');
 * 
 * // In CDK app
 * const config = getConfig(process.env.CDK_ENV);
 */
export function getConfig(environment?: string): EnvironmentConfig {
    const env = environment || process.env.ENVIRONMENT || 'dev';

    switch (env.toLowerCase()) {
        case 'dev':
        case 'development':
            return DevConfig;
        case 'staging':
        case 'stage':
            return StagingConfig;
        case 'prod':
        case 'production':
            return ProdConfig;
        default:
            console.warn(`⚠️  Unknown environment: ${env}. Defaulting to dev.`);
            return DevConfig;
    }
}

/**
 * Export all configurations and types for direct imports
 * Allows flexibility: import { getConfig } or import { ProdConfig }
 */
export { EnvironmentConfig, DevConfig, StagingConfig, ProdConfig };
