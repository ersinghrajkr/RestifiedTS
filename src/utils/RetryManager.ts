// src/utils/RetryManager.ts

import { RestifiedConfig, RetryError, TimeoutError } from '../types/RestifiedTypes';

/**
 * Advanced retry manager with multiple backoff strategies and intelligent retry logic
 * 
 * Features:
 * - Exponential backoff with jitter
 * - Linear backoff option
 * - Fixed delay option
 * - Configurable retry conditions
 * - Circuit breaker pattern
 * - Retry attempt tracking
 * - Custom retry strategies
 * 
 * @example
 * ```typescript
 * const retryManager = new RetryManager({
 *   maxRetries: 3,
 *   backoffFactor: 2,
 *   retryDelay: 1000,
 *   retryStatusCodes: [408, 429, 500, 502, 503, 504]
 * });
 * 
 * const result = await retryManager.execute(async () => {
 *   return await someApiCall();
 * });
 * ```
 */
export class RetryManager {
  private readonly config: RestifiedConfig['retryConfig'];
  private readonly circuitBreaker: CircuitBreaker;
  private retryAttempts: Map<string, RetryAttemptInfo> = new Map();

  constructor(config: RestifiedConfig['retryConfig']) {
    this.config = this.validateAndNormalizeConfig(config);
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringPeriod: 60000
    });
  }

  /**
   * Execute a function with retry logic
   * 
   * @param fn - Function to execute with retry
   * @param options - Optional retry options for this specific execution
   * @returns Promise resolving to function result
   * @throws RetryError if all retry attempts fail
   */
  async execute<T>(
    fn: () => Promise<T>, 
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const executionId = this.generateExecutionId();
    const retryOptions = { ...this.getDefaultRetryOptions(), ...options };
    
    this.initializeRetryAttempt(executionId, retryOptions);

    try {
      // Check circuit breaker state
      this.circuitBreaker.checkState();

      return await this.executeWithRetry(fn, executionId, retryOptions);
    } catch (error) {
      this.finalizeRetryAttempt(executionId, error as Error);
      throw error;
    }
  }

  /**
   * Execute function with custom retry condition
   * 
   * @param fn - Function to execute
   * @param shouldRetry - Custom retry condition function
   * @param options - Retry options
   * @returns Promise resolving to function result
   */
  async executeWithCustomCondition<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: Error, attempt: number) => boolean,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const executionId = this.generateExecutionId();
    const retryOptions = { 
      ...this.getDefaultRetryOptions(), 
      ...options,
      customRetryCondition: shouldRetry
    };

    this.initializeRetryAttempt(executionId, retryOptions);

    try {
      return await this.executeWithRetry(fn, executionId, retryOptions);
    } catch (error) {
      this.finalizeRetryAttempt(executionId, error as Error);
      throw error;
    }
  }

  /**
   * Get retry statistics
   * 
   * @returns Retry statistics object
   */
  getStats(): RetryStats {
    const attempts = Array.from(this.retryAttempts.values());
    const completedAttempts = attempts.filter(a => a.completed);
    
    return {
      totalExecutions: attempts.length,
      completedExecutions: completedAttempts.length,
      successfulExecutions: completedAttempts.filter(a => a.succeeded).length,
      failedExecutions: completedAttempts.filter(a => !a.succeeded).length,
      averageAttempts: completedAttempts.length > 0 
        ? completedAttempts.reduce((sum, a) => sum + a.attemptCount, 0) / completedAttempts.length 
        : 0,
      averageRetryDelay: completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + a.totalRetryTime, 0) / completedAttempts.length
        : 0,
      circuitBreakerStats: this.circuitBreaker.getStats()
    };
  }

  /**
   * Reset retry statistics
   */
  resetStats(): void {
    this.retryAttempts.clear();
    this.circuitBreaker.reset();
  }

  /**
   * Update retry configuration
   * 
   * @param updates - Configuration updates
   */
  updateConfig(updates: Partial<RestifiedConfig['retryConfig']>): void {
    Object.assign(this.config, this.validateAndNormalizeConfig({
      ...this.config,
      ...updates
    }));
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    executionId: string,
    options: RetryOptions
  ): Promise<T> {
    let lastError: Error;
    let attempt = 0;
    const attemptInfo = this.retryAttempts.get(executionId)!;

    while (attempt <= options.maxRetries) {
      try {
        attemptInfo.attemptCount = attempt + 1;
        attemptInfo.lastAttemptTime = Date.now();

        const result = await this.executeWithTimeout(fn, options.timeout);
        
        // Success
        attemptInfo.succeeded = true;
        this.circuitBreaker.recordSuccess();
        
        return result;

      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        attemptInfo.errors.push({
          attempt,
          error: lastError,
          timestamp: Date.now()
        });

        // Record failure in circuit breaker
        this.circuitBreaker.recordFailure();

        // Check if we should retry
        if (attempt > options.maxRetries) {
          break;
        }

        if (!this.shouldRetry(lastError, attempt, options)) {
          break;
        }

        // Calculate and apply delay
        const delay = this.calculateDelay(attempt, options);
        attemptInfo.totalRetryTime += delay;
        
        await this.sleep(delay);
      }
    }

    // All retries failed
    throw new RetryError(
      `Operation failed after ${attempt} attempts. Last error: ${lastError.message}`,
      attempt,
      lastError
    );
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout?: number
  ): Promise<T> {
    if (!timeout) {
      return await fn();
    }

    return new Promise<T>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`Operation timed out after ${timeout}ms`, timeout));
      }, timeout);

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

  /**
   * Check if error should trigger a retry
   */
  private shouldRetry(error: Error, attempt: number, options: RetryOptions): boolean {
    // Use custom retry condition if provided
    if (options.customRetryCondition) {
      return options.customRetryCondition(error, attempt);
    }

    // Don't retry timeout errors beyond first attempt for certain cases
    if (error instanceof TimeoutError && attempt > 1 && options.timeoutRetryLimit === 1) {
      return false;
    }

    // Check for network errors
    if (this.isNetworkError(error)) {
      return true;
    }

    // Check HTTP status codes
    if (this.hasRetryableStatusCode(error)) {
      return true;
    }

    // Check for specific error types
    if (this.isRetryableErrorType(error)) {
      return true;
    }

    return false;
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: Error): boolean {
    const networkErrorCodes = [
      'ECONNRESET',
      'ENOTFOUND', 
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNABORTED',
      'EHOSTUNREACH',
      'ENETUNREACH'
    ];

    return networkErrorCodes.some(code => 
      error.message.includes(code) || (error as any).code === code
    );
  }

  /**
   * Check if error has retryable HTTP status code
   */
  private hasRetryableStatusCode(error: Error): boolean {
    const statusCode = (error as any).response?.status;
    return statusCode && this.config.retryStatusCodes.includes(statusCode);
  }

  /**
   * Check if error type is retryable
   */
  private isRetryableErrorType(error: Error): boolean {
    const retryableTypes = [
      'TimeoutError',
      'NetworkError',
      'DNSError',
      'ConnectionError'
    ];

    return retryableTypes.includes(error.constructor.name) ||
           retryableTypes.some(type => error.message.includes(type));
  }

  /**
   * Calculate retry delay based on strategy
   */
  private calculateDelay(attempt: number, options: RetryOptions): number {
    let delay: number;

    switch (options.backoffStrategy) {
      case 'exponential':
        delay = this.calculateExponentialDelay(attempt, options);
        break;
      case 'linear':
        delay = this.calculateLinearDelay(attempt, options);
        break;
      case 'fixed':
        delay = options.retryDelay;
        break;
      default:
        delay = this.calculateExponentialDelay(attempt, options);
    }

    // Apply jitter to prevent thundering herd
    if (options.jitter) {
      delay = this.applyJitter(delay, options.jitterFactor);
    }

    // Apply min/max constraints
    delay = Math.max(options.minRetryDelay, Math.min(options.maxRetryDelay, delay));

    return Math.floor(delay);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateExponentialDelay(attempt: number, options: RetryOptions): number {
    return options.retryDelay * Math.pow(options.backoffFactor, attempt - 1);
  }

  /**
   * Calculate linear backoff delay
   */
  private calculateLinearDelay(attempt: number, options: RetryOptions): number {
    return options.retryDelay * attempt;
  }

  /**
   * Apply jitter to delay
   */
  private applyJitter(delay: number, jitterFactor: number): number {
    const jitterAmount = delay * jitterFactor;
    const jitter = (Math.random() - 0.5) * 2 * jitterAmount; // -jitterAmount to +jitterAmount
    return Math.max(0, delay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate and normalize configuration
   */
  private validateAndNormalizeConfig(config: RestifiedConfig['retryConfig']): RestifiedConfig['retryConfig'] {
    if (!config) {
      throw new Error('Retry configuration is required');
    }

    const normalized = { ...config };

    // Validate maxRetries
    if (typeof normalized.maxRetries !== 'number' || normalized.maxRetries < 0) {
      throw new Error('maxRetries must be a non-negative number');
    }

    // Validate backoffFactor
    if (typeof normalized.backoffFactor !== 'number' || normalized.backoffFactor <= 0) {
      throw new Error('backoffFactor must be a positive number');
    }

    // Validate retryDelay
    if (typeof normalized.retryDelay !== 'number' || normalized.retryDelay < 0) {
      throw new Error('retryDelay must be a non-negative number');
    }

    // Validate retryStatusCodes
    if (!Array.isArray(normalized.retryStatusCodes)) {
      throw new Error('retryStatusCodes must be an array');
    }

    normalized.retryStatusCodes.forEach(code => {
      if (typeof code !== 'number' || code < 100 || code > 599) {
        throw new Error(`Invalid HTTP status code: ${code}`);
      }
    });

    return normalized;
  }

  /**
   * Get default retry options
   */
  private getDefaultRetryOptions(): RetryOptions {
    return {
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      backoffFactor: this.config.backoffFactor,
      backoffStrategy: 'exponential',
      jitter: true,
      jitterFactor: 0.1,
      minRetryDelay: 100,
      maxRetryDelay: 30000,
      timeout: undefined,
      timeoutRetryLimit: 3
    };
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Initialize retry attempt tracking
   */
  private initializeRetryAttempt(executionId: string, options: RetryOptions): void {
    this.retryAttempts.set(executionId, {
      executionId,
      startTime: Date.now(),
      attemptCount: 0,
      totalRetryTime: 0,
      succeeded: false,
      completed: false,
      errors: [],
      options,
      lastAttemptTime: 0
    });
  }

  /**
   * Finalize retry attempt tracking
   */
  private finalizeRetryAttempt(executionId: string, finalError?: Error): void {
    const attemptInfo = this.retryAttempts.get(executionId);
    if (attemptInfo) {
      attemptInfo.completed = true;
      attemptInfo.endTime = Date.now();
      
      if (finalError && !attemptInfo.succeeded) {
        attemptInfo.finalError = finalError;
      }
    }
  }
}

// ==========================================
// SUPPORTING CLASSES AND INTERFACES
// ==========================================

/**
 * Circuit breaker to prevent cascading failures
 */
class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  
  constructor(private config: CircuitBreakerConfig) {}

  checkState(): void {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open - too many failures detected');
      }
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = 'closed';
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  backoffFactor: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  jitter: boolean;
  jitterFactor: number;
  minRetryDelay: number;
  maxRetryDelay: number;
  timeout?: number;
  timeoutRetryLimit: number;
  customRetryCondition?: (error: Error, attempt: number) => boolean;
}

interface RetryAttemptInfo {
  executionId: string;
  startTime: number;
  endTime?: number;
  attemptCount: number;
  totalRetryTime: number;
  succeeded: boolean;
  completed: boolean;
  errors: Array<{
    attempt: number;
    error: Error;
    timestamp: number;
  }>;
  finalError?: Error;
  options: RetryOptions;
  lastAttemptTime: number;
}

interface RetryStats {
  totalExecutions: number;
  completedExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageAttempts: number;
  averageRetryDelay: number;
  circuitBreakerStats: CircuitBreakerStats;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
}

type CircuitBreakerState = 'closed' | 'open' | 'half-open';