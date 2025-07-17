/**
 * Interceptor Manager for RestifiedTS
 * 
 * This module provides centralized management of request/response interceptors
 * with support for priority-based execution, error handling, and performance monitoring.
 */

import { EventEmitter } from 'events';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  Interceptor,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  InterceptorContext,
  InterceptorConfig,
  InterceptorResult,
  InterceptorChainResult,
  InterceptorPhase,
  InterceptorPriority,
  InterceptorChainConfig,
  InterceptorManagerEvents
} from './InterceptorTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interceptor manager class
 */
export class InterceptorManager extends EventEmitter {
  private interceptors: Map<string, Interceptor> = new Map();
  private config: InterceptorConfig;
  private requestIdCounter = 0;
  private statistics: Map<string, {
    executionCount: number;
    totalExecutionTime: number;
    errorCount: number;
    successCount: number;
    averageExecutionTime: number;
    lastExecuted?: Date;
  }> = new Map();

  constructor(config: Partial<InterceptorConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      priority: InterceptorPriority.NORMAL,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      skipOnError: false,
      preserveOrder: true,
      allowDuplicates: false,
      ...config
    };
  }

  /**
   * Register an interceptor
   */
  registerInterceptor(interceptor: Interceptor): void {
    if (!this.config.allowDuplicates && this.interceptors.has(interceptor.name)) {
      throw new Error(`Interceptor with name '${interceptor.name}' already exists`);
    }

    this.interceptors.set(interceptor.name, interceptor);
    
    // Initialize statistics
    this.statistics.set(interceptor.name, {
      executionCount: 0,
      totalExecutionTime: 0,
      errorCount: 0,
      successCount: 0,
      averageExecutionTime: 0
    });

    this.emit('interceptor:registered', interceptor);
  }

  /**
   * Unregister an interceptor
   */
  unregisterInterceptor(name: string): boolean {
    const removed = this.interceptors.delete(name);
    if (removed) {
      this.statistics.delete(name);
      this.emit('interceptor:unregistered', name);
    }
    return removed;
  }

  /**
   * Get interceptor by name
   */
  getInterceptor(name: string): Interceptor | undefined {
    return this.interceptors.get(name);
  }

  /**
   * Get all interceptors
   */
  getAllInterceptors(): Interceptor[] {
    return Array.from(this.interceptors.values());
  }

  /**
   * Get interceptors by phase
   */
  getInterceptorsByPhase(phase: InterceptorPhase): Interceptor[] {
    return Array.from(this.interceptors.values())
      .filter(interceptor => interceptor.phase === phase)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Enable interceptor
   */
  enableInterceptor(name: string): boolean {
    const interceptor = this.interceptors.get(name);
    if (interceptor) {
      interceptor.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * Disable interceptor
   */
  disableInterceptor(name: string): boolean {
    const interceptor = this.interceptors.get(name);
    if (interceptor) {
      interceptor.enabled = false;
      return true;
    }
    return false;
  }

  /**
   * Execute request interceptor chain
   */
  async executeRequestInterceptors(
    config: AxiosRequestConfig,
    context?: Partial<InterceptorContext>
  ): Promise<AxiosRequestConfig> {
    const interceptorContext = this.createContext(InterceptorPhase.REQUEST, context);
    
    const interceptors = this.getInterceptorsByPhase(InterceptorPhase.REQUEST)
      .filter(interceptor => interceptor.enabled) as RequestInterceptor[];

    if (interceptors.length === 0) {
      return config;
    }

    this.emit('chain:started', InterceptorPhase.REQUEST, interceptorContext);

    const chainConfig: InterceptorChainConfig = {
      phase: InterceptorPhase.REQUEST,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      skipOnError: this.config.skipOnError,
      preserveOrder: this.config.preserveOrder,
      enableMetrics: true
    };

    const result = await this.executeInterceptorChain(
      interceptors,
      config,
      interceptorContext,
      chainConfig
    );

    this.emit('chain:completed', result);

    if (!result.success && !this.config.skipOnError) {
      throw new Error(`Request interceptor chain failed: ${result.errors.join(', ')}`);
    }

    return result.finalData;
  }

  /**
   * Execute response interceptor chain
   */
  async executeResponseInterceptors(
    response: AxiosResponse,
    context?: Partial<InterceptorContext>
  ): Promise<AxiosResponse> {
    const interceptorContext = this.createContext(InterceptorPhase.RESPONSE, context);
    
    const interceptors = this.getInterceptorsByPhase(InterceptorPhase.RESPONSE)
      .filter(interceptor => interceptor.enabled) as ResponseInterceptor[];

    if (interceptors.length === 0) {
      return response;
    }

    this.emit('chain:started', InterceptorPhase.RESPONSE, interceptorContext);

    const chainConfig: InterceptorChainConfig = {
      phase: InterceptorPhase.RESPONSE,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      skipOnError: this.config.skipOnError,
      preserveOrder: this.config.preserveOrder,
      enableMetrics: true
    };

    const result = await this.executeInterceptorChain(
      interceptors,
      response,
      interceptorContext,
      chainConfig
    );

    this.emit('chain:completed', result);

    if (!result.success && !this.config.skipOnError) {
      throw new Error(`Response interceptor chain failed: ${result.errors.join(', ')}`);
    }

    return result.finalData;
  }

  /**
   * Execute error interceptor chain
   */
  async executeErrorInterceptors(
    error: any,
    context?: Partial<InterceptorContext>
  ): Promise<any> {
    const interceptorContext = this.createContext(InterceptorPhase.ERROR, context);
    
    const interceptors = this.getInterceptorsByPhase(InterceptorPhase.ERROR)
      .filter(interceptor => interceptor.enabled) as ErrorInterceptor[];

    if (interceptors.length === 0) {
      throw error;
    }

    this.emit('chain:started', InterceptorPhase.ERROR, interceptorContext);

    const chainConfig: InterceptorChainConfig = {
      phase: InterceptorPhase.ERROR,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      skipOnError: true, // Always skip on error for error interceptors
      preserveOrder: this.config.preserveOrder,
      enableMetrics: true
    };

    try {
      const result = await this.executeInterceptorChain(
        interceptors,
        error,
        interceptorContext,
        chainConfig
      );

      this.emit('chain:completed', result);

      if (result.success) {
        return result.finalData;
      }
    } catch (interceptorError) {
      this.emit('chain:error', interceptorError, InterceptorPhase.ERROR);
    }

    // If no error interceptor handled the error, re-throw
    throw error;
  }

  /**
   * Execute interceptor chain
   */
  private async executeInterceptorChain(
    interceptors: Interceptor[],
    initialData: any,
    context: InterceptorContext,
    chainConfig: InterceptorChainConfig
  ): Promise<InterceptorChainResult> {
    const startTime = Date.now();
    const results: InterceptorResult[] = [];
    let currentData = initialData;
    let errors: any[] = [];
    let skippedCount = 0;
    let modifiedCount = 0;

    for (const interceptor of interceptors) {
      const interceptorStartTime = Date.now();
      let result: InterceptorResult;

      try {
        // Check if error interceptor should handle this error
        if (interceptor.phase === InterceptorPhase.ERROR) {
          const errorInterceptor = interceptor as ErrorInterceptor;
          if (errorInterceptor.shouldHandle && !errorInterceptor.shouldHandle(currentData, context)) {
            result = {
              success: true,
              interceptorName: interceptor.name,
              phase: interceptor.phase,
              executionTime: 0,
              skipped: true,
              modified: false,
              metadata: {}
            };
            skippedCount++;
            results.push(result);
            continue;
          }
        }

        // Execute interceptor with timeout
        const executionPromise = this.executeInterceptor(interceptor, currentData, context);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Interceptor execution timeout')), chainConfig.timeout);
        });

        const executionResult = await Promise.race([executionPromise, timeoutPromise]);
        
        const originalData = currentData;
        currentData = executionResult;
        
        const executionTime = Date.now() - interceptorStartTime;
        const modified = JSON.stringify(originalData) !== JSON.stringify(currentData);

        result = {
          success: true,
          interceptorName: interceptor.name,
          phase: interceptor.phase,
          executionTime,
          skipped: false,
          modified,
          metadata: {}
        };

        if (modified) {
          modifiedCount++;
        }

        this.updateStatistics(interceptor.name, executionTime, true);
        this.emit('interceptor:executed', result);

      } catch (error) {
        const executionTime = Date.now() - interceptorStartTime;
        
        result = {
          success: false,
          interceptorName: interceptor.name,
          phase: interceptor.phase,
          executionTime,
          error,
          skipped: false,
          modified: false,
          metadata: {}
        };

        errors.push(error);
        this.updateStatistics(interceptor.name, executionTime, false);
        this.emit('interceptor:error', error, interceptor);

        // Handle error based on configuration
        if ('onError' in interceptor && interceptor.onError) {
          try {
            await interceptor.onError(error, context);
          } catch (errorHandlerError) {
            errors.push(errorHandlerError);
          }
        }

        if (!chainConfig.skipOnError) {
          results.push(result);
          break;
        }
      }

      results.push(result);
    }

    const totalExecutionTime = Date.now() - startTime;
    const success = errors.length === 0 || chainConfig.skipOnError;

    return {
      success,
      totalExecutionTime,
      results,
      finalData: currentData,
      errors,
      skippedCount,
      modifiedCount
    };
  }

  /**
   * Execute single interceptor
   */
  private async executeInterceptor(
    interceptor: Interceptor,
    data: any,
    context: InterceptorContext
  ): Promise<any> {
    const phase = interceptor.phase;
    
    switch (phase) {
      case InterceptorPhase.REQUEST:
      case InterceptorPhase.BEFORE_REQUEST:
        return (interceptor as RequestInterceptor).execute(data, context);
      
      case InterceptorPhase.RESPONSE:
      case InterceptorPhase.AFTER_RESPONSE:
        return (interceptor as ResponseInterceptor).execute(data, context);
      
      case InterceptorPhase.ERROR:
        return (interceptor as ErrorInterceptor).execute(data, context);
      
      default:
        const _exhaustiveCheck: never = phase;
        throw new Error(`Unknown interceptor phase: ${phase}`);
    }
  }

  /**
   * Create interceptor context
   */
  private createContext(
    phase: InterceptorPhase,
    context?: Partial<InterceptorContext>
  ): InterceptorContext {
    return {
      requestId: uuidv4(),
      timestamp: new Date(),
      phase,
      attempt: 1,
      metadata: {},
      variables: {},
      config: this.config,
      ...context
    };
  }

  /**
   * Update interceptor statistics
   */
  private updateStatistics(
    interceptorName: string,
    executionTime: number,
    success: boolean
  ): void {
    const stats = this.statistics.get(interceptorName);
    if (stats) {
      stats.executionCount++;
      stats.totalExecutionTime += executionTime;
      stats.lastExecuted = new Date();
      
      if (success) {
        stats.successCount++;
      } else {
        stats.errorCount++;
      }
      
      stats.averageExecutionTime = stats.totalExecutionTime / stats.executionCount;
    }
  }

  /**
   * Get interceptor statistics
   */
  getStatistics(interceptorName?: string): any {
    if (interceptorName) {
      return this.statistics.get(interceptorName);
    }
    
    const allStats: Record<string, any> = {};
    this.statistics.forEach((stats, name) => {
      allStats[name] = { ...stats };
    });
    
    return allStats;
  }

  /**
   * Get global statistics
   */
  getGlobalStatistics(): {
    totalInterceptors: number;
    enabledInterceptors: number;
    totalExecutions: number;
    totalErrors: number;
    averageExecutionTime: number;
  } {
    const allStats = Array.from(this.statistics.values());
    
    return {
      totalInterceptors: this.interceptors.size,
      enabledInterceptors: Array.from(this.interceptors.values()).filter(i => i.enabled).length,
      totalExecutions: allStats.reduce((sum, stats) => sum + stats.executionCount, 0),
      totalErrors: allStats.reduce((sum, stats) => sum + stats.errorCount, 0),
      averageExecutionTime: allStats.length > 0 
        ? allStats.reduce((sum, stats) => sum + stats.averageExecutionTime, 0) / allStats.length
        : 0
    };
  }

  /**
   * Clear statistics
   */
  clearStatistics(interceptorName?: string): void {
    if (interceptorName) {
      const stats = this.statistics.get(interceptorName);
      if (stats) {
        stats.executionCount = 0;
        stats.totalExecutionTime = 0;
        stats.errorCount = 0;
        stats.successCount = 0;
        stats.averageExecutionTime = 0;
        stats.lastExecuted = undefined;
      }
    } else {
      this.statistics.forEach((stats) => {
        stats.executionCount = 0;
        stats.totalExecutionTime = 0;
        stats.errorCount = 0;
        stats.successCount = 0;
        stats.averageExecutionTime = 0;
        stats.lastExecuted = undefined;
      });
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<InterceptorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): InterceptorConfig {
    return { ...this.config };
  }

  /**
   * Reset manager
   */
  reset(): void {
    this.interceptors.clear();
    this.statistics.clear();
    this.requestIdCounter = 0;
  }

  /**
   * Get interceptor summary
   */
  getSummary(): {
    totalInterceptors: number;
    byPhase: Record<InterceptorPhase, number>;
    byPriority: Record<InterceptorPriority, number>;
    enabledCount: number;
    disabledCount: number;
  } {
    const interceptors = Array.from(this.interceptors.values());
    
    const byPhase: Record<InterceptorPhase, number> = {
      [InterceptorPhase.REQUEST]: 0,
      [InterceptorPhase.RESPONSE]: 0,
      [InterceptorPhase.ERROR]: 0,
      [InterceptorPhase.BEFORE_REQUEST]: 0,
      [InterceptorPhase.AFTER_RESPONSE]: 0
    };

    const byPriority: Record<InterceptorPriority, number> = {
      [InterceptorPriority.HIGHEST]: 0,
      [InterceptorPriority.HIGH]: 0,
      [InterceptorPriority.NORMAL]: 0,
      [InterceptorPriority.LOW]: 0,
      [InterceptorPriority.LOWEST]: 0
    };

    let enabledCount = 0;
    let disabledCount = 0;

    interceptors.forEach(interceptor => {
      byPhase[interceptor.phase]++;
      byPriority[interceptor.priority]++;
      
      if (interceptor.enabled) {
        enabledCount++;
      } else {
        disabledCount++;
      }
    });

    return {
      totalInterceptors: interceptors.length,
      byPhase,
      byPriority,
      enabledCount,
      disabledCount
    };
  }
}

export default InterceptorManager;