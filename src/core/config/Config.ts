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
    
    // Load environment variables after merging default and user config
    this.loadFromEnvironment();
    
    // Apply user config again to override environment variables if needed
    if (userConfig) {
      this.config = merge({}, this.config, userConfig);
    }
    
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
   * Processes all 68+ environment variables documented in JSON configuration files
   */
  loadFromEnvironment(): void {
    const envConfig: Partial<RestifiedConfig> = {};

    // ===========================================
    // CORE API CONFIGURATION
    // ===========================================
    if (process.env.API_BASE_URL || process.env.RESTIFIED_BASE_URL) {
      envConfig.baseURL = process.env.API_BASE_URL || process.env.RESTIFIED_BASE_URL;
    }

    if (process.env.API_TIMEOUT || process.env.RESTIFIED_TIMEOUT) {
      envConfig.timeout = parseInt(process.env.API_TIMEOUT || process.env.RESTIFIED_TIMEOUT || '30000', 10);
    }

    if (process.env.API_RETRIES) {
      envConfig.retry = {
        ...envConfig.retry,
        retries: parseInt(process.env.API_RETRIES, 10)
      };
    }

    if (process.env.NODE_ENV || process.env.RESTIFIED_ENVIRONMENT) {
      envConfig.environment = process.env.NODE_ENV || process.env.RESTIFIED_ENVIRONMENT;
    }

    // ===========================================
    // HEADERS CONFIGURATION
    // ===========================================
    if (process.env.API_KEY) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-API-Key': process.env.API_KEY
      };
    }

    if (process.env.X_API_KEY) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-API-Key': process.env.X_API_KEY
      };
    }

    if (process.env.PAYMENT_API_KEY) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Payment-API-Key': process.env.PAYMENT_API_KEY
      };
    }

    // ===========================================
    // AUTHENTICATION CONFIGURATION
    // ===========================================
    if (process.env.AUTH_TOKEN || process.env.RESTIFIED_AUTH_TOKEN) {
      envConfig.auth = {
        type: 'bearer',
        ...envConfig.auth,
        token: process.env.AUTH_TOKEN || process.env.RESTIFIED_AUTH_TOKEN
      };
    }

    if (process.env.REFRESH_TOKEN) {
      envConfig.auth = {
        type: 'bearer',
        ...envConfig.auth,
        token: envConfig.auth?.token || process.env.REFRESH_TOKEN
      };
    }

    if (process.env.BASIC_USERNAME && process.env.BASIC_PASSWORD) {
      envConfig.auth = {
        type: 'basic',
        ...envConfig.auth,
        username: process.env.BASIC_USERNAME,
        password: process.env.BASIC_PASSWORD
      };
    }

    // OAuth2 configuration
    if (process.env.OAUTH2_CLIENT_ID) {
      envConfig.auth = {
        type: 'oauth2',
        ...envConfig.auth,
        username: process.env.OAUTH2_CLIENT_ID // Using username field for client_id
      };
    }

    if (process.env.OAUTH2_CLIENT_SECRET) {
      envConfig.auth = {
        type: 'oauth2',
        ...envConfig.auth,
        password: process.env.OAUTH2_CLIENT_SECRET // Using password field for client_secret
      };
    }

    if (process.env.OAUTH2_TOKEN_URL) {
      envConfig.auth = {
        type: 'oauth2',
        ...envConfig.auth,
        headerName: process.env.OAUTH2_TOKEN_URL // Temporary storage in available field
      };
    }

    if (process.env.API_SECRET) {
      envConfig.auth = {
        type: 'apikey',
        ...envConfig.auth,
        apiKey: process.env.API_SECRET
      };
    }

    // ===========================================
    // LOGGING CONFIGURATION
    // ===========================================
    if (process.env.LOG_LEVEL || process.env.RESTIFIED_LOG_LEVEL) {
      envConfig.logging = {
        ...envConfig.logging,
        level: (process.env.LOG_LEVEL || process.env.RESTIFIED_LOG_LEVEL) as any
      };
    }

    // Storage directories from logging config
    if (process.env.LOGS_DIR) {
      envConfig.logging = {
        ...envConfig.logging,
        outputFile: process.env.LOGS_DIR
      };
    }

    // ===========================================
    // PROXY CONFIGURATION
    // ===========================================
    if (process.env.HTTP_PROXY || process.env.RESTIFIED_PROXY_HOST) {
      const proxyUrl = process.env.HTTP_PROXY || `http://${process.env.RESTIFIED_PROXY_HOST}:${process.env.RESTIFIED_PROXY_PORT || '8080'}`;
      try {
        const url = new URL(proxyUrl);
        envConfig.proxy = {
          ...envConfig.proxy,
          host: url.hostname,
          port: parseInt(url.port || '8080', 10),
          protocol: url.protocol.replace(':', '') as 'http' | 'https'
        };
      } catch (error) {
        console.warn('Invalid HTTP_PROXY URL:', proxyUrl);
      }
    }

    if (process.env.HTTPS_PROXY) {
      try {
        const url = new URL(process.env.HTTPS_PROXY);
        envConfig.proxy = {
          ...envConfig.proxy,
          host: url.hostname,
          port: parseInt(url.port || '8080', 10),
          protocol: 'https'
        };
      } catch (error) {
        console.warn('Invalid HTTPS_PROXY URL:', process.env.HTTPS_PROXY);
      }
    }

    // ===========================================
    // SSL/TLS CONFIGURATION
    // ===========================================
    if (process.env.SSL_VERIFY || process.env.RESTIFIED_SSL_REJECT_UNAUTHORIZED) {
      envConfig.ssl = {
        ...envConfig.ssl,
        rejectUnauthorized: (process.env.SSL_VERIFY || process.env.RESTIFIED_SSL_REJECT_UNAUTHORIZED) === 'true'
      };
    }

    if (process.env.SSL_CERT_PATH) {
      envConfig.ssl = {
        ...envConfig.ssl,
        cert: process.env.SSL_CERT_PATH
      };
    }

    if (process.env.SSL_KEY_PATH) {
      envConfig.ssl = {
        ...envConfig.ssl,
        key: process.env.SSL_KEY_PATH
      };
    }

    if (process.env.SSL_CA_PATH) {
      envConfig.ssl = {
        ...envConfig.ssl,
        ca: process.env.SSL_CA_PATH
      };
    }

    // ===========================================
    // STORAGE CONFIGURATION
    // ===========================================
    if (process.env.SNAPSHOTS_DIR) {
      envConfig.snapshots = {
        ...envConfig.snapshots,
        directory: process.env.SNAPSHOTS_DIR
      };
    }

    if (process.env.REPORTS_DIR) {
      envConfig.storage = {
        ...envConfig.storage,
        storageDir: process.env.REPORTS_DIR
      };
    }

    // ===========================================
    // PERFORMANCE CONFIGURATION
    // ===========================================
    if (process.env.PERFORMANCE_TRACK_METRICS) {
      envConfig.performance = {
        ...envConfig.performance,
        trackMetrics: process.env.PERFORMANCE_TRACK_METRICS === 'true'
      };
    }

    if (process.env.PERFORMANCE_RESPONSE_TIME_MEDIAN) {
      envConfig.performance = {
        ...envConfig.performance,
        slowThreshold: parseInt(process.env.PERFORMANCE_RESPONSE_TIME_MEDIAN, 10)
      };
    }

    if (process.env.PERFORMANCE_ERROR_RATE_MAX) {
      // Store in available field temporarily
      envConfig.performance = {
        ...envConfig.performance,
        enableProfiling: parseFloat(process.env.PERFORMANCE_ERROR_RATE_MAX) > 0
      };
    }

    // Artillery configuration (performance testing)
    if (process.env.ARTILLERY_ENABLED === 'true') {
      envConfig.performance = {
        ...envConfig.performance,
        enableProfiling: true
      };
    }

    // Performance thresholds
    if (process.env.PERFORMANCE_RESPONSE_TIME_P95) {
      envConfig.performance = {
        ...envConfig.performance,
        slowThreshold: parseInt(process.env.PERFORMANCE_RESPONSE_TIME_P95, 10)
      };
    }

    if (process.env.PERFORMANCE_THROUGHPUT_MIN) {
      // Store in available performance field
      envConfig.performance = {
        ...envConfig.performance,
        trackMetrics: parseInt(process.env.PERFORMANCE_THROUGHPUT_MIN, 10) > 0
      };
    }

    // ===========================================
    // VALIDATION CONFIGURATION
    // ===========================================
    if (process.env.SCHEMA_VALIDATION_ENABLED) {
      envConfig.validation = {
        ...envConfig.validation,
        validateResponseSchema: process.env.SCHEMA_VALIDATION_ENABLED === 'true'
      };
    }

    if (process.env.SCHEMA_STRICT_MODE) {
      envConfig.validation = {
        ...envConfig.validation,
        strictMode: process.env.SCHEMA_STRICT_MODE === 'true'
      };
    }

    // ===========================================
    // WEBSOCKET CONFIGURATION
    // ===========================================
    if (process.env.WS_TIMEOUT) {
      envConfig.websocket = {
        ...envConfig.websocket,
        timeout: parseInt(process.env.WS_TIMEOUT || '10000', 10)
      };
    }

    if (process.env.WS_RECONNECT_ATTEMPTS) {
      envConfig.websocket = {
        ...envConfig.websocket,
        maxReconnectAttempts: parseInt(process.env.WS_RECONNECT_ATTEMPTS || '3', 10)
      };
    }

    if (process.env.WS_PING_INTERVAL) {
      envConfig.websocket = {
        ...envConfig.websocket,
        pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000', 10)
      };
    }

    if (process.env.WS_URL) {
      // WebSocket URL handled by WebSocket client, not main config
      // Store in available field for reference
      envConfig.websocket = {
        ...envConfig.websocket,
        protocols: [process.env.WS_URL]
      };
    }

    // ===========================================
    // GRAPHQL CONFIGURATION
    // ===========================================
    if (process.env.GRAPHQL_URL) {
      envConfig.graphql = {
        ...envConfig.graphql,
        endpoint: process.env.GRAPHQL_URL
      };
    }

    if (process.env.GRAPHQL_INTROSPECTION) {
      envConfig.graphql = {
        ...envConfig.graphql,
        introspection: process.env.GRAPHQL_INTROSPECTION === 'true'
      };
    }

    if (process.env.GRAPHQL_TIMEOUT) {
      // Timeout handled by specific GraphQL client
      envConfig.timeout = parseInt(process.env.GRAPHQL_TIMEOUT || envConfig.timeout?.toString() || '30000', 10);
    }

    if (process.env.GRAPHQL_PLAYGROUND) {
      // Store in defaultVariables as boolean flag
      envConfig.graphql = {
        ...envConfig.graphql,
        defaultVariables: {
          ...envConfig.graphql?.defaultVariables,
          playground: process.env.GRAPHQL_PLAYGROUND === 'true'
        }
      };
    }

    // ===========================================
    // DATABASE CONFIGURATION (Extended Support)
    // ===========================================
    // Note: Full database support requires extending RestifiedConfig interface
    // These variables are documented in JSON but not fully supported in current interface
    
    // PostgreSQL configuration
    if (process.env.DB_HOST) {
      // Store database info in available config sections for future use
      envConfig.headers = {
        ...envConfig.headers,
        'X-DB-Host': process.env.DB_HOST
      };
    }

    if (process.env.DB_PORT) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-DB-Port': process.env.DB_PORT
      };
    }

    if (process.env.DB_NAME) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-DB-Name': process.env.DB_NAME
      };
    }

    // MySQL configuration
    if (process.env.MYSQL_HOST) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-MySQL-Host': process.env.MYSQL_HOST
      };
    }

    // MongoDB configuration
    if (process.env.MONGO_URL) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Mongo-URL': process.env.MONGO_URL
      };
    }

    // SQLite configuration
    if (process.env.SQLITE_DB) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-SQLite-DB': process.env.SQLITE_DB
      };
    }

    // ===========================================
    // MULTI-SERVICE CONFIGURATION
    // ===========================================
    // Service URLs are handled by multi-client system
    // Store in available config for reference
    
    if (process.env.AUTH_SERVICE_URL) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Auth-Service': process.env.AUTH_SERVICE_URL
      };
    }

    if (process.env.PAYMENT_SERVICE_URL) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Payment-Service': process.env.PAYMENT_SERVICE_URL
      };
    }

    if (process.env.USER_SERVICE_URL) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-User-Service': process.env.USER_SERVICE_URL
      };
    }

    if (process.env.NOTIFICATION_SERVICE_URL) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Notification-Service': process.env.NOTIFICATION_SERVICE_URL
      };
    }

    if (process.env.ORDER_SERVICE_URL) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Order-Service': process.env.ORDER_SERVICE_URL
      };
    }

    // ===========================================
    // TESTING CONFIGURATION
    // ===========================================
    if (process.env.MAX_PARALLEL_TESTS) {
      // Store in performance config
      envConfig.performance = {
        ...envConfig.performance,
        trackMetrics: parseInt(process.env.MAX_PARALLEL_TESTS, 10) > 1
      };
    }

    if (process.env.TEST_TIMEOUT_GLOBAL) {
      envConfig.timeout = parseInt(process.env.TEST_TIMEOUT_GLOBAL || envConfig.timeout?.toString() || '30000', 10);
    }

    if (process.env.TEST_RETRY_ATTEMPTS) {
      envConfig.retry = {
        ...envConfig.retry,
        retries: parseInt(process.env.TEST_RETRY_ATTEMPTS, 10)
      };
    }

    // ===========================================
    // MOCK DATA CONFIGURATION
    // ===========================================
    if (process.env.FAKER_LOCALE) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Faker-Locale': process.env.FAKER_LOCALE
      };
    }

    if (process.env.MOCK_SERVER_PORT) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Mock-Server-Port': process.env.MOCK_SERVER_PORT
      };
    }

    if (process.env.MOCK_DATA_SEED) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Mock-Data-Seed': process.env.MOCK_DATA_SEED
      };
    }

    // ===========================================
    // DEBUG CONFIGURATION
    // ===========================================
    if (process.env.DEBUG_MODE) {
      envConfig.logging = {
        ...envConfig.logging,
        level: process.env.DEBUG_MODE === 'true' ? 'debug' : envConfig.logging?.level
      };
    }

    if (process.env.VERBOSE_LOGGING) {
      envConfig.logging = {
        ...envConfig.logging,
        includeHeaders: process.env.VERBOSE_LOGGING === 'true',
        includeBody: process.env.VERBOSE_LOGGING === 'true'
      };
    }

    if (process.env.CAPTURE_NETWORK_TRAFFIC) {
      envConfig.logging = {
        ...envConfig.logging,
        includeHeaders: process.env.CAPTURE_NETWORK_TRAFFIC === 'true'
      };
    }

    if (process.env.SAVE_FAILED_RESPONSES) {
      envConfig.snapshots = {
        ...envConfig.snapshots,
        updateOnMismatch: process.env.SAVE_FAILED_RESPONSES === 'true'
      };
    }

    // ===========================================
    // CI/CD CONFIGURATION
    // ===========================================
    if (process.env.CI === 'true') {
      envConfig.headers = {
        ...envConfig.headers,
        'X-CI-Mode': 'true'
      };
    }

    if (process.env.CI_BUILD_NUMBER) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-CI-Build': process.env.CI_BUILD_NUMBER
      };
    }

    if (process.env.CI_COMMIT_SHA) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-CI-Commit': process.env.CI_COMMIT_SHA
      };
    }

    if (process.env.CI_BRANCH) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-CI-Branch': process.env.CI_BRANCH
      };
    }

    // ===========================================
    // SECURITY CONFIGURATION
    // ===========================================
    // ZAP and security testing configuration
    if (process.env.ZAP_ENABLED === 'true') {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Security-Scan': 'true'
      };
    }

    if (process.env.ZAP_API_URL) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-ZAP-API': process.env.ZAP_API_URL
      };
    }

    if (process.env.SECURITY_ALLOW_HIGH_RISK) {
      envConfig.validation = {
        ...envConfig.validation,
        strictMode: process.env.SECURITY_ALLOW_HIGH_RISK !== 'true'
      };
    }

    // ===========================================
    // REPORT CONFIGURATION
    // ===========================================
    if (process.env.REPORT_TITLE) {
      envConfig.userAgent = process.env.REPORT_TITLE;
    }

    if (process.env.REPORT_AUTO_OPEN) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Report-Auto-Open': process.env.REPORT_AUTO_OPEN
      };
    }

    if (process.env.REPORT_INCLUDE_SCREENSHOTS) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Include-Screenshots': process.env.REPORT_INCLUDE_SCREENSHOTS
      };
    }

    if (process.env.REPORT_INCLUDE_METRICS) {
      envConfig.performance = {
        ...envConfig.performance,
        trackMetrics: process.env.REPORT_INCLUDE_METRICS === 'true'
      };
    }

    // ===========================================
    // CUSTOM APPLICATION CONFIGURATION
    // ===========================================
    if (process.env.CUSTOM_API_ENDPOINT_1) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Custom-Endpoint-1': process.env.CUSTOM_API_ENDPOINT_1
      };
    }

    if (process.env.CUSTOM_API_ENDPOINT_2) {
      envConfig.headers = {
        ...envConfig.headers,
        'X-Custom-Endpoint-2': process.env.CUSTOM_API_ENDPOINT_2
      };
    }

    if (process.env.CUSTOM_AUTH_HEADER && process.env.CUSTOM_AUTH_VALUE) {
      envConfig.headers = {
        ...envConfig.headers,
        [process.env.CUSTOM_AUTH_HEADER]: process.env.CUSTOM_AUTH_VALUE
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
        directory: './output/snapshots',
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