/**
 * Configuration Management for RestifiedTS
 * 
 * This module provides centralized configuration management with support for:
 * - Environment-based configuration
 * - File-based configuration loading
 * - Runtime configuration updates
 * - Configuration validation
 * - Default configuration values
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { merge } from 'lodash';
import { RestifiedConfig, ConfigurationError } from '../../types/RestifiedTypes';

export class Config {
  private config: RestifiedConfig;
  private readonly defaultConfig: RestifiedConfig;

  constructor(userConfig?: Partial<RestifiedConfig>) {
    this.defaultConfig = this.getDefaultConfig();
    this.config = merge({}, this.defaultConfig, userConfig || {});
    this.validateConfig();
  }

  /**
   * Get the complete configuration object
   */
  getConfig(): Readonly<RestifiedConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Get a specific configuration value using dot notation
   */
  get<T = any>(key: string, defaultValue?: T): T {
    const keys = key.split('.');
    let current: any = this.config;

    for (const k of keys) {
      if (current === null || current === undefined || !(k in current)) {
        return defaultValue as T;
      }
      current = current[k];
    }

    return current as T;
  }

  /**
   * Set a configuration value using dot notation
   */
  set(key: string, value: any): void {
    const keys = key.split('.');
    let current: any = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
    this.validateConfig();
  }

  /**
   * Update configuration with partial config object
   */
  update(updates: Partial<RestifiedConfig>): void {
    this.config = merge(this.config, updates);
    this.validateConfig();
  }

  /**
   * Load configuration from file
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileConfig = JSON.parse(content);
      this.update(fileConfig);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(`Failed to load configuration from ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(): void {
    const envConfig: Partial<RestifiedConfig> = {};

    // Base configuration
    if (process.env.RESTIFIED_BASE_URL) {
      envConfig.baseURL = process.env.RESTIFIED_BASE_URL;
    }

    if (process.env.RESTIFIED_TIMEOUT) {
      envConfig.timeout = parseInt(process.env.RESTIFIED_TIMEOUT, 10);
    }

    if (process.env.RESTIFIED_ENVIRONMENT) {
      envConfig.environment = process.env.RESTIFIED_ENVIRONMENT;
    }

    // Logging configuration
    if (process.env.RESTIFIED_LOG_LEVEL) {
      envConfig.logging = {
        ...envConfig.logging,
        level: process.env.RESTIFIED_LOG_LEVEL as any
      };
    }

    // Authentication configuration
    if (process.env.RESTIFIED_AUTH_TYPE) {
      envConfig.auth = {
        ...envConfig.auth,
        type: process.env.RESTIFIED_AUTH_TYPE as any
      };
    }

    if (process.env.RESTIFIED_AUTH_TOKEN) {
      envConfig.auth = {
        type: 'bearer',
        ...envConfig.auth,
        token: process.env.RESTIFIED_AUTH_TOKEN
      };
    }

    // Proxy configuration
    if (process.env.RESTIFIED_PROXY_HOST) {
      envConfig.proxy = {
        ...envConfig.proxy,
        host: process.env.RESTIFIED_PROXY_HOST,
        port: parseInt(process.env.RESTIFIED_PROXY_PORT || '8080', 10)
      };
    }

    // SSL configuration
    if (process.env.RESTIFIED_SSL_REJECT_UNAUTHORIZED) {
      envConfig.ssl = {
        ...envConfig.ssl,
        rejectUnauthorized: process.env.RESTIFIED_SSL_REJECT_UNAUTHORIZED === 'true'
      };
    }

    this.update(envConfig);
  }

  /**
   * Save current configuration to file
   */
  async saveToFile(filePath: string): Promise<void> {
    try {
      const content = JSON.stringify(this.config, null, 2);
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigurationError(`Failed to save configuration to ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = { ...this.defaultConfig };
  }

  /**
   * Merge with another configuration
   */
  merge(otherConfig: Partial<RestifiedConfig>): void {
    this.config = merge(this.config, otherConfig);
    this.validateConfig();
  }

  /**
   * Clone current configuration
   */
  clone(): Config {
    return new Config(this.config);
  }

  /**
   * Get configuration for specific environment
   */
  async loadEnvironmentConfig(environment: string, configDir: string = './config'): Promise<void> {
    const configFiles = [
      join(configDir, 'default.json'),
      join(configDir, `${environment}.json`)
    ];

    for (const configFile of configFiles) {
      try {
        await this.loadFromFile(configFile);
      } catch (error) {
        // Ignore file not found errors for optional configs
        const err = error as any;
        if (err.code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // Validate timeout
    if (this.config.timeout !== undefined && this.config.timeout < 0) {
      errors.push('Timeout must be a positive number');
    }

    // Validate retry configuration
    if (this.config.retry) {
      if (this.config.retry.retries !== undefined && this.config.retry.retries < 0) {
        errors.push('Retry count must be a non-negative number');
      }
      if (this.config.retry.retryDelay !== undefined && this.config.retry.retryDelay < 0) {
        errors.push('Retry delay must be a non-negative number');
      }
    }

    // Validate proxy configuration
    if (this.config.proxy) {
      if (!this.config.proxy.host) {
        errors.push('Proxy host is required when proxy is configured');
      }
      if (!this.config.proxy.port || this.config.proxy.port <= 0 || this.config.proxy.port > 65535) {
        errors.push('Proxy port must be a valid port number (1-65535)');
      }
    }

    // Validate logging configuration
    if (this.config.logging) {
      const validLevels = ['debug', 'info', 'warn', 'error', 'silent'];
      if (this.config.logging.level && !validLevels.includes(this.config.logging.level)) {
        errors.push(`Invalid log level: ${this.config.logging.level}. Must be one of: ${validLevels.join(', ')}`);
      }
    }

    // Validate authentication configuration
    if (this.config.auth) {
      const validAuthTypes = ['basic', 'bearer', 'oauth2', 'apikey', 'custom'];
      if (!this.config.auth.type || !validAuthTypes.includes(this.config.auth.type)) {
        errors.push(`Invalid auth type: ${this.config.auth.type}. Must be one of: ${validAuthTypes.join(', ')}`);
      }

      if (this.config.auth.type === 'basic' && (!this.config.auth.username || !this.config.auth.password)) {
        errors.push('Basic auth requires username and password');
      }

      if (this.config.auth.type === 'bearer' && !this.config.auth.token) {
        errors.push('Bearer auth requires token');
      }

      if (this.config.auth.type === 'apikey' && !this.config.auth.apiKey) {
        errors.push('API key auth requires apiKey');
      }
    }

    if (errors.length > 0) {
      throw new ConfigurationError(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): RestifiedConfig {
    return {
      // Base configuration
      timeout: 30000,
      maxRedirects: 5,
      followRedirects: true,
      userAgent: 'RestifiedTS/1.0.0',
      
      // Headers
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      
      // Retry configuration
      retry: {
        retries: 3,
        retryDelay: 1000,
        retryOnStatusCodes: [500, 502, 503, 504, 408, 429]
      },
      
      // Logging configuration
      logging: {
        level: 'info',
        format: 'text',
        includeHeaders: true,
        includeBody: true,
        maxBodyLength: 1024 * 10 // 10KB
      },
      
      // Storage configuration
      storage: {
        maxResponses: 100,
        maxVariables: 1000,
        maxSnapshots: 50,
        persistOnDisk: false,
        storageDir: './restified-storage'
      },
      
      // Snapshot configuration
      snapshots: {
        enabled: true,
        directory: './snapshots',
        updateOnMismatch: false,
        ignoreFields: []
      },
      
      // Performance configuration
      performance: {
        trackMetrics: true,
        slowThreshold: 1000,
        enableProfiling: false
      },
      
      // Validation configuration
      validation: {
        strictMode: false,
        validateResponseSchema: false,
        validateRequestSchema: false
      },
      
      // SSL configuration
      ssl: {
        rejectUnauthorized: true
      },
      
      // WebSocket configuration
      websocket: {
        timeout: 30000,
        pingInterval: 30000,
        maxReconnectAttempts: 3
      },
      
      // GraphQL configuration
      graphql: {
        introspection: false
      },
      
      // Plugin configuration
      plugins: {
        enabled: [],
        disabled: []
      },
      
      // Environment
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

/**
 * Configuration loader utility
 */
export class ConfigLoader {
  /**
   * Load configuration from multiple sources with precedence
   */
  static async load(options: {
    defaultConfig?: Partial<RestifiedConfig>;
    configFile?: string;
    environment?: string;
    configDir?: string;
    environmentVariables?: boolean;
  } = {}): Promise<Config> {
    const config = new Config(options.defaultConfig);
    
    // Load from config file
    if (options.configFile) {
      await config.loadFromFile(options.configFile);
    }
    
    // Load environment-specific config
    if (options.environment && options.configDir) {
      await config.loadEnvironmentConfig(options.environment, options.configDir);
    }
    
    // Load from environment variables
    if (options.environmentVariables !== false) {
      config.loadFromEnvironment();
    }
    
    return config;
  }
}

/**
 * Configuration validator
 */
export class ConfigValidator {
  /**
   * Validate configuration against schema
   */
  static validate(config: RestifiedConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Add comprehensive validation logic here
    // This is a placeholder for more sophisticated validation
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default Config;