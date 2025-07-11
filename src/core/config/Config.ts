// src/core/config/Config.ts

import { RestifiedConfig, LogLevel } from '../../types/RestifiedTypes';
import { ConfigLoader } from './ConfigLoader';
import { ConfigValidator } from './ConfigValidator';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: RestifiedConfig = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    backoffFactor: 2,
    retryDelay: 1000,
    retryStatusCodes: [408, 429, 500, 502, 503, 504]
  },
  logging: {
    level: 'info' as LogLevel,
    auditEnabled: true,
    auditPath: './logs/audit.log',
    console: true
  },
  reporting: {
    enabled: true,
    format: 'html',
    outputPath: './reports',
    includeSnapshots: true
  }
};

/**
 * Configuration management class
 * Handles loading, validation, and merging of configurations
 */
export class Config {
  private config: RestifiedConfig;
  private readonly configLoader: ConfigLoader;
  private readonly configValidator: ConfigValidator;

  constructor(userConfig?: Partial<RestifiedConfig>) {
    this.configLoader = new ConfigLoader();
    this.configValidator = new ConfigValidator();
    
    this.config = this.buildConfiguration(userConfig);
    this.validateConfiguration();
  }

  /**
   * Get the complete configuration
   */
  getConfig(): Readonly<RestifiedConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * Update configuration with new values
   */
  update(updates: Partial<RestifiedConfig>): void {
    const updatedConfig = this.mergeConfigurations(this.config, updates);
    this.configValidator.validate(updatedConfig);
    this.config = updatedConfig;
  }

  /**
   * Get a specific configuration value by path
   */
  get<T = any>(path: string): T {
    return this.getNestedValue(this.config, path);
  }

  /**
   * Set a specific configuration value by path
   */
  set(path: string, value: any): void {
    const updates = this.setNestedValue({}, path, value);
    this.update(updates);
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Load configuration from environment
   */
  loadFromEnvironment(): void {
    const envConfig = this.configLoader.loadFromEnvironment();
    this.update(envConfig);
  }

  /**
   * Load configuration from file
   */
  async loadFromFile(filePath: string): Promise<void> {
    const fileConfig = await this.configLoader.loadFromFile(filePath);
    this.update(fileConfig);
  }

  /**
   * Export configuration to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Build the final configuration by merging defaults, file config, and user config
   */
  private buildConfiguration(userConfig?: Partial<RestifiedConfig>): RestifiedConfig {
    let config = { ...DEFAULT_CONFIG };

    // Load from default config file if exists
    try {
      const defaultFileConfig = this.configLoader.loadFromFileSync('./config/default.json');
      config = this.mergeConfigurations(config, defaultFileConfig);
    } catch (error) {
      // File doesn't exist or is invalid, continue with defaults
    }

    // Load environment-specific config
    const environment = process.env.NODE_ENV || 'development';
    try {
      const envConfig = this.configLoader.loadFromFileSync(`./config/${environment}.json`);
      config = this.mergeConfigurations(config, envConfig);
    } catch (error) {
      // Environment config doesn't exist, continue
    }

    // Load from environment variables
    const envVarConfig = this.configLoader.loadFromEnvironment();
    config = this.mergeConfigurations(config, envVarConfig);

    // Apply user-provided configuration
    if (userConfig) {
      config = this.mergeConfigurations(config, userConfig);
    }

    return config;
  }

  /**
   * Deep merge two configuration objects
   */
  private mergeConfigurations(
    base: RestifiedConfig | Partial<RestifiedConfig>,
    override: Partial<RestifiedConfig>
  ): RestifiedConfig {
    const result = { ...base } as RestifiedConfig;

    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined) {
        if (this.isObject(value) && this.isObject(result[key as keyof RestifiedConfig])) {
          (result as any)[key] = this.mergeConfigurations(
            result[key as keyof RestifiedConfig] as any,
            value
          );
        } else {
          (result as any)[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Check if value is a plain object
   */
  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): any {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
    return obj;
  }

  /**
   * Validate the current configuration
   */
  private validateConfiguration(): void {
    this.configValidator.validate(this.config);
  }
}

// src/core/config/ConfigLoader.ts

import * as fs from 'fs';
import * as path from 'path';
import { RestifiedConfig } from '../../types/RestifiedTypes';

/**
 * Configuration loader class
 * Handles loading configuration from various sources
 */
export class ConfigLoader {
  /**
   * Load configuration from JSON file asynchronously
   */
  async loadFromFile(filePath: string): Promise<Partial<RestifiedConfig>> {
    try {
      const absolutePath = path.resolve(filePath);
      const fileContent = await fs.promises.readFile(absolutePath, 'utf-8');
      return this.parseJsonConfig(fileContent, filePath);
    } catch (error) {
      throw new Error(`Failed to load config from ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Load configuration from JSON file synchronously
   */
  loadFromFileSync(filePath: string): Partial<RestifiedConfig> {
    try {
      const absolutePath = path.resolve(filePath);
      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      return this.parseJsonConfig(fileContent, filePath);
    } catch (error) {
      throw new Error(`Failed to load config from ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(): Partial<RestifiedConfig> {
    const config: Partial<RestifiedConfig> = {};

    // Base configuration
    if (process.env.RESTIFIED_BASE_URL) {
      config.baseURL = process.env.RESTIFIED_BASE_URL;
    }

    if (process.env.RESTIFIED_TIMEOUT) {
      config.timeout = parseInt(process.env.RESTIFIED_TIMEOUT, 10);
    }

    // Retry configuration
    if (this.hasRetryEnvVars()) {
      config.retryConfig = {
        maxRetries: parseInt(process.env.RESTIFIED_MAX_RETRIES || '3', 10),
        backoffFactor: parseFloat(process.env.RESTIFIED_BACKOFF_FACTOR || '2'),
        retryDelay: parseInt(process.env.RESTIFIED_RETRY_DELAY || '1000', 10),
        retryStatusCodes: this.parseStatusCodes(process.env.RESTIFIED_RETRY_STATUS_CODES)
      };
    }

    // Logging configuration
    if (this.hasLoggingEnvVars()) {
      config.logging = {
        level: (process.env.RESTIFIED_LOG_LEVEL as any) || 'info',
        auditEnabled: process.env.RESTIFIED_AUDIT_ENABLED !== 'false',
        auditPath: process.env.RESTIFIED_AUDIT_PATH || './logs/audit.log',
        console: process.env.RESTIFIED_CONSOLE_LOG !== 'false'
      };
    }

    // Reporting configuration
    if (this.hasReportingEnvVars()) {
      config.reporting = {
        enabled: process.env.RESTIFIED_REPORTING_ENABLED !== 'false',
        format: (process.env.RESTIFIED_REPORT_FORMAT as any) || 'html',
        outputPath: process.env.RESTIFIED_REPORT_PATH || './reports',
        includeSnapshots: process.env.RESTIFIED_INCLUDE_SNAPSHOTS !== 'false'
      };
    }

    // Auth configuration
    if (process.env.RESTIFIED_AUTH_TYPE) {
      config.auth = {
        type: process.env.RESTIFIED_AUTH_TYPE as any,
        credentials: this.parseAuthCredentials()
      };
    }

    // Proxy configuration
    if (process.env.RESTIFIED_PROXY_HOST) {
      config.proxy = {
        host: process.env.RESTIFIED_PROXY_HOST,
        port: parseInt(process.env.RESTIFIED_PROXY_PORT || '8080', 10),
        protocol: (process.env.RESTIFIED_PROXY_PROTOCOL as any) || 'http',
        auth: this.parseProxyAuth()
      };
    }

    return config;
  }

  /**
   * Parse JSON configuration content
   */
  private parseJsonConfig(content: string, filePath: string): Partial<RestifiedConfig> {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in config file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if retry environment variables are present
   */
  private hasRetryEnvVars(): boolean {
    return !!(
      process.env.RESTIFIED_MAX_RETRIES ||
      process.env.RESTIFIED_BACKOFF_FACTOR ||
      process.env.RESTIFIED_RETRY_DELAY ||
      process.env.RESTIFIED_RETRY_STATUS_CODES
    );
  }

  /**
   * Check if logging environment variables are present
   */
  private hasLoggingEnvVars(): boolean {
    return !!(
      process.env.RESTIFIED_LOG_LEVEL ||
      process.env.RESTIFIED_AUDIT_ENABLED ||
      process.env.RESTIFIED_AUDIT_PATH ||
      process.env.RESTIFIED_CONSOLE_LOG
    );
  }

  /**
   * Check if reporting environment variables are present
   */
  private hasReportingEnvVars(): boolean {
    return !!(
      process.env.RESTIFIED_REPORTING_ENABLED ||
      process.env.RESTIFIED_REPORT_FORMAT ||
      process.env.RESTIFIED_REPORT_PATH ||
      process.env.RESTIFIED_INCLUDE_SNAPSHOTS
    );
  }

  /**
   * Parse status codes from environment variable
   */
  private parseStatusCodes(statusCodesStr?: string): number[] {
    if (!statusCodesStr) {
      return [408, 429, 500, 502, 503, 504];
    }

    return statusCodesStr
      .split(',')
      .map(code => parseInt(code.trim(), 10))
      .filter(code => !isNaN(code));
  }

  /**
   * Parse auth credentials from environment variables
   */
  private parseAuthCredentials(): Record<string, any> {
    const credentials: Record<string, any> = {};

    if (process.env.RESTIFIED_AUTH_TOKEN) {
      credentials.token = process.env.RESTIFIED_AUTH_TOKEN;
    }

    if (process.env.RESTIFIED_AUTH_USERNAME) {
      credentials.username = process.env.RESTIFIED_AUTH_USERNAME;
    }

    if (process.env.RESTIFIED_AUTH_PASSWORD) {
      credentials.password = process.env.RESTIFIED_AUTH_PASSWORD;
    }

    return credentials;
  }

  /**
   * Parse proxy auth from environment variables
   */
  private parseProxyAuth(): { username: string; password: string } | undefined {
    if (process.env.RESTIFIED_PROXY_USERNAME && process.env.RESTIFIED_PROXY_PASSWORD) {
      return {
        username: process.env.RESTIFIED_PROXY_USERNAME,
        password: process.env.RESTIFIED_PROXY_PASSWORD
      };
    }
    return undefined;
  }
}

// src/core/config/ConfigValidator.ts

import { RestifiedConfig, LogLevel } from '../../types/RestifiedTypes';

/**
 * Configuration validator class
 * Validates configuration objects for correctness
 */
export class ConfigValidator {
  private readonly VALID_LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  private readonly VALID_REPORT_FORMATS = ['html', 'json', 'both'];
  private readonly VALID_AUTH_TYPES = ['bearer', 'basic', 'custom'];
  private readonly VALID_PROXY_PROTOCOLS = ['http', 'https'];

  /**
   * Validate a complete configuration object
   */
  validate(config: RestifiedConfig): void {
    this.validateRequired(config);
    this.validateBaseURL(config.baseURL);
    this.validateTimeout(config.timeout);
    this.validateRetryConfig(config.retryConfig);
    this.validateLoggingConfig(config.logging);
    this.validateReportingConfig(config.reporting);
    
    if (config.auth) {
      this.validateAuthConfig(config.auth);
    }
    
    if (config.proxy) {
      this.validateProxyConfig(config.proxy);
    }
    
    if (config.ssl) {
      this.validateSSLConfig(config.ssl);
    }
  }

  /**
   * Validate required fields are present
   */
  private validateRequired(config: RestifiedConfig): void {
    const requiredFields = ['baseURL', 'timeout', 'retryConfig', 'logging', 'reporting'];
    
    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new Error(`Required configuration field '${field}' is missing`);
      }
    }
  }

  /**
   * Validate base URL format
   */
  private validateBaseURL(baseURL: string): void {
    if (typeof baseURL !== 'string' || baseURL.trim() === '') {
      throw new Error('baseURL must be a non-empty string');
    }

    try {
      new URL(baseURL);
    } catch (error) {
      throw new Error(`Invalid baseURL format: ${baseURL}`);
    }
  }

  /**
   * Validate timeout value
   */
  private validateTimeout(timeout: number): void {
    if (typeof timeout !== 'number' || timeout <= 0 || !Number.isInteger(timeout)) {
      throw new Error('timeout must be a positive integer');
    }

    if (timeout > 300000) { // 5 minutes
      console.warn(`Warning: timeout value ${timeout}ms is very high (>5 minutes)`);
    }
  }

  /**
   * Validate retry configuration
   */
  private validateRetryConfig(retryConfig: RestifiedConfig['retryConfig']): void {
    if (!retryConfig || typeof retryConfig !== 'object') {
      throw new Error('retryConfig must be an object');
    }

    const { maxRetries, backoffFactor, retryDelay, retryStatusCodes } = retryConfig;

    if (typeof maxRetries !== 'number' || maxRetries < 0 || !Number.isInteger(maxRetries)) {
      throw new Error('retryConfig.maxRetries must be a non-negative integer');
    }

    if (typeof backoffFactor !== 'number' || backoffFactor <= 0) {
      throw new Error('retryConfig.backoffFactor must be a positive number');
    }

    if (typeof retryDelay !== 'number' || retryDelay < 0 || !Number.isInteger(retryDelay)) {
      throw new Error('retryConfig.retryDelay must be a non-negative integer');
    }

    if (!Array.isArray(retryStatusCodes)) {
      throw new Error('retryConfig.retryStatusCodes must be an array');
    }

    for (const code of retryStatusCodes) {
      if (typeof code !== 'number' || code < 100 || code > 599 || !Number.isInteger(code)) {
        throw new Error(`Invalid status code in retryStatusCodes: ${code}`);
      }
    }
  }

  /**
   * Validate logging configuration
   */
  private validateLoggingConfig(loggingConfig: RestifiedConfig['logging']): void {
    if (!loggingConfig || typeof loggingConfig !== 'object') {
      throw new Error('logging config must be an object');
    }

    const { level, auditEnabled, auditPath, console } = loggingConfig;

    if (!this.VALID_LOG_LEVELS.includes(level)) {
      throw new Error(`Invalid log level: ${level}. Valid levels: ${this.VALID_LOG_LEVELS.join(', ')}`);
    }

    if (typeof auditEnabled !== 'boolean') {
      throw new Error('logging.auditEnabled must be a boolean');
    }

    if (typeof auditPath !== 'string' || auditPath.trim() === '') {
      throw new Error('logging.auditPath must be a non-empty string');
    }

    if (typeof console !== 'boolean') {
      throw new Error('logging.console must be a boolean');
    }
  }

  /**
   * Validate reporting configuration
   */
  private validateReportingConfig(reportingConfig: RestifiedConfig['reporting']): void {
    if (!reportingConfig || typeof reportingConfig !== 'object') {
      throw new Error('reporting config must be an object');
    }

    const { enabled, format, outputPath, includeSnapshots } = reportingConfig;

    if (typeof enabled !== 'boolean') {
      throw new Error('reporting.enabled must be a boolean');
    }

    if (!this.VALID_REPORT_FORMATS.includes(format)) {
      throw new Error(`Invalid report format: ${format}. Valid formats: ${this.VALID_REPORT_FORMATS.join(', ')}`);
    }

    if (typeof outputPath !== 'string' || outputPath.trim() === '') {
      throw new Error('reporting.outputPath must be a non-empty string');
    }

    if (typeof includeSnapshots !== 'boolean') {
      throw new Error('reporting.includeSnapshots must be a boolean');
    }
  }

  /**
   * Validate auth configuration
   */
  private validateAuthConfig(authConfig: RestifiedConfig['auth']): void {
    if (!authConfig || typeof authConfig !== 'object') {
      throw new Error('auth config must be an object');
    }

    const { type, credentials } = authConfig;

    if (!this.VALID_AUTH_TYPES.includes(type)) {
      throw new Error(`Invalid auth type: ${type}. Valid types: ${this.VALID_AUTH_TYPES.join(', ')}`);
    }

    if (!credentials || typeof credentials !== 'object') {
      throw new Error('auth.credentials must be an object');
    }

    // Validate specific auth type requirements
    switch (type) {
      case 'bearer':
        if (!credentials.token || typeof credentials.token !== 'string') {
          throw new Error('Bearer auth requires a token string in credentials');
        }
        break;
      case 'basic':
        if (!credentials.username || !credentials.password) {
          throw new Error('Basic auth requires username and password in credentials');
        }
        break;
    }
  }

  /**
   * Validate proxy configuration
   */
  private validateProxyConfig(proxyConfig: RestifiedConfig['proxy']): void {
    if (!proxyConfig || typeof proxyConfig !== 'object') {
      throw new Error('proxy config must be an object');
    }

    const { host, port, protocol, auth } = proxyConfig;

    if (typeof host !== 'string' || host.trim() === '') {
      throw new Error('proxy.host must be a non-empty string');
    }

    if (typeof port !== 'number' || port <= 0 || port > 65535 || !Number.isInteger(port)) {
      throw new Error('proxy.port must be an integer between 1 and 65535');
    }

    if (!this.VALID_PROXY_PROTOCOLS.includes(protocol)) {
      throw new Error(`Invalid proxy protocol: ${protocol}. Valid protocols: ${this.VALID_PROXY_PROTOCOLS.join(', ')}`);
    }

    if (auth) {
      if (typeof auth !== 'object') {
        throw new Error('proxy.auth must be an object');
      }
      if (!auth.username || !auth.password) {
        throw new Error('proxy.auth requires both username and password');
      }
    }
  }

  /**
   * Validate SSL configuration
   */
  private validateSSLConfig(sslConfig: RestifiedConfig['ssl']): void {
    if (!sslConfig || typeof sslConfig !== 'object') {
      throw new Error('ssl config must be an object');
    }

    const { rejectUnauthorized, ca, cert, key } = sslConfig;

    if (typeof rejectUnauthorized !== 'boolean') {
      throw new Error('ssl.rejectUnauthorized must be a boolean');
    }

    if (ca !== undefined && typeof ca !== 'string') {
      throw new Error('ssl.ca must be a string');
    }

    if (cert !== undefined && typeof cert !== 'string') {
      throw new Error('ssl.cert must be a string');
    }

    if (key !== undefined && typeof key !== 'string') {
      throw new Error('ssl.key must be a string');
    }

    // If cert is provided, key should also be provided
    if ((cert && !key) || (!cert && key)) {
      throw new Error('ssl.cert and ssl.key must be provided together');
    }
  }
}