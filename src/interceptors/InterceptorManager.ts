// src/interceptors/InterceptorManager.ts

import { RequestConfig, RestifiedResponse } from '../types/RestifiedTypes';

/**
 * Advanced interceptor management system for request/response modification
 * 
 * Features:
 * - Request and response interceptors with priority ordering
 * - Async interceptor support
 * - Error handling and recovery
 * - Conditional interceptor execution
 * - Interceptor chaining with short-circuiting
 * - Performance monitoring of interceptors
 * - Dynamic interceptor registration/removal
 * - Interceptor grouping and categorization
 * 
 * @example
 * ```typescript
 * const interceptorManager = new InterceptorManager();
 * 
 * // Add request interceptor
 * interceptorManager.addRequestInterceptor(
 *   async (config) => {
 *     config.headers = { ...config.headers, 'X-Request-ID': generateId() };
 *     return config;
 *   },
 *   { priority: 100, name: 'request-id-injector' }
 * );
 * 
 * // Add response interceptor
 * interceptorManager.addResponseInterceptor(
 *   async (response) => {
 *     console.log(`Response received: ${response.status}`);
 *     return response;
 *   },
 *   { priority: 50, name: 'response-logger' }
 * );
 * ```
 */
export class InterceptorManager {
  private requestInterceptors: InterceptorEntry<RequestInterceptor>[] = [];
  private responseInterceptors: InterceptorEntry<ResponseInterceptor>[] = [];
  private errorInterceptors: InterceptorEntry<ErrorInterceptor>[] = [];
  private interceptorStats: Map<string, InterceptorStats> = new Map();
  private globalErrorHandler?: (error: Error, interceptorName: string) => void;
  private readonly maxExecutionTime: number = 5000; // 5 seconds max per interceptor

  constructor(options: InterceptorManagerOptions = {}) {
    this.globalErrorHandler = options.globalErrorHandler;
  }

  /**
   * Add a request interceptor
   * 
   * @param interceptor - Request interceptor function
   * @param options - Interceptor configuration options
   * @returns Interceptor ID for later removal
   */
  addRequestInterceptor(
    interceptor: RequestInterceptor,
    options: InterceptorOptions = {}
  ): string {
    const entry = this.createInterceptorEntry(interceptor, options);
    
    this.requestInterceptors.push(entry);
    this.sortInterceptors(this.requestInterceptors);
    this.initializeStats(entry.id);
    
    return entry.id;
  }

  /**
   * Add a response interceptor
   * 
   * @param interceptor - Response interceptor function
   * @param options - Interceptor configuration options
   * @returns Interceptor ID for later removal
   */
  addResponseInterceptor(
    interceptor: ResponseInterceptor,
    options: InterceptorOptions = {}
  ): string {
    const entry = this.createInterceptorEntry(interceptor, options);
    
    this.responseInterceptors.push(entry);
    this.sortInterceptors(this.responseInterceptors);
    this.initializeStats(entry.id);
    
    return entry.id;
  }

  /**
   * Add an error interceptor
   * 
   * @param interceptor - Error interceptor function
   * @param options - Interceptor configuration options
   * @returns Interceptor ID for later removal
   */
  addErrorInterceptor(
    interceptor: ErrorInterceptor,
    options: InterceptorOptions = {}
  ): string {
    const entry = this.createInterceptorEntry(interceptor, options);
    
    this.errorInterceptors.push(entry);
    this.sortInterceptors(this.errorInterceptors);
    this.initializeStats(entry.id);
    
    return entry.id;
  }

  /**
   * Remove an interceptor by ID
   * 
   * @param interceptorId - ID of interceptor to remove
   * @returns True if interceptor was removed
   */
  removeInterceptor(interceptorId: string): boolean {
    const removed = this.removeFromArray(this.requestInterceptors, interceptorId) ||
                   this.removeFromArray(this.responseInterceptors, interceptorId) ||
                   this.removeFromArray(this.errorInterceptors, interceptorId);
    
    if (removed) {
      this.interceptorStats.delete(interceptorId);
    }
    
    return removed;
  }

  /**
   * Remove interceptors by name
   * 
   * @param name - Name of interceptors to remove
   * @returns Number of interceptors removed
   */
  removeInterceptorsByName(name: string): number {
    let removedCount = 0;
    
    removedCount += this.removeFromArrayByName(this.requestInterceptors, name);
    removedCount += this.removeFromArrayByName(this.responseInterceptors, name);
    removedCount += this.removeFromArrayByName(this.errorInterceptors, name);
    
    return removedCount;
  }

  /**
   * Remove interceptors by group
   * 
   * @param group - Group name of interceptors to remove
   * @returns Number of interceptors removed
   */
  removeInterceptorsByGroup(group: string): number {
    let removedCount = 0;
    
    removedCount += this.removeFromArrayByGroup(this.requestInterceptors, group);
    removedCount += this.removeFromArrayByGroup(this.responseInterceptors, group);
    removedCount += this.removeFromArrayByGroup(this.errorInterceptors, group);
    
    return removedCount;
  }

  /**
   * Enable or disable an interceptor
   * 
   * @param interceptorId - ID of interceptor
   * @param enabled - Whether to enable or disable
   * @returns True if interceptor was found and updated
   */
  setInterceptorEnabled(interceptorId: string, enabled: boolean): boolean {
    const interceptor = this.findInterceptorById(interceptorId);
    if (interceptor) {
      interceptor.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Process request through all request interceptors
   * 
   * @param config - Original request configuration
   * @param context - Optional execution context
   * @returns Processed request configuration
   */
  async processRequest(
    config: RequestConfig, 
    context: InterceptorContext = {}
  ): Promise<RequestConfig> {
    let processedConfig = { ...config };
    const enabledInterceptors = this.getEnabledInterceptors(this.requestInterceptors);
    
    for (const entry of enabledInterceptors) {
      try {
        // Check if interceptor should run based on conditions
        if (!this.shouldExecuteInterceptor(entry, { config: processedConfig, context })) {
          continue;
        }

        const startTime = performance.now();
        
  async processRequest(
    config: RequestConfig, 
    context: InterceptorContext = {}
  ): Promise<RequestConfig> {
    let processedConfig = { ...config };
    const enabledInterceptors = this.getEnabledInterceptors(this.requestInterceptors);
    
    for (const entry of enabledInterceptors) {
      try {
        // Check if interceptor should run based on conditions
        if (!this.shouldExecuteInterceptor(entry, { config: processedConfig, context })) {
          continue;
        }

        const startTime = performance.now();
        
        // Execute interceptor with timeout
        processedConfig = await this.executeWithTimeout(
          () => entry.interceptor(processedConfig, context),
          this.maxExecutionTime,
          `Request interceptor '${entry.name}' timed out`
        );

        const executionTime = performance.now() - startTime;
        this.updateStats(entry.id, executionTime, true);

        // Check for short-circuit
        if (context.shortCircuit) {
          break;
        }

      } catch (error) {
        this.updateStats(entry.id, 0, false);
        await this.handleInterceptorError(error as Error, entry, 'request');
        
        // Re-throw if interceptor is critical
        if (entry.critical) {
          throw new Error(`Critical request interceptor '${entry.name}' failed: ${(error as Error).message}`);
        }
      }
    }
    
    return processedConfig;
  }

  /**
   * Process response through all response interceptors
   * 
   * @param response - Original response
   * @param context - Optional execution context
   * @returns Processed response
   */
  async processResponse(
    response: RestifiedResponse, 
    context: InterceptorContext = {}
  ): Promise<RestifiedResponse> {
    let processedResponse = { ...response };
    const enabledInterceptors = this.getEnabledInterceptors(this.responseInterceptors);
    
    for (const entry of enabledInterceptors) {
      try {
        // Check if interceptor should run based on conditions
        if (!this.shouldExecuteInterceptor(entry, { response: processedResponse, context })) {
          continue;
        }

        const startTime = performance.now();
        
        // Execute interceptor with timeout
        processedResponse = await this.executeWithTimeout(
          () => entry.interceptor(processedResponse, context),
          this.maxExecutionTime,
          `Response interceptor '${entry.name}' timed out`
        );

        const executionTime = performance.now() - startTime;
        this.updateStats(entry.id, executionTime, true);

        // Check for short-circuit
        if (context.shortCircuit) {
          break;
        }

      } catch (error) {
        this.updateStats(entry.id, 0, false);
        await this.handleInterceptorError(error as Error, entry, 'response');
        
        // Re-throw if interceptor is critical
        if (entry.critical) {
          throw new Error(`Critical response interceptor '${entry.name}' failed: ${(error as Error).message}`);
        }
      }
    }
    
    return processedResponse;
  }

  /**
   * Process error through all error interceptors
   * 
   * @param error - Original error
   * @param context - Optional execution context
   * @returns Processed error or recovery response
   */
  async processError(
    error: Error, 
    context: InterceptorContext = {}
  ): Promise<Error | RestifiedResponse> {
    let processedError: Error | RestifiedResponse = error;
    const enabledInterceptors = this.getEnabledInterceptors(this.errorInterceptors);
    
    for (const entry of enabledInterceptors) {
      try {
        // Check if interceptor should run based on conditions
        if (!this.shouldExecuteInterceptor(entry, { error: processedError, context })) {
          continue;
        }

        const startTime = performance.now();
        
        // Execute interceptor with timeout
        const result = await this.executeWithTimeout(
          () => entry.interceptor(processedError as Error, context),
          this.maxExecutionTime,
          `Error interceptor '${entry.name}' timed out`
        );

        if (result !== undefined) {
          processedError = result;
        }

        const executionTime = performance.now() - startTime;
        this.updateStats(entry.id, executionTime, true);

        // Check for short-circuit or recovery
        if (context.shortCircuit || this.isRecoveryResponse(result)) {
          break;
        }

      } catch (interceptorError) {
        this.updateStats(entry.id, 0, false);
        await this.handleInterceptorError(interceptorError as Error, entry, 'error');
        // Don't re-throw for error interceptors to prevent cascading failures
      }
    }
    
    return processedError;
  }

  /**
   * Get interceptor statistics
   * 
   * @returns Map of interceptor statistics
   */
  getStats(): Map<string, InterceptorStats> {
    return new Map(this.interceptorStats);
  }

  /**
   * Get detailed interceptor information
   * 
   * @returns Comprehensive interceptor information
   */
  getInterceptorInfo(): InterceptorManagerInfo {
    return {
      requestInterceptors: this.getInterceptorDetails(this.requestInterceptors),
      responseInterceptors: this.getInterceptorDetails(this.responseInterceptors),
      errorInterceptors: this.getInterceptorDetails(this.errorInterceptors),
      totalInterceptors: this.getTotalInterceptorCount(),
      enabledInterceptors: this.getEnabledInterceptorCount(),
      stats: this.getAggregatedStats()
    };
  }

  /**
   * Clear all interceptors
   */
  clear(): void {
    this.requestInterceptors.length = 0;
    this.responseInterceptors.length = 0;
    this.errorInterceptors.length = 0;
    this.interceptorStats.clear();
  }

  /**
   * Reset interceptor statistics
   */
  resetStats(): void {
    this.interceptorStats.forEach(stats => {
      stats.executionCount = 0;
      stats.totalExecutionTime = 0;
      stats.errorCount = 0;
      stats.lastExecutionTime = 0;
      stats.averageExecutionTime = 0;
    });
  }

  /**
   * Set global error handler
   * 
   * @param handler - Global error handler function
   */
  setGlobalErrorHandler(handler: (error: Error, interceptorName: string) => void): void {
    this.globalErrorHandler = handler;
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private createInterceptorEntry<T>(
    interceptor: T, 
    options: InterceptorOptions
  ): InterceptorEntry<T> {
    const id = options.id || this.generateInterceptorId();
    
    return {
      id,
      name: options.name || `interceptor_${id}`,
      interceptor,
      priority: options.priority || 0,
      enabled: options.enabled !== false,
      critical: options.critical || false,
      group: options.group,
      condition: options.condition,
      metadata: options.metadata || {}
    };
  }

  private generateInterceptorId(): string {
    return `interceptor_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private sortInterceptors<T>(interceptors: InterceptorEntry<T>[]): void {
    interceptors.sort((a, b) => b.priority - a.priority); // Higher priority first
  }

  private getEnabledInterceptors<T>(interceptors: InterceptorEntry<T>[]): InterceptorEntry<T>[] {
    return interceptors.filter(entry => entry.enabled);
  }

  private removeFromArray<T>(array: InterceptorEntry<T>[], id: string): boolean {
    const index = array.findIndex(entry => entry.id === id);
    if (index !== -1) {
      array.splice(index, 1);
      return true;
    }
    return false;
  }

  private removeFromArrayByName<T>(array: InterceptorEntry<T>[], name: string): number {
    const indicesToRemove = array
      .map((entry, index) => entry.name === name ? index : -1)
      .filter(index => index !== -1)
      .reverse(); // Remove from end to avoid index shifting

    indicesToRemove.forEach(index => {
      this.interceptorStats.delete(array[index].id);
      array.splice(index, 1);
    });

    return indicesToRemove.length;
  }

  private removeFromArrayByGroup<T>(array: InterceptorEntry<T>[], group: string): number {
    const indicesToRemove = array
      .map((entry, index) => entry.group === group ? index : -1)
      .filter(index => index !== -1)
      .reverse();

    indicesToRemove.forEach(index => {
      this.interceptorStats.delete(array[index].id);
      array.splice(index, 1);
    });

    return indicesToRemove.length;
  }

  private findInterceptorById(id: string): InterceptorEntry<any> | undefined {
    return this.requestInterceptors.find(entry => entry.id === id) ||
           this.responseInterceptors.find(entry => entry.id === id) ||
           this.errorInterceptors.find(entry => entry.id === id);
  }

  private shouldExecuteInterceptor(
    entry: InterceptorEntry<any>, 
    executionData: InterceptorExecutionData
  ): boolean {
    if (!entry.condition) {
      return true;
    }

    try {
      return entry.condition(executionData);
    } catch (error) {
      // If condition evaluation fails, default to not executing
      return false;
    }
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private initializeStats(interceptorId: string): void {
    this.interceptorStats.set(interceptorId, {
      executionCount: 0,
      totalExecutionTime: 0,
      errorCount: 0,
      lastExecutionTime: 0,
      averageExecutionTime: 0
    });
  }

  private updateStats(interceptorId: string, executionTime: number, success: boolean): void {
    const stats = this.interceptorStats.get(interceptorId);
    if (!stats) return;

    stats.executionCount++;
    stats.lastExecutionTime = executionTime;

    if (success) {
      stats.totalExecutionTime += executionTime;
      stats.averageExecutionTime = stats.totalExecutionTime / stats.executionCount;
    } else {
      stats.errorCount++;
    }
  }

  private async handleInterceptorError(
    error: Error, 
    entry: InterceptorEntry<any>, 
    type: 'request' | 'response' | 'error'
  ): Promise<void> {
    const errorMessage = `${type} interceptor '${entry.name}' failed: ${error.message}`;
    
    if (this.globalErrorHandler) {
      try {
        this.globalErrorHandler(error, entry.name);
      } catch (handlerError) {
        // Prevent error handler errors from breaking the flow
        console.error('Global error handler failed:', handlerError);
      }
    } else {
      console.error(errorMessage);
    }
  }

  private isRecoveryResponse(result: any): boolean {
    return result && 
           typeof result === 'object' && 
           'status' in result && 
           'data' in result;
  }

  private getInterceptorDetails<T>(interceptors: InterceptorEntry<T>[]): InterceptorDetail[] {
    return interceptors.map(entry => ({
      id: entry.id,
      name: entry.name,
      priority: entry.priority,
      enabled: entry.enabled,
      critical: entry.critical,
      group: entry.group,
      stats: this.interceptorStats.get(entry.id)
    }));
  }

  private getTotalInterceptorCount(): number {
    return this.requestInterceptors.length + 
           this.responseInterceptors.length + 
           this.errorInterceptors.length;
  }

  private getEnabledInterceptorCount(): number {
    return this.getEnabledInterceptors(this.requestInterceptors).length +
           this.getEnabledInterceptors(this.responseInterceptors).length +
           this.getEnabledInterceptors(this.errorInterceptors).length;
  }

  private getAggregatedStats(): AggregatedInterceptorStats {
    const allStats = Array.from(this.interceptorStats.values());
    
    return {
      totalExecutions: allStats.reduce((sum, stats) => sum + stats.executionCount, 0),
      totalErrors: allStats.reduce((sum, stats) => sum + stats.errorCount, 0),
      averageExecutionTime: allStats.length > 0 
        ? allStats.reduce((sum, stats) => sum + stats.averageExecutionTime, 0) / allStats.length 
        : 0,
      totalExecutionTime: allStats.reduce((sum, stats) => sum + stats.totalExecutionTime, 0)
    };
  }
}

// ==========================================
// BUILT-IN INTERCEPTORS
// ==========================================

/**
 * Built-in interceptors for common use cases
 */
export class BuiltInInterceptors {
  /**
   * Request ID injection interceptor
   */
  static requestIdInjector(headerName: string = 'X-Request-ID'): RequestInterceptor {
    return async (config) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      return {
        ...config,
        headers: {
          ...config.headers,
          [headerName]: requestId
        }
      };
    };
  }

  /**
   * Request/response timing interceptor
   */
  static timingLogger(): {
    request: RequestInterceptor;
    response: ResponseInterceptor;
  } {
    const timingStore = new Map<string, number>();

    return {
      request: async (config, context) => {
        const requestId = config.headers?.['X-Request-ID'] || 'unknown';
        timingStore.set(requestId, Date.now());
        return config;
      },
      
      response: async (response, context) => {
        const requestId = response.config.headers?.['X-Request-ID'] || 'unknown';
        const startTime = timingStore.get(requestId);
        
        if (startTime) {
          const duration = Date.now() - startTime;
          console.log(`Request ${requestId} completed in ${duration}ms`);
          timingStore.delete(requestId);
        }
        
        return response;
      }
    };
  }

  /**
   * Authentication token refresh interceptor
   */
  static tokenRefresh(
    refreshTokenFn: () => Promise<string>,
    isTokenExpired: (response: RestifiedResponse) => boolean
  ): ResponseInterceptor {
    return async (response, context) => {
      if (isTokenExpired(response)) {
        try {
          const newToken = await refreshTokenFn();
          // Store new token for subsequent requests
          context.newToken = newToken;
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
      
      return response;
    };
  }

  /**
   * Response caching interceptor
   */
  static responseCache(
    cacheKeyFn: (config: RequestConfig) => string,
    ttlMs: number = 300000 // 5 minutes default
  ): {
    request: RequestInterceptor;
    response: ResponseInterceptor;
  } {
    const cache = new Map<string, { response: RestifiedResponse; expiry: number }>();

    return {
      request: async (config, context) => {
        const cacheKey = cacheKeyFn(config);
        const cached = cache.get(cacheKey);
        
        if (cached && Date.now() < cached.expiry) {
          context.cachedResponse = cached.response;
          context.shortCircuit = true;
        }
        
        return config;
      },
      
      response: async (response, context) => {
        if (!context.cachedResponse) {
          const cacheKey = cacheKeyFn(response.config);
          cache.set(cacheKey, {
            response: { ...response },
            expiry: Date.now() + ttlMs
          });
        }
        
        return context.cachedResponse || response;
      }
    };
  }

  /**
   * Rate limiting interceptor
   */
  static rateLimiter(
    maxRequests: number,
    windowMs: number
  ): RequestInterceptor {
    const requests: number[] = [];

    return async (config) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Remove old requests outside the window
      while (requests.length > 0 && requests[0] < windowStart) {
        requests.shift();
      }
      
      if (requests.length >= maxRequests) {
        throw new Error(`Rate limit exceeded: ${maxRequests} requests per ${windowMs}ms`);
      }
      
      requests.push(now);
      return config;
    };
  }

  /**
   * Retry with exponential backoff interceptor
   */
  static retryWithBackoff(
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): ErrorInterceptor {
    return async (error, context) => {
      const retryCount = context.retryCount || 0;
      
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        const delay = baseDelay * Math.pow(2, retryCount);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        context.retryCount = retryCount + 1;
        context.shouldRetry = true;
        
        return error; // Return error to trigger retry
      }
      
      return error;
    };
  }

  private static isRetryableError(error: Error): boolean {
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
    return retryableCodes.some(code => error.message.includes(code));
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

type RequestInterceptor = (
  config: RequestConfig, 
  context?: InterceptorContext
) => Promise<RequestConfig> | RequestConfig;

type ResponseInterceptor = (
  response: RestifiedResponse, 
  context?: InterceptorContext
) => Promise<RestifiedResponse> | RestifiedResponse;

type ErrorInterceptor = (
  error: Error, 
  context?: InterceptorContext
) => Promise<Error | RestifiedResponse | void> | Error | RestifiedResponse | void;

interface InterceptorEntry<T> {
  id: string;
  name: string;
  interceptor: T;
  priority: number;
  enabled: boolean;
  critical: boolean;
  group?: string;
  condition?: (data: InterceptorExecutionData) => boolean;
  metadata: Record<string, any>;
}

interface InterceptorOptions {
  id?: string;
  name?: string;
  priority?: number;
  enabled?: boolean;
  critical?: boolean;
  group?: string;
  condition?: (data: InterceptorExecutionData) => boolean;
  metadata?: Record<string, any>;
}

interface InterceptorContext {
  [key: string]: any;
  shortCircuit?: boolean;
  retryCount?: number;
  shouldRetry?: boolean;
  cachedResponse?: RestifiedResponse;
  newToken?: string;
}

interface InterceptorExecutionData {
  config?: RequestConfig;
  response?: RestifiedResponse;
  error?: Error;
  context?: InterceptorContext;
}

interface InterceptorStats {
  executionCount: number;
  totalExecutionTime: number;
  errorCount: number;
  lastExecutionTime: number;
  averageExecutionTime: number;
}

interface InterceptorDetail {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  critical: boolean;
  group?: string;
  stats?: InterceptorStats;
}

interface AggregatedInterceptorStats {
  totalExecutions: number;
  totalErrors: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
}

interface InterceptorManagerInfo {
  requestInterceptors: InterceptorDetail[];
  responseInterceptors: InterceptorDetail[];
  errorInterceptors: InterceptorDetail[];
  totalInterceptors: number;
  enabledInterceptors: number;
  stats: AggregatedInterceptorStats;
}

interface InterceptorManagerOptions {
  globalErrorHandler?: (error: Error, interceptorName: string) => void;
  maxExecutionTime?: number;
}