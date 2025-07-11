// src/core/dsl/WhenStep.ts

import { 
  IWhenStep, 
  IThenStep, 
  RequestConfig, 
  RestifiedResponse,
  GraphQLRequest,
  WebSocketConfig,
  HttpMethod
} from '../../types/RestifiedTypes';
import { ThenStep } from './ThenStep';
import { ClientManager } from '../clients/ClientManager';
import { VariableStore } from '../stores/VariableStore';
import { ResponseStore } from '../stores/ResponseStore';
import { SnapshotStore } from '../stores/SnapshotStore';
import { AuditLogger } from '../../logging/AuditLogger';
import { Config } from '../config/Config';
import { JsonPlaceholderResolver } from '../../utils/JsonPlaceholderResolver';

/**
 * Implementation of the "when" step in the fluent DSL
 * Handles HTTP request execution with comprehensive error handling and logging
 * 
 * @example
 * ```typescript
 * restified
 *   .given()
 *   .baseURL('https://api.example.com')
 *   .when()
 *   .post('/users', { name: 'John', email: 'john@example.com' })
 *   .execute()
 *   .then()
 *   .statusCode(201)
 *   .jsonPath('$.id', (id) => expect(id).to.be.a('number'));
 * ```
 */
export class WhenStep implements IWhenStep {
  private requestConfig: RequestConfig;
  private isExecuted: boolean = false;
  private jsonPlaceholderResolver: JsonPlaceholderResolver;

  constructor(
    private readonly clientManager: ClientManager,
    private readonly variableStore: VariableStore,
    private readonly responseStore: ResponseStore,
    private readonly snapshotStore: SnapshotStore,
    private readonly auditLogger: AuditLogger,
    private readonly config: Config,
    private readonly givenConfig: Partial<RequestConfig>
  ) {
    // Initialize request config with defaults from given step
    this.requestConfig = {
      method: 'GET',
      url: '',
      headers: {},
      params: {},
      ...givenConfig
    };

    this.jsonPlaceholderResolver = new JsonPlaceholderResolver(this.variableStore);
    this.auditLogger.debug('[WHEN] Initializing WhenStep');
  }

  /**
   * Perform GET request
   * 
   * @param url - Request URL (supports variable resolution)
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed or URL is invalid
   */
  get(url: string): IWhenStep {
    this.validateNotExecuted();
    this.validateUrl(url);
    
    this.requestConfig.method = 'GET';
    this.requestConfig.url = this.resolveUrl(url);
    
    this.auditLogger.debug(`[WHEN] Configured GET request to: ${this.requestConfig.url}`);
    return this;
  }

  /**
   * Perform POST request
   * 
   * @param url - Request URL (supports variable resolution)
   * @param data - Request body data (supports JSON placeholder resolution)
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed or URL is invalid
   */
  post(url: string, data?: any): IWhenStep {
    this.validateNotExecuted();
    this.validateUrl(url);
    
    this.requestConfig.method = 'POST';
    this.requestConfig.url = this.resolveUrl(url);
    
    if (data !== undefined) {
      this.requestConfig.data = this.resolveRequestData(data);
      this.auditLogger.debug(`[WHEN] Configured POST data: ${JSON.stringify(this.requestConfig.data)}`);
    }
    
    this.auditLogger.debug(`[WHEN] Configured POST request to: ${this.requestConfig.url}`);
    return this;
  }

  /**
   * Perform PUT request
   * 
   * @param url - Request URL (supports variable resolution)
   * @param data - Request body data (supports JSON placeholder resolution)
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed or URL is invalid
   */
  put(url: string, data?: any): IWhenStep {
    this.validateNotExecuted();
    this.validateUrl(url);
    
    this.requestConfig.method = 'PUT';
    this.requestConfig.url = this.resolveUrl(url);
    
    if (data !== undefined) {
      this.requestConfig.data = this.resolveRequestData(data);
      this.auditLogger.debug(`[WHEN] Configured PUT data: ${JSON.stringify(this.requestConfig.data)}`);
    }
    
    this.auditLogger.debug(`[WHEN] Configured PUT request to: ${this.requestConfig.url}`);
    return this;
  }

  /**
   * Perform DELETE request
   * 
   * @param url - Request URL (supports variable resolution)
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed or URL is invalid
   */
  delete(url: string): IWhenStep {
    this.validateNotExecuted();
    this.validateUrl(url);
    
    this.requestConfig.method = 'DELETE';
    this.requestConfig.url = this.resolveUrl(url);
    
    this.auditLogger.debug(`[WHEN] Configured DELETE request to: ${this.requestConfig.url}`);
    return this;
  }

  /**
   * Perform PATCH request
   * 
   * @param url - Request URL (supports variable resolution)
   * @param data - Request body data (supports JSON placeholder resolution)
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed or URL is invalid
   */
  patch(url: string, data?: any): IWhenStep {
    this.validateNotExecuted();
    this.validateUrl(url);
    
    this.requestConfig.method = 'PATCH';
    this.requestConfig.url = this.resolveUrl(url);
    
    if (data !== undefined) {
      this.requestConfig.data = this.resolveRequestData(data);
      this.auditLogger.debug(`[WHEN] Configured PATCH data: ${JSON.stringify(this.requestConfig.data)}`);
    }
    
    this.auditLogger.debug(`[WHEN] Configured PATCH request to: ${this.requestConfig.url}`);
    return this;
  }

  /**
   * Perform HEAD request
   * 
   * @param url - Request URL (supports variable resolution)
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed or URL is invalid
   */
  head(url: string): IWhenStep {
    this.validateNotExecuted();
    this.validateUrl(url);
    
    this.requestConfig.method = 'HEAD';
    this.requestConfig.url = this.resolveUrl(url);
    
    this.auditLogger.debug(`[WHEN] Configured HEAD request to: ${this.requestConfig.url}`);
    return this;
  }

  /**
   * Perform OPTIONS request
   * 
   * @param url - Request URL (supports variable resolution)
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed or URL is invalid
   */
  options(url: string): IWhenStep {
    this.validateNotExecuted();
    this.validateUrl(url);
    
    this.requestConfig.method = 'OPTIONS';
    this.requestConfig.url = this.resolveUrl(url);
    
    this.auditLogger.debug(`[WHEN] Configured OPTIONS request to: ${this.requestConfig.url}`);
    return this;
  }

  /**
   * Perform GraphQL request
   * Automatically sets up POST request with proper headers and GraphQL payload
   * 
   * @param request - GraphQL request configuration
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed or GraphQL request is invalid
   */
  graphql(request: GraphQLRequest): IWhenStep {
    this.validateNotExecuted();
    this.validateGraphQLRequest(request);
    
    this.requestConfig.method = 'POST';
    this.requestConfig.url = this.resolveUrl('/graphql'); // Default GraphQL endpoint
    
    // Set up GraphQL-specific headers
    this.requestConfig.headers = {
      ...this.requestConfig.headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Resolve variables in GraphQL query and variables
    const resolvedRequest = {
      query: this.resolveVariables(request.query),
      variables: request.variables ? this.resolveRequestData(request.variables) : undefined,
      operationName: request.operationName ? this.resolveVariables(request.operationName) : undefined
    };
    
    this.requestConfig.data = resolvedRequest;
    
    this.auditLogger.debug(`[WHEN] Configured GraphQL request: ${request.operationName || 'Anonymous'}`);
    return this;
  }

  /**
   * Configure WebSocket connection
   * Note: This sets up the configuration but doesn't establish connection yet
   * 
   * @param config - WebSocket configuration
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed or WebSocket config is invalid
   */
  websocket(config: WebSocketConfig): IWhenStep {
    this.validateNotExecuted();
    this.validateWebSocketConfig(config);
    
    // Store WebSocket config for later use in execute()
    this.requestConfig.url = this.resolveUrl(config.url);
    this.requestConfig.data = config;
    this.requestConfig.method = 'WEBSOCKET' as any; // Custom method for WebSocket
    
    this.auditLogger.debug(`[WHEN] Configured WebSocket connection to: ${this.requestConfig.url}`);
    return this;
  }

  /**
   * Set request body data
   * Supports JSON placeholder resolution and variable substitution
   * 
   * @param data - Request body data
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed
   */
  body(data: any): IWhenStep {
    this.validateNotExecuted();
    
    this.requestConfig.data = this.resolveRequestData(data);
    this.auditLogger.debug(`[WHEN] Set request body: ${JSON.stringify(this.requestConfig.data)}`);
    return this;
  }

  /**
   * Add or override headers for this request
   * 
   * @param headers - Headers to add/override
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed
   */
  headers(headers: Record<string, string>): IWhenStep {
    this.validateNotExecuted();
    this.validateHeaders(headers);
    
    this.requestConfig.headers = {
      ...this.requestConfig.headers,
      ...headers
    };
    
    this.auditLogger.debug(`[WHEN] Added headers: ${JSON.stringify(headers)}`);
    return this;
  }

  /**
   * Add or override query parameters for this request
   * 
   * @param params - Query parameters to add/override
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed
   */
  queryParams(params: Record<string, any>): IWhenStep {
    this.validateNotExecuted();
    this.validateQueryParams(params);
    
    this.requestConfig.params = {
      ...this.requestConfig.params,
      ...params
    };
    
    this.auditLogger.debug(`[WHEN] Added query params: ${JSON.stringify(params)}`);
    return this;
  }

  /**
   * Set response type for the request
   * 
   * @param responseType - Expected response type
   * @returns Current WhenStep instance for chaining
   * @throws Error if step has already been executed
   */
  responseType(responseType: 'json' | 'text' | 'blob' | 'arraybuffer'): IWhenStep {
    this.validateNotExecuted();
    
    this.requestConfig.responseType = responseType;
    this.auditLogger.debug(`[WHEN] Set response type: ${responseType}`);
    return this;
  }

  /**
   * Execute the configured HTTP request
   * This is the terminal operation that actually performs the request
   * 
   * @returns Promise resolving to ThenStep for assertions
   * @throws Error if no HTTP method has been configured or request fails
   */
  async execute(): Promise<IThenStep> {
    this.validateCanExecute();
    this.isExecuted = true;
    
    const startTime = Date.now();
    this.auditLogger.info(`[WHEN] Executing ${this.requestConfig.method} request to: ${this.requestConfig.url}`);
    
    try {
      let response: RestifiedResponse;
      
      // Handle different request types
      if (this.requestConfig.method === 'WEBSOCKET') {
        response = await this.executeWebSocketRequest();
      } else {
        response = await this.executeHttpRequest();
      }
      
      const duration = Date.now() - startTime;
      this.auditLogger.info(`[WHEN] Request completed in ${duration}ms with status: ${response.status}`);
      
      return new ThenStep(
        response,
        this.variableStore,
        this.responseStore,
        this.snapshotStore,
        this.auditLogger,
        this.config
      );
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.auditLogger.error(`[WHEN] Request failed after ${duration}ms: ${(error as Error).message}`);
      
      // Create a ThenStep even for failed requests to allow error assertions
      const errorResponse: RestifiedResponse = {
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        data: null,
        responseTime: duration,
        url: this.requestConfig.url,
        config: this.requestConfig
      };
      
      const thenStep = new ThenStep(
        errorResponse,
        this.variableStore,
        this.responseStore,
        this.snapshotStore,
        this.auditLogger,
        this.config
      );
      
      // Attach the original error for detailed error assertions
      (thenStep as any).executionError = error;
      
      return thenStep;
    }
  }

  /**
   * Execute HTTP request using the configured client
   * 
   * @returns Promise resolving to RestifiedResponse
   */
  private async executeHttpRequest(): Promise<RestifiedResponse> {
    const client = this.clientManager.getActiveClient();
    
    // Log request details for audit trail
    this.auditLogger.debug(`[WHEN] Request config: ${JSON.stringify({
      method: this.requestConfig.method,
      url: this.requestConfig.url,
      headers: this.requestConfig.headers,
      params: this.requestConfig.params,
      hasBody: !!this.requestConfig.data
    })}`);
    
    return await client.request(this.requestConfig);
  }

  /**
   * Execute WebSocket connection (placeholder for future implementation)
   * 
   * @returns Promise resolving to RestifiedResponse
   */
  private async executeWebSocketRequest(): Promise<RestifiedResponse> {
    // TODO: Implement WebSocket client integration
    throw new Error('WebSocket support is not yet implemented');
  }

  /**
   * Resolve URL with variable substitution
   * 
   * @param url - URL template with possible variables
   * @returns Resolved URL
   */
  private resolveUrl(url: string): string {
    return this.resolveVariables(url);
  }

  /**
   * Resolve request data with JSON placeholder resolution
   * 
   * @param data - Request data that may contain placeholders
   * @returns Resolved data
   */
  private resolveRequestData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }
    
    if (typeof data === 'string') {
      return this.resolveVariables(data);
    }
    
    if (typeof data === 'object') {
      return this.jsonPlaceholderResolver.resolve(data);
    }
    
    return data;
  }

  /**
   * Resolve variables in string using {{variableName}} syntax
   * 
   * @param value - String that may contain variable placeholders
   * @returns Resolved string
   */
  private resolveVariables(value: string): string {
    if (typeof value !== 'string') {
      return value;
    }

    return value.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();
      const resolvedValue = this.variableStore.get(trimmedName);
      
      if (resolvedValue === undefined) {
        throw new Error(`Variable '${trimmedName}' is not defined. Available variables: ${this.variableStore.getKeys().join(', ')}`);
      }
      
      return String(resolvedValue);
    });
  }

  // ==========================================
  // VALIDATION METHODS
  // ==========================================

  private validateNotExecuted(): void {
    if (this.isExecuted) {
      throw new Error('This WhenStep has already been executed. Create a new request chain.');
    }
  }

  private validateCanExecute(): void {
    if (!this.requestConfig.url) {
      throw new Error('No URL specified. Use one of the HTTP methods (get, post, put, delete, etc.) to set the URL.');
    }
    
    if (!this.requestConfig.method || this.requestConfig.method === 'GET') {
      // GET is the default, so it's always valid
      return;
    }
    
    // Validate that method-specific requirements are met
    if (['POST', 'PUT', 'PATCH'].includes(this.requestConfig.method) && 
        this.requestConfig.data === undefined && 
        !this.hasContentTypeHeader()) {
      console.warn(`[WHEN] Warning: ${this.requestConfig.method} request without body data. This might not be intended.`);
    }
  }

  private hasContentTypeHeader(): boolean {
    if (!this.requestConfig.headers) {
      return false;
    }
    
    return Object.keys(this.requestConfig.headers).some(
      key => key.toLowerCase() === 'content-type'
    );
  }

  private validateUrl(url: string): void {
    if (typeof url !== 'string' || url.trim() === '') {
      throw new Error('URL must be a non-empty string');
    }

    // Allow relative URLs (starting with /) or absolute URLs
    if (!url.startsWith('/') && !url.includes('://')) {
      throw new Error(`Invalid URL format: ${url}. URL must be absolute (with protocol) or relative (starting with /)`);
    }
  }

  private validateGraphQLRequest(request: GraphQLRequest): void {
    if (!request || typeof request !== 'object') {
      throw new Error('GraphQL request must be an object');
    }

    if (!request.query || typeof request.query !== 'string') {
      throw new Error('GraphQL request must have a query string');
    }

    if (request.query.trim() === '') {
      throw new Error('GraphQL query cannot be empty');
    }

    if (request.variables && typeof request.variables !== 'object') {
      throw new Error('GraphQL variables must be an object');
    }

    if (request.operationName && typeof request.operationName !== 'string') {
      throw new Error('GraphQL operationName must be a string');
    }
  }

  private validateWebSocketConfig(config: WebSocketConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error('WebSocket config must be an object');
    }

    if (!config.url || typeof config.url !== 'string') {
      throw new Error('WebSocket config must have a URL string');
    }

    if (!config.url.startsWith('ws://') && !config.url.startsWith('wss://')) {
      throw new Error('WebSocket URL must start with ws:// or wss://');
    }

    if (config.protocols && !Array.isArray(config.protocols)) {
      throw new Error('WebSocket protocols must be an array');
    }

    if (config.headers && typeof config.headers !== 'object') {
      throw new Error('WebSocket headers must be an object');
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new Error('WebSocket timeout must be a positive number');
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
      if (typeof key !== 'string' || key.trim() === '') {
        throw new Error('Header key must be a non-empty string');
      }

      if (typeof value !== 'string') {
        throw new Error('Header value must be a string');
      }
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
      if (typeof key !== 'string' || key.trim() === '') {
        throw new Error('Query parameter key must be a non-empty string');
      }
    });
  }
}