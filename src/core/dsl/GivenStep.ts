// src/core/dsl/GivenStep.ts

import { 
  IGivenStep, 
  IWhenStep, 
  AuthProvider, 
  RestifiedConfig,
  RequestConfig
} from '../../types/RestifiedTypes';
import { WhenStep } from './WhenStep';
import { ClientManager } from '../clients/ClientManager';
import { VariableStore } from '../stores/VariableStore';
import { ResponseStore } from '../stores/ResponseStore';
import { SnapshotStore } from '../stores/SnapshotStore';
import { AuditLogger } from '../../logging/AuditLogger';
import { Config } from '../config/Config';

/**
 * Implementation of the "given" step in the fluent DSL
 * Handles test setup and configuration with comprehensive validation
 * 
 * @example
 * ```typescript
 * restified
 *   .given()
 *   .baseURL('https://api.example.com')
 *   .header('Content-Type', 'application/json')
 *   .auth(new BearerAuth('token123'))
 *   .variable('userId', '12345')
 *   .timeout(5000)
 *   .when()
 *   .get('/users/{{userId}}')
 *   .execute();
 * ```
 */
export class GivenStep implements IGivenStep {
  private requestConfig: Partial<RequestConfig> = {};
  private localVariables: Record<string, any> = {};
  private currentTimeout?: number;
  private currentBaseURL?: string;
  private currentAuthProvider?: AuthProvider;

  constructor(
    private readonly clientManager: ClientManager,
    private readonly variableStore: VariableStore,
    private readonly responseStore: ResponseStore,
    private readonly snapshotStore: SnapshotStore,
    private readonly auditLogger: AuditLogger,
    private readonly config: Config
  ) {
    this.auditLogger.debug('[GIVEN] Initializing GivenStep');
  }

  /**
   * Set base URL for this request
   * Overrides the global base URL for this specific test
   * 
   * @param url - Base URL (must be a valid URL)
   * @returns Current GivenStep instance for chaining
   * @throws Error if URL is invalid
   */
  baseURL(url: string): IGivenStep {
    this.validateUrl(url);
    this.currentBaseURL = url;
    this.auditLogger.debug(`[GIVEN] Set base URL: ${url}`);
    return this;
  }

  /**
   * Add a single header to the request
   * Variables can be resolved using {{variableName}} syntax
   * 
   * @param key - Header name (must be valid HTTP header name)
   * @param value - Header value (supports variable resolution)
   * @returns Current GivenStep instance for chaining
   * @throws Error if header key is invalid
   */
  header(key: string, value: string): IGivenStep {
    this.validateHeaderKey(key);
    this.validateHeaderValue(value);

    if (!this.requestConfig.headers) {
      this.requestConfig.headers = {};
    }
    
    // Resolve variables in header value
    const resolvedValue = this.resolveVariables(value);
    this.requestConfig.headers[key] = resolvedValue;
    
    this.auditLogger.debug(`[GIVEN] Set header: ${key} = ${resolvedValue}`);
    return this;
  }

  /**
   * Add multiple headers to the request
   * All header values support variable resolution
   * 
   * @param headers - Object containing header key-value pairs
   * @returns Current GivenStep instance for chaining
   * @throws Error if any header key is invalid
   */
  headers(headers: Record<string, string>): IGivenStep {
    this.validateHeaders(headers);

    if (!this.requestConfig.headers) {
      this.requestConfig.headers = {};
    }

    Object.entries(headers).forEach(([key, value]) => {
      const resolvedValue = this.resolveVariables(value);
      this.requestConfig.headers![key] = resolvedValue;
      this.auditLogger.debug(`[GIVEN] Set header: ${key} = ${resolvedValue}`);
    });

    return this;
  }

  /**
   * Set authentication provider for this request
   * Overrides any global authentication settings
   * 
   * @param provider - Authentication provider instance
   * @returns Current GivenStep instance for chaining
   * @throws Error if provider is null or undefined
   */
  auth(provider: AuthProvider): IGivenStep {
    if (!provider) {
      throw new Error('Auth provider cannot be null or undefined');
    }
    
    this.currentAuthProvider = provider;
    this.auditLogger.debug(`[GIVEN] Set auth provider: ${provider.constructor.name}`);
    return this;
  }

  /**
   * Set timeout for this request
   * Overrides the global timeout setting
   * 
   * @param ms - Timeout in milliseconds (must be positive integer)
   * @returns Current GivenStep instance for chaining
   * @throws Error if timeout is invalid
   */
  timeout(ms: number): IGivenStep {
    this.validateTimeout(ms);
    this.currentTimeout = ms;
    this.auditLogger.debug(`[GIVEN] Set timeout: ${ms}ms`);
    return this;
  }

  /**
   * Set a local variable for this test
   * Local variables override global variables with the same name
   * 
   * @param key - Variable name (must be valid identifier)
   * @param value - Variable value (any type)
   * @returns Current GivenStep instance for chaining
   * @throws Error if variable key is invalid
   */
  variable(key: string, value: any): IGivenStep {
    this.validateVariableKey(key);
    this.localVariables[key] = value;
    this.variableStore.setLocal(key, value);
    this.auditLogger.debug(`[GIVEN] Set variable: ${key} = ${JSON.stringify(value)}`);
    return this;
  }

  /**
   * Set multiple local variables
   * Convenient way to set multiple variables at once
   * 
   * @param vars - Object containing variable key-value pairs
   * @returns Current GivenStep instance for chaining
   * @throws Error if any variable key is invalid
   */
  variables(vars: Record<string, any>): IGivenStep {
    this.validateVariables(vars);
    
    Object.entries(vars).forEach(([key, value]) => {
      this.localVariables[key] = value;
      this.variableStore.setLocal(key, value);
      this.auditLogger.debug(`[GIVEN] Set variable: ${key} = ${JSON.stringify(value)}`);
    });
    
    return this;
  }

  /**
   * Add query parameters to the request
   * All parameter values support variable resolution
   * 
   * @param params - Query parameters object
   * @returns Current GivenStep instance for chaining
   * @throws Error if parameters object is invalid
   */
  queryParams(params: Record<string, any>): IGivenStep {
    this.validateQueryParams(params);
    
    const resolvedParams: Record<string, any> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        resolvedParams[key] = this.resolveVariables(value);
      } else {
        resolvedParams[key] = value;
      }
    });
    
    this.requestConfig.params = {
      ...this.requestConfig.params,
      ...resolvedParams
    };
    
    this.auditLogger.debug(`[GIVEN] Set query params: ${JSON.stringify(resolvedParams)}`);
    return this;
  }

  /**
   * Add a single query parameter
   * Parameter value supports variable resolution
   * 
   * @param key - Parameter name
   * @param value - Parameter value (supports variable resolution if string)
   * @returns Current GivenStep instance for chaining
   * @throws Error if parameter key is invalid
   */
  queryParam(key: string, value: any): IGivenStep {
    this.validateQueryParamKey(key);
    
    if (!this.requestConfig.params) {
      this.requestConfig.params = {};
    }
    
    const resolvedValue = typeof value === 'string' ? this.resolveVariables(value) : value;
    this.requestConfig.params[key] = resolvedValue;
    
    this.auditLogger.debug(`[GIVEN] Set query param: ${key} = ${JSON.stringify(resolvedValue)}`);
    return this;
  }

  /**
   * Set content type header (convenience method)
   * 
   * @param contentType - Content type value
   * @returns Current GivenStep instance for chaining
   */
  contentType(contentType: string): IGivenStep {
    return this.header('Content-Type', contentType);
  }

  /**
   * Set accept header (convenience method)
   * 
   * @param accept - Accept header value
   * @returns Current GivenStep instance for chaining
   */
  accept(accept: string): IGivenStep {
    return this.header('Accept', accept);
  }

  /**
   * Use a specific client instance for this request
   * Useful for multi-service testing scenarios
   * 
   * @param clientName - Name of the client to use
   * @returns Current GivenStep instance for chaining
   * @throws Error if client doesn't exist
   */
  useClient(clientName: string): IGivenStep {
    if (!this.clientManager.hasClient(clientName)) {
      throw new Error(`Client '${clientName}' does not exist. Available clients: ${this.clientManager.getClientNames().join(', ')}`);
    }
    
    this.clientManager.setActiveClient(clientName);
    this.auditLogger.debug(`[GIVEN] Using client: ${clientName}`);
    return this;
  }

  /**
   * Log a message during test setup
   * Useful for debugging and test documentation
   * 
   * @param message - Message to log
   * @returns Current GivenStep instance for chaining
   */
  log(message: string): IGivenStep {
    this.auditLogger.info(`[GIVEN] ${message}`);
    return this;
  }

  /**
   * Set user agent header (convenience method)
   * 
   * @param userAgent - User agent string
   * @returns Current GivenStep instance for chaining
   */
  userAgent(userAgent: string): IGivenStep {
    return this.header('User-Agent', userAgent);
  }

  /**
   * Set authorization header directly (convenience method)
   * For more complex auth scenarios, use auth() method instead
   * 
   * @param token - Authorization token
   * @returns Current GivenStep instance for chaining
   */
  authorization(token: string): IGivenStep {
    return this.header('Authorization', token);
  }

  /**
   * Set bearer token authorization (convenience method)
   * 
   * @param token - Bearer token
   * @returns Current GivenStep instance for chaining
   */
  bearerToken(token: string): IGivenStep {
    return this.header('Authorization', `Bearer ${token}`);
  }

  /**
   * Transition to the "when" step
   * Applies all configurations and creates WhenStep instance
   * 
   * @returns WhenStep instance for method chaining
   */
  when(): IWhenStep {
    this.auditLogger.debug('[GIVEN] Transitioning to WHEN step');
    
    // Apply base URL if provided
    if (this.currentBaseURL) {
      this.clientManager.updateClient(
        this.clientManager.getActiveClientName(),
        { baseURL: this.currentBaseURL }
      );
      this.auditLogger.debug(`[GIVEN] Applied base URL to client: ${this.currentBaseURL}`);
    }

    // Apply timeout if provided
    if (this.currentTimeout) {
      this.clientManager.updateClient(
        this.clientManager.getActiveClientName(),
        { timeout: this.currentTimeout }
      );
      this.auditLogger.debug(`[GIVEN] Applied timeout to client: ${this.currentTimeout}ms`);
    }

    // Apply auth provider if provided
    if (this.currentAuthProvider) {
      this.clientManager.getActiveClient().setAuthProvider(this.currentAuthProvider);
      this.auditLogger.debug('[GIVEN] Applied auth provider to client');
    }

    return new WhenStep(
      this.clientManager,
      this.variableStore,
      this.responseStore,
      this.snapshotStore,
      this.auditLogger,
      this.config,
      this.requestConfig
    );
  }

  /**
   * Resolve variables in a string value using {{variableName}} syntax
   * Supports nested object access using dot notation
   * 
   * @param value - String that may contain variable placeholders
   * @returns Resolved string with variables replaced
   * @throws Error if referenced variable is not defined
   */
  private resolveVariables(value: string): string {
    if (typeof value !== 'string') {
      return value;
    }

    return value.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();
      
      // Support dot notation for nested object access
      const resolvedValue = this.resolveNestedVariable(trimmedName);
      
      if (resolvedValue === undefined) {
        throw new Error(`Variable '${trimmedName}' is not defined. Available variables: ${this.getAvailableVariables().join(', ')}`);
      }
      
      return String(resolvedValue);
    });
  }

  /**
   * Resolve nested variable using dot notation
   * 
   * @param variablePath - Variable path (e.g., 'user.profile.name')
   * @returns Resolved value or undefined
   */
  private resolveNestedVariable(variablePath: string): any {
    const parts = variablePath.split('.');
    const rootVariable = parts[0];
    
    let value = this.variableStore.get(rootVariable);
    
    if (value === undefined) {
      return undefined;
    }
    
    // Navigate through nested properties
    for (let i = 1; i < parts.length; i++) {
      if (value && typeof value === 'object' && parts[i] in value) {
        value = value[parts[i]];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Get list of available variables for error messages
   * 
   * @returns Array of available variable names
   */
  private getAvailableVariables(): string[] {
    return this.variableStore.getKeys();
  }

  // ==========================================
  // VALIDATION METHODS
  // ==========================================

  private validateUrl(url: string): void {
    if (typeof url !== 'string' || url.trim() === '') {
      throw new Error('URL must be a non-empty string');
    }

    try {
      new URL(url);
    } catch (error) {
      // Check if it's a relative URL (starts with /)
      if (!url.startsWith('/')) {
        throw new Error(`Invalid URL format: ${url}. URL must be absolute (with protocol) or relative (starting with /)`);
      }
    }
  }

  private validateHeaderKey(key: string): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Header key must be a non-empty string');
    }

    // HTTP header names are case-insensitive and should not contain special characters
    if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
      throw new Error(`Invalid header key format: ${key}. Header keys must contain only alphanumeric characters, hyphens, and underscores`);
    }
  }

  private validateHeaderValue(value: string): void {
    if (typeof value !== 'string') {
      throw new Error('Header value must be a string');
    }

    // HTTP header values should not contain control characters
    if (/[\x00-\x1f\x7f]/.test(value)) {
      throw new Error(`Invalid header value: contains control characters`);
    }
  }

  private validateHeaders(headers: Record<string, string>): void {
    if (!headers || typeof headers !== 'object') {
      throw new Error('Headers must be an object');
    }

    if (Array.isArray(headers)) {
      throw new Error('Headers must be an object, not an array');
    }

    Object.entries(headers).forEach(([key, value]) => {
      this.validateHeaderKey(key);
      this.validateHeaderValue(value);
    });
  }

  private validateTimeout(ms: number): void {
    if (typeof ms !== 'number' || ms <= 0 || !Number.isInteger(ms)) {
      throw new Error('Timeout must be a positive integer');
    }

    if (ms > 300000) { // 5 minutes
      console.warn(`Warning: timeout value ${ms}ms is very high (>5 minutes). Consider using a smaller timeout.`);
    }

    if (ms < 100) {
      console.warn(`Warning: timeout value ${ms}ms is very low (<100ms). This may cause premature timeouts.`);
    }
  }

  private validateVariableKey(key: string): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Variable key must be a non-empty string');
    }

    // Variable names should be valid JavaScript identifiers
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      throw new Error(`Variable key '${key}' must be a valid identifier (start with letter, underscore, or $, followed by letters, numbers, underscores, or $)`);
    }

    // Reserved keywords check
    const reservedWords = ['this', 'global', 'local', 'undefined', 'null', 'true', 'false'];
    if (reservedWords.includes(key)) {
      throw new Error(`Variable key '${key}' is reserved and cannot be used`);
    }
  }

  private validateVariables(vars: Record<string, any>): void {
    if (!vars || typeof vars !== 'object') {
      throw new Error('Variables must be an object');
    }

    if (Array.isArray(vars)) {
      throw new Error('Variables must be an object, not an array');
    }

    Object.keys(vars).forEach(key => {
      this.validateVariableKey(key);
    });
  }

  private validateQueryParams(params: Record<string, any>): void {
    if (!params || typeof params !== 'object') {
      throw new Error('Query parameters must be an object');
    }

    if (Array.isArray(params)) {
      throw new Error('Query parameters must be an object, not an array');
    }

    Object.keys(params).forEach(key => {
      this.validateQueryParamKey(key);
    });
  }

  private validateQueryParamKey(key: string): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Query parameter key must be a non-empty string');
    }

    // Query parameter names should not contain special characters that could break URLs
    if (/[&=?#]/.test(key)) {
      throw new Error(`Query parameter key '${key}' contains invalid characters (&, =, ?, or #)`);
    }
  }
}