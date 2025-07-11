// src/core/clients/HttpClient.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import * as fs from 'fs';
import { 
  RestifiedConfig, 
  RequestConfig, 
  RestifiedResponse, 
  AuthProvider,
  RestifiedError,
  TimeoutError,
  RetryError
} from '../../types/RestifiedTypes';
import { RetryManager } from '../../utils/RetryManager';
import { PerformanceTracker } from '../../utils/PerformanceTracker';
import { InterceptorManager } from '../../interceptors/InterceptorManager';

/**
 * Production-grade HTTP client with comprehensive error handling,
 * retry logic, performance tracking, and interceptor support
 */
export class HttpClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly retryManager: RetryManager;
  private readonly performanceTracker: PerformanceTracker;
  private readonly interceptorManager: InterceptorManager;
  private readonly config: RestifiedConfig;
  private authProvider?: AuthProvider;

  constructor(config: RestifiedConfig) {
    this.config = { ...config };
    this.retryManager = new RetryManager(config.retryConfig);
    this.performanceTracker = new PerformanceTracker();
    this.interceptorManager = new InterceptorManager();
    
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * Execute HTTP request with full error handling and retry logic
   * @param requestConfig Request configuration
   * @returns Promise resolving to RestifiedResponse
   */
  async request(requestConfig: RequestConfig): Promise<RestifiedResponse> {
    const enrichedConfig = await this.enrichRequestConfig(requestConfig);
    
    return this.retryManager.execute(async () => {
      const startTime = performance.now();
      
      try {
        // Apply request interceptors
        const interceptedConfig = await this.interceptorManager.processRequest(enrichedConfig);
        
        // Execute the actual HTTP request
        const axiosResponse = await this.axiosInstance.request(this.toAxiosConfig(interceptedConfig));
        
        // Create RestifiedResponse with performance metrics
        const restifiedResponse = await this.createRestifiedResponse(
          axiosResponse, 
          interceptedConfig, 
          startTime
        );
        
        // Apply response interceptors
        return await this.interceptorManager.processResponse(restifiedResponse);
        
      } catch (error) {
        // Handle and transform errors
        const transformedError = await this.handleError(error, enrichedConfig, startTime);
        throw transformedError;
      }
    });
  }

  /**
   * Perform GET request
   * @param url Request URL
   * @param config Optional request configuration
   * @returns Promise resolving to RestifiedResponse
   */
  async get(url: string, config?: Partial<RequestConfig>): Promise<RestifiedResponse> {
    return this.request({ method: 'GET', url, ...config });
  }

  /**
   * Perform POST request
   * @param url Request URL
   * @param data Request body data
   * @param config Optional request configuration
   * @returns Promise resolving to RestifiedResponse
   */
  async post(url: string, data?: any, config?: Partial<RequestConfig>): Promise<RestifiedResponse> {
    return this.request({ method: 'POST', url, data, ...config });
  }

  /**
   * Perform PUT request
   * @param url Request URL
   * @param data Request body data
   * @param config Optional request configuration
   * @returns Promise resolving to RestifiedResponse
   */
  async put(url: string, data?: any, config?: Partial<RequestConfig>): Promise<RestifiedResponse> {
    return this.request({ method: 'PUT', url, data, ...config });
  }

  /**
   * Perform DELETE request
   * @param url Request URL
   * @param config Optional request configuration
   * @returns Promise resolving to RestifiedResponse
   */
  async delete(url: string, config?: Partial<RequestConfig>): Promise<RestifiedResponse> {
    return this.request({ method: 'DELETE', url, ...config });
  }

  /**
   * Perform PATCH request
   * @param url Request URL
   * @param data Request body data
   * @param config Optional request configuration
   * @returns Promise resolving to RestifiedResponse
   */
  async patch(url: string, data?: any, config?: Partial<RequestConfig>): Promise<RestifiedResponse> {
    return this.request({ method: 'PATCH', url, data, ...config });
  }

  /**
   * Perform HEAD request
   * @param url Request URL
   * @param config Optional request configuration
   * @returns Promise resolving to RestifiedResponse
   */
  async head(url: string, config?: Partial<RequestConfig>): Promise<RestifiedResponse> {
    return this.request({ method: 'HEAD', url, ...config });
  }

  /**
   * Perform OPTIONS request
   * @param url Request URL
   * @param config Optional request configuration
   * @returns Promise resolving to RestifiedResponse
   */
  async options(url: string, config?: Partial<RequestConfig>): Promise<RestifiedResponse> {
    return this.request({ method: 'OPTIONS', url, ...config });
  }

  /**
   * Set authentication provider
   * @param authProvider Authentication provider instance
   */
  setAuthProvider(authProvider: AuthProvider): void {
    this.authProvider = authProvider;
  }

  /**
   * Clear authentication provider
   */
  clearAuthProvider(): void {
    this.authProvider = undefined;
  }

  /**
   * Add request interceptor
   * @param interceptor Request interceptor function
   */
  addRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  ): void {
    this.interceptorManager.addRequestInterceptor(interceptor);
  }

  /**
   * Add response interceptor
   * @param interceptor Response interceptor function
   */
  addResponseInterceptor(
    interceptor: (response: RestifiedResponse) => RestifiedResponse | Promise<RestifiedResponse>
  ): void {
    this.interceptorManager.addResponseInterceptor(interceptor);
  }

  /**
   * Clear all interceptors
   */
  clearInterceptors(): void {
    this.interceptorManager.clear();
  }

  /**
   * Get performance metrics
   * @returns Current performance metrics
   */
  getPerformanceMetrics(): any {
    return this.performanceTracker.getMetrics();
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceTracker.reset();
  }

  /**
   * Update client configuration
   * @param updates Configuration updates
   */
  updateConfig(updates: Partial<RestifiedConfig>): void {
    Object.assign(this.config, updates);
    
    // Recreate axios instance with new config if needed
    if (this.shouldRecreateInstance(updates)) {
      const newInstance = this.createAxiosInstance();
      
      // Transfer existing interceptors
      this.axiosInstance.interceptors.request.handlers = [];
      this.axiosInstance.interceptors.response.handlers = [];
      
      Object.assign(this.axiosInstance, newInstance);
      this.setupInterceptors();
    }
  }

  /**
   * Create Axios instance with proper configuration
   * @returns Configured Axios instance
   */
  private createAxiosInstance(): AxiosInstance {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRedirects: 5,
      validateStatus: () => true, // We handle all status codes
    };

    // Configure proxy if provided
    if (this.config.proxy) {
      axiosConfig.proxy = {
        protocol: this.config.proxy.protocol,
        host: this.config.proxy.host,
        port: this.config.proxy.port,
        auth: this.config.proxy.auth ? {
          username: this.config.proxy.auth.username,
          password: this.config.proxy.auth.password
        } : undefined
      };
    }

    // Configure SSL if provided
    if (this.config.ssl) {
      const httpsAgent = this.createHttpsAgent();
      axiosConfig.httpsAgent = httpsAgent;
    }

    // Configure HTTP agents for connection pooling
    axiosConfig.httpAgent = new HttpAgent({ keepAlive: true });
    if (!axiosConfig.httpsAgent) {
      axiosConfig.httpsAgent = new HttpsAgent({ keepAlive: true });
    }

    return axios.create(axiosConfig);
  }

  /**
   * Create HTTPS agent with SSL configuration
   * @returns Configured HTTPS agent
   */
  private createHttpsAgent(): HttpsAgent {
    const agentOptions: any = {
      keepAlive: true,
      rejectUnauthorized: this.config.ssl?.rejectUnauthorized ?? true
    };

    if (this.config.ssl?.ca) {
      agentOptions.ca = fs.readFileSync(this.config.ssl.ca);
    }

    if (this.config.ssl?.cert) {
      agentOptions.cert = fs.readFileSync(this.config.ssl.cert);
    }

    if (this.config.ssl?.key) {
      agentOptions.key = fs.readFileSync(this.config.ssl.key);
    }

    return new HttpsAgent(agentOptions);
  }

  /**
   * Setup default Axios interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for performance tracking
    this.axiosInstance.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: performance.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for performance tracking
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const endTime = performance.now();
        const startTime = response.config.metadata?.startTime || endTime;
        response.metadata = { 
          responseTime: endTime - startTime,
          endTime 
        };
        return response;
      },
      (error) => {
        const endTime = performance.now();
        const startTime = error.config?.metadata?.startTime || endTime;
        error.metadata = { 
          responseTime: endTime - startTime,
          endTime 
        };
        return Promise.reject(error);
      }
    );
  }

  /**
   * Enrich request configuration with defaults and authentication
   * @param requestConfig Base request configuration
   * @returns Promise resolving to enriched configuration
   */
  private async enrichRequestConfig(requestConfig: RequestConfig): Promise<RequestConfig> {
    let enrichedConfig = { ...requestConfig };

    // Apply authentication if provider is set
    if (this.authProvider) {
      enrichedConfig = await this.authProvider.authenticate(enrichedConfig);
    }

    // Set default headers
    enrichedConfig.headers = {
      'User-Agent': 'RestifiedTS/1.0.0',
      'Accept': 'application/json, text/plain, */*',
      ...enrichedConfig.headers
    };

    // Set content type for requests with body
    if (enrichedConfig.data && !enrichedConfig.headers['Content-Type']) {
      if (typeof enrichedConfig.data === 'object') {
        enrichedConfig.headers['Content-Type'] = 'application/json';
      }
    }

    return enrichedConfig;
  }

  /**
   * Convert RestifiedRequest to AxiosRequestConfig
   * @param config RestifiedRequest configuration
   * @returns Axios-compatible configuration
   */
  private toAxiosConfig(config: RequestConfig): AxiosRequestConfig {
    return {
      method: config.method.toLowerCase() as any,
      url: config.url,
      headers: config.headers,
      params: config.params,
      data: config.data,
      timeout: config.timeout,
      responseType: config.responseType || 'json'
    };
  }

  /**
   * Create RestifiedResponse from Axios response
   * @param axiosResponse Axios response object
   * @param requestConfig Original request configuration
   * @param startTime Request start time
   * @returns Promise resolving to RestifiedResponse
   */
  private async createRestifiedResponse(
    axiosResponse: AxiosResponse,
    requestConfig: RequestConfig,
    startTime: number
  ): Promise<RestifiedResponse> {
    const endTime = performance.now();
    const responseTime = axiosResponse.metadata?.responseTime || (endTime - startTime);

    // Track performance metrics
    this.performanceTracker.recordRequest(responseTime, axiosResponse.status);

    const restifiedResponse: RestifiedResponse = {
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers: this.normalizeHeaders(axiosResponse.headers),
      data: axiosResponse.data,
      responseTime,
      url: axiosResponse.config.url || requestConfig.url,
      config: requestConfig
    };

    return restifiedResponse;
  }

  /**
   * Handle and transform errors into RestifiedError types
   * @param error Original error
   * @param requestConfig Request configuration
   * @param startTime Request start time
   * @returns Promise resolving to transformed error
   */
  private async handleError(
    error: any,
    requestConfig: RequestConfig,
    startTime: number
  ): Promise<RestifiedError> {
    const endTime = performance.now();
    const responseTime = error.metadata?.responseTime || (endTime - startTime);

    // Track failed request metrics
    this.performanceTracker.recordRequest(responseTime, error.response?.status || 0);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Timeout error
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        return new TimeoutError(
          `Request timed out after ${requestConfig.timeout || this.config.timeout}ms`,
          requestConfig.timeout || this.config.timeout
        );
      }

      // Network error
      if (!axiosError.response) {
        return new RestifiedError(
          `Network error: ${axiosError.message}`,
          undefined
        );
      }

      // HTTP error with response
      const restifiedResponse: RestifiedResponse = {
        status: axiosError.response.status,
        statusText: axiosError.response.statusText,
        headers: this.normalizeHeaders(axiosError.response.headers),
        data: axiosError.response.data,
        responseTime,
        url: axiosError.response.config.url || requestConfig.url,
        config: requestConfig
      };

      return new RestifiedError(
        `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`,
        restifiedResponse
      );
    }

    // Generic error
    return new RestifiedError(
      error.message || 'Unknown error occurred',
      undefined
    );
  }

  /**
   * Normalize response headers to consistent format
   * @param headers Raw headers object
   * @returns Normalized headers
   */
  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};
    
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        normalized[key.toLowerCase()] = String(value);
      });
    }
    
    return normalized;
  }

  /**
   * Check if Axios instance should be recreated based on config changes
   * @param updates Configuration updates
   * @returns True if instance should be recreated
   */
  private shouldRecreateInstance(updates: Partial<RestifiedConfig>): boolean {
    const recreateKeys = ['baseURL', 'timeout', 'proxy', 'ssl'];
    return recreateKeys.some(key => key in updates);
  }
}

// src/core/clients/ClientManager.ts

import { RestifiedConfig } from '../../types/RestifiedTypes';
import { HttpClient } from './HttpClient';

/**
 * Manages multiple HTTP client instances for multi-service testing
 */
export class ClientManager {
  private clients: Map<string, HttpClient> = new Map();
  private activeClientName: string = 'default';
  private defaultConfig: RestifiedConfig;

  constructor(defaultConfig: RestifiedConfig) {
    this.defaultConfig = { ...defaultConfig };
    this.createClient('default', defaultConfig);
  }

  /**
   * Create a new HTTP client instance
   * @param name Client instance name
   * @param config Client configuration
   * @throws Error if client name already exists
   */
  createClient(name: string, config: Partial<RestifiedConfig>): void {
    if (this.clients.has(name)) {
      throw new Error(`Client '${name}' already exists. Use updateClient() to modify existing clients.`);
    }

    const mergedConfig = this.mergeWithDefaults(config);
    const client = new HttpClient(mergedConfig);
    this.clients.set(name, client);
  }

  /**
   * Get a client instance by name
   * @param name Client instance name
   * @returns HttpClient instance
   * @throws Error if client doesn't exist
   */
  getClient(name: string): HttpClient {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`Client '${name}' does not exist. Create it first using createClient().`);
    }
    return client;
  }

  /**
   * Get the currently active client
   * @returns Active HttpClient instance
   */
  getActiveClient(): HttpClient {
    return this.getClient(this.activeClientName);
  }

  /**
   * Set the active client
   * @param name Client instance name
   * @throws Error if client doesn't exist
   */
  setActiveClient(name: string): void {
    if (!this.clients.has(name)) {
      throw new Error(`Client '${name}' does not exist.`);
    }
    this.activeClientName = name;
  }

  /**
   * Get the active client name
   * @returns Active client name
   */
  getActiveClientName(): string {
    return this.activeClientName;
  }

  /**
   * Update an existing client's configuration
   * @param name Client instance name
   * @param updates Configuration updates
   * @throws Error if client doesn't exist
   */
  updateClient(name: string, updates: Partial<RestifiedConfig>): void {
    const client = this.getClient(name);
    client.updateConfig(updates);
  }

  /**
   * Delete a client instance
   * @param name Client instance name
   * @returns True if client was deleted
   */
  deleteClient(name: string): boolean {
    if (name === 'default') {
      throw new Error('Cannot delete the default client');
    }
    
    const deleted = this.clients.delete(name);
    
    // Switch to default if active client was deleted
    if (deleted && this.activeClientName === name) {
      this.activeClientName = 'default';
    }
    
    return deleted;
  }

  /**
   * Get all client names
   * @returns Array of client names
   */
  getClientNames(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Check if a client exists
   * @param name Client instance name
   * @returns True if client exists
   */
  hasClient(name: string): boolean {
    return this.clients.has(name);
  }

  /**
   * Get client count
   * @returns Number of registered clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Clear all clients except default
   */
  clearClients(): void {
    const defaultClient = this.clients.get('default');
    this.clients.clear();
    
    if (defaultClient) {
      this.clients.set('default', defaultClient);
    }
    
    this.activeClientName = 'default';
  }

  /**
   * Merge configuration with defaults
   * @param config Partial configuration
   * @returns Complete configuration
   */
  private mergeWithDefaults(config: Partial<RestifiedConfig>): RestifiedConfig {
    return {
      ...this.defaultConfig,
      ...config,
      retryConfig: {
        ...this.defaultConfig.retryConfig,
        ...config.retryConfig
      },
      logging: {
        ...this.defaultConfig.logging,
        ...config.logging
      },
      reporting: {
        ...this.defaultConfig.reporting,
        ...config.reporting
      }
    };
  }
}

// src/utils/RetryManager.ts

import { RestifiedConfig, RetryError } from '../types/RestifiedTypes';

/**
 * Advanced retry manager with exponential backoff and configurable strategies
 */
export class RetryManager {
  private readonly config: RestifiedConfig['retryConfig'];

  constructor(config: RestifiedConfig['retryConfig']) {
    this.config = { ...config };
  }

  /**
   * Execute a function with retry logic
   * @param fn Function to execute
   * @returns Promise resolving to function result
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt <= this.config.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Don't retry if we've exceeded max attempts
        if (attempt > this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Calculate and apply delay
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw new RetryError(
      `Operation failed after ${attempt} attempts. Last error: ${lastError.message}`,
      attempt
    );
  }

  /**
   * Check if an error should trigger a retry
   * @param error Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are generally retryable
    if (error.code === 'ECONNRESET' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ECONNREFUSED') {
      return true;
    }

    // Check HTTP status codes
    if (error.response?.status) {
      return this.config.retryStatusCodes.includes(error.response.status);
    }

    // Timeout errors are retryable
    if (error.name === 'TimeoutError' || error.code === 'ECONNABORTED') {
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param attempt Current attempt number
   * @returns Delay in milliseconds
   */
  private calculateDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(this.config.backoffFactor, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   * @param ms Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// src/utils/PerformanceTracker.ts

import { PerformanceMetrics } from '../types/RestifiedTypes';

/**
 * Performance tracking and metrics collection
 */
export class PerformanceTracker {
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    statusCodeCounts: Record<number, number>;
    responseTimes: number[];
  };

  constructor() {
    this.reset();
  }

  /**
   * Record a request's performance metrics
   * @param responseTime Response time in milliseconds
   * @param statusCode HTTP status code
   */
  recordRequest(responseTime: number, statusCode: number): void {
    this.metrics.totalRequests++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.responseTimes.push(responseTime);

    // Update min/max response times
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);

    // Count status codes
    this.metrics.statusCodeCounts[statusCode] = (this.metrics.statusCodeCounts[statusCode] || 0) + 1;

    // Track success/failure
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
  }

  /**
   * Get current performance metrics
   * @returns Performance metrics object
   */
  getMetrics(): PerformanceMetrics & {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    successRate: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    statusCodeCounts: Record<number, number>;
  } {
    const avgResponseTime = this.metrics.totalRequests > 0 
      ? this.metrics.totalResponseTime / this.metrics.totalRequests 
      : 0;

    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
      : 0;

    // Calculate percentiles
    const sortedTimes = [...this.metrics.responseTimes].sort((a, b) => a - b);
    const p50 = this.calculatePercentile(sortedTimes, 0.5);
    const p95 = this.calculatePercentile(sortedTimes, 0.95);
    const p99 = this.calculatePercentile(sortedTimes, 0.99);

    return {
      responseTime: avgResponseTime,
      dnsLookupTime: 0, // TODO: Implement detailed timing
      tcpConnectTime: 0,
      tlsHandshakeTime: 0,
      firstByteTime: 0,
      downloadTime: 0,
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      averageResponseTime: avgResponseTime,
      successRate,
      p50ResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      statusCodeCounts: { ...this.metrics.statusCodeCounts }
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      statusCodeCounts: {},
      responseTimes: []
    };
  }

  /**
   * Calculate percentile from sorted array
   * @param sortedArray Sorted array of values
   * @param percentile Percentile to calculate (0-1)
   * @returns Percentile value
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = percentile * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    return sortedArray[lower] * (upper - index) + sortedArray[upper] * (index - lower);
  }
}

// src/interceptors/InterceptorManager.ts

import { RequestConfig, RestifiedResponse } from '../types/RestifiedTypes';

/**
 * Manages request and response interceptors
 */
export class InterceptorManager {
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig | Promise<RequestConfig>> = [];
  private responseInterceptors: Array<(response: RestifiedResponse) => RestifiedResponse | Promise<RestifiedResponse>> = [];

  /**
   * Add a request interceptor
   * @param interceptor Request interceptor function
   */
  addRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  ): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   * @param interceptor Response interceptor function
   */
  addResponseInterceptor(
    interceptor: (response: RestifiedResponse) => RestifiedResponse | Promise<RestifiedResponse>
  ): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Process request through all request interceptors
   * @param config Original request configuration
   * @returns Processed request configuration
   */
  async processRequest(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      try {
        processedConfig = await interceptor(processedConfig);
      } catch (error) {
        throw new Error(`Request interceptor failed: ${(error as Error).message}`);
      }
    }

    return processedConfig;
  }

  /**
   * Process response through all response interceptors
   * @param response Original response
   * @returns Processed response
   */
  async processResponse(response: RestifiedResponse): Promise<RestifiedResponse> {
    let processedResponse = { ...response };

    for (const interceptor of this.responseInterceptors) {
      try {
        processedResponse = await interceptor(processedResponse);
      } catch (error) {
        throw new Error(`Response interceptor failed: ${(error as Error).message}`);
      }
    }

    return processedResponse;
  }

  /**
   * Clear all interceptors
   */
  clear(): void {
    this.requestInterceptors.length = 0;
    this.responseInterceptors.length = 0;
  }

  /**
   * Get interceptor counts
   * @returns Object with request and response interceptor counts
   */
  getInterceptorCounts(): { request: number; response: number } {
    return {
      request: this.requestInterceptors.length,
      response: this.responseInterceptors.length
    };
  }
}

// src/core/auth/AuthProvider.ts

import { RequestConfig, AuthProvider as IAuthProvider } from '../../types/RestifiedTypes';

/**
 * Base authentication provider
 */
export abstract class AuthProvider implements IAuthProvider {
  abstract authenticate(config: RequestConfig): Promise<RequestConfig>;
  
  async refreshToken?(): Promise<void> {
    // Default implementation - override in subclasses if needed
  }
}

// src/core/auth/BearerAuth.ts

import { RequestConfig } from '../../types/RestifiedTypes';
import { AuthProvider } from './AuthProvider';

/**
 * Bearer token authentication provider
 */
export class BearerAuth extends AuthProvider {
  private token: string;

  constructor(token: string) {
    super();
    this.token = token;
  }

  /**
   * Apply bearer token authentication to request
   * @param config Request configuration
   * @returns Authenticated request configuration
   */
  async authenticate(config: RequestConfig): Promise<RequestConfig> {
    return {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${this.token}`
      }
    };
  }

  /**
   * Update the bearer token
   * @param token New bearer token
   */
  updateToken(token: string): void {
    this.token = token;
  }

  /**
   * Get current token
   * @returns Current bearer token
   */
  getToken(): string {
    return this.token;
  }
}

// src/core/auth/BasicAuth.ts

import { RequestConfig } from '../../types/RestifiedTypes';
import { AuthProvider } from './AuthProvider';

/**
 * Basic authentication provider
 */
export class BasicAuth extends AuthProvider {
  private username: string;
  private password: string;

  constructor(username: string, password: string) {
    super();
    this.username = username;
    this.password = password;
  }

  /**
   * Apply basic authentication to request
   * @param config Request configuration
   * @returns Authenticated request configuration
   */
  async authenticate(config: RequestConfig): Promise<RequestConfig> {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    
    return {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Basic ${credentials}`
      }
    };
  }

  /**
   * Update credentials
   * @param username New username
   * @param password New password
   */
  updateCredentials(username: string, password: string): void {
    this.username = username;
    this.password = password;
  }

  /**
   * Get current username
   * @returns Current username
   */
  getUsername(): string {
    return this.username;
  }
}