// src/utils/WaitUtils.ts

/**
 * Production-grade wait and timing utilities for test scenarios
 * 
 * Features:
 * - Simple sleep/delay functions
 * - Conditional waiting with timeouts
 * - Polling mechanisms with backoff strategies
 * - Promise-based waiting utilities
 * - Performance-optimized waiting
 * - Cancellable waits
 * - Wait condition builders
 * - Debugging and logging support
 * 
 * @example
 * ```typescript
 * // Simple wait
 * await WaitUtils.sleep(1000);
 * 
 * // Wait until condition is met
 * await WaitUtils.waitUntil(() => element.isVisible(), 10000);
 * 
 * // Wait for multiple conditions
 * await WaitUtils.waitForAll([
 *   () => api.isReady(),
 *   () => database.isConnected()
 * ], 30000);
 * 
 * // Advanced polling with backoff
 * await WaitUtils.pollUntil(
 *   () => checkStatus(),
 *   { timeout: 60000, interval: 1000, backoff: 'exponential' }
 * );
 * ```
 */
export class WaitUtils {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly DEFAULT_INTERVAL = 100; // 100ms
  private static readonly MAX_INTERVAL = 10000; // 10 seconds
  
  /**
   * Simple sleep/delay function
   * 
   * @param ms - Milliseconds to wait
   * @returns Promise that resolves after the specified time
   */
  static async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    
    return new Promise<void>(resolve => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Wait until a condition is met
   * 
   * @param condition - Function that returns true when condition is met
   * @param timeout - Maximum time to wait in milliseconds
   * @param interval - Check interval in milliseconds
   * @param errorMessage - Custom error message for timeout
   * @returns Promise that resolves when condition is met
   */
  static async waitUntil(
    condition: () => boolean | Promise<boolean>,
    timeout: number = WaitUtils.DEFAULT_TIMEOUT,
    interval: number = WaitUtils.DEFAULT_INTERVAL,
    errorMessage?: string
  ): Promise<void> {
    WaitUtils.validateParameters(timeout, interval);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (error) {
        // Continue checking unless it's a critical error
        if (WaitUtils.isCriticalError(error)) {
          throw error;
        }
      }
      
      await WaitUtils.sleep(interval);
    }
    
    const elapsed = Date.now() - startTime;
    const message = errorMessage || `Condition not met within ${timeout}ms (elapsed: ${elapsed}ms)`;
    throw new WaitTimeoutError(message, timeout, elapsed);
  }

  /**
   * Wait until a condition returns a truthy value and return that value
   * 
   * @param condition - Function that returns a value when ready
   * @param timeout - Maximum time to wait in milliseconds
   * @param interval - Check interval in milliseconds
   * @returns Promise that resolves with the condition result
   */
  static async waitForValue<T>(
    condition: () => T | Promise<T>,
    timeout: number = WaitUtils.DEFAULT_TIMEOUT,
    interval: number = WaitUtils.DEFAULT_INTERVAL
  ): Promise<T> {
    WaitUtils.validateParameters(timeout, interval);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return result;
        }
      } catch (error) {
        if (WaitUtils.isCriticalError(error)) {
          throw error;
        }
      }
      
      await WaitUtils.sleep(interval);
    }
    
    const elapsed = Date.now() - startTime;
    throw new WaitTimeoutError(`Value not available within ${timeout}ms (elapsed: ${elapsed}ms)`, timeout, elapsed);
  }

  /**
   * Wait for all conditions to be met
   * 
   * @param conditions - Array of condition functions
   * @param timeout - Maximum time to wait in milliseconds
   * @param interval - Check interval in milliseconds
   * @returns Promise that resolves when all conditions are met
   */
  static async waitForAll(
    conditions: Array<() => boolean | Promise<boolean>>,
    timeout: number = WaitUtils.DEFAULT_TIMEOUT,
    interval: number = WaitUtils.DEFAULT_INTERVAL
  ): Promise<void> {
    if (conditions.length === 0) return;
    
    await WaitUtils.waitUntil(
      async () => {
        const results = await Promise.all(
          conditions.map(async condition => {
            try {
              return await condition();
            } catch (error) {
              if (WaitUtils.isCriticalError(error)) {
                throw error;
              }
              return false;
            }
          })
        );
        return results.every(result => result);
      },
      timeout,
      interval,
      `Not all conditions met within ${timeout}ms`
    );
  }

  /**
   * Wait for any of the conditions to be met
   * 
   * @param conditions - Array of condition functions
   * @param timeout - Maximum time to wait in milliseconds
   * @param interval - Check interval in milliseconds
   * @returns Promise that resolves when any condition is met
   */
  static async waitForAny(
    conditions: Array<() => boolean | Promise<boolean>>,
    timeout: number = WaitUtils.DEFAULT_TIMEOUT,
    interval: number = WaitUtils.DEFAULT_INTERVAL
  ): Promise<number> {
    if (conditions.length === 0) {
      throw new Error('At least one condition must be provided');
    }
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      for (let i = 0; i < conditions.length; i++) {
        try {
          const result = await conditions[i]();
          if (result) {
            return i; // Return index of the first condition that passed
          }
        } catch (error) {
          if (WaitUtils.isCriticalError(error)) {
            throw error;
          }
        }
      }
      
      await WaitUtils.sleep(interval);
    }
    
    const elapsed = Date.now() - startTime;
    throw new WaitTimeoutError(`No conditions met within ${timeout}ms (elapsed: ${elapsed}ms)`, timeout, elapsed);
  }

  /**
   * Advanced polling with configurable strategies
   * 
   * @param condition - Condition function to check
   * @param options - Polling configuration options
   * @returns Promise that resolves when condition is met
   */
  static async pollUntil(
    condition: () => boolean | Promise<boolean>,
    options: PollOptions = {}
  ): Promise<void> {
    const config: Required<PollOptions> = {
      timeout: options.timeout || WaitUtils.DEFAULT_TIMEOUT,
      interval: options.interval || WaitUtils.DEFAULT_INTERVAL,
      backoff: options.backoff || 'none',
      maxInterval: options.maxInterval || WaitUtils.MAX_INTERVAL,
      backoffFactor: options.backoffFactor || 2,
      jitter: options.jitter || false,
      retryOnError: options.retryOnError !== false,
      onRetry: options.onRetry,
      onError: options.onError
    };

    WaitUtils.validatePollOptions(config);
    
    const startTime = Date.now();
    let currentInterval = config.interval;
    let attemptCount = 0;
    
    while (Date.now() - startTime < config.timeout) {
      attemptCount++;
      
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (error) {
        if (config.onError) {
          config.onError(error as Error, attemptCount);
        }
        
        if (!config.retryOnError || WaitUtils.isCriticalError(error)) {
          throw error;
        }
      }
      
      if (config.onRetry) {
        config.onRetry(attemptCount, currentInterval);
      }
      
      // Apply jitter if enabled
      const actualInterval = config.jitter 
        ? WaitUtils.applyJitter(currentInterval) 
        : currentInterval;
      
      await WaitUtils.sleep(actualInterval);
      
      // Update interval based on backoff strategy
      currentInterval = WaitUtils.calculateNextInterval(currentInterval, config);
    }
    
    const elapsed = Date.now() - startTime;
    throw new WaitTimeoutError(`Polling timeout after ${config.timeout}ms (${attemptCount} attempts, elapsed: ${elapsed}ms)`, config.timeout, elapsed);
  }

  /**
   * Wait with cancellation support
   * 
   * @param condition - Condition function to check
   * @param timeout - Maximum time to wait
   * @param cancellationToken - Token to cancel the wait
   * @returns Promise that resolves when condition is met or is cancelled
   */
  static async waitUntilCancellable(
    condition: () => boolean | Promise<boolean>,
    timeout: number = WaitUtils.DEFAULT_TIMEOUT,
    cancellationToken: CancellationToken
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (cancellationToken.isCancelled) {
        throw new WaitCancelledError('Wait operation was cancelled');
      }
      
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (error) {
        if (WaitUtils.isCriticalError(error)) {
          throw error;
        }
      }
      
      await WaitUtils.sleep(WaitUtils.DEFAULT_INTERVAL);
    }
    
    const elapsed = Date.now() - startTime;
    throw new WaitTimeoutError(`Condition not met within ${timeout}ms (elapsed: ${elapsed}ms)`, timeout, elapsed);
  }

  /**
   * Wait for a promise with timeout
   * 
   * @param promise - Promise to wait for
   * @param timeout - Timeout in milliseconds
   * @param timeoutMessage - Custom timeout message
   * @returns Promise that resolves with the original promise result
   */
  static async withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    timeoutMessage?: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        const message = timeoutMessage || `Operation timed out after ${timeout}ms`;
        reject(new WaitTimeoutError(message, timeout, timeout));
      }, timeout);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  /**
   * Wait for multiple promises with individual timeouts
   * 
   * @param promises - Array of promises with their timeouts
   * @returns Promise that resolves with all results
   */
  static async waitForAllWithTimeouts<T>(
    promises: Array<{ promise: Promise<T>; timeout: number; name?: string }>
  ): Promise<T[]> {
    const wrappedPromises = promises.map((item, index) => 
      WaitUtils.withTimeout(
        item.promise, 
        item.timeout, 
        `Promise ${item.name || index} timed out after ${item.timeout}ms`
      )
    );
    
    return Promise.all(wrappedPromises);
  }

  /**
   * Retry a function with exponential backoff
   * 
   * @param fn - Function to retry
   * @param options - Retry configuration
   * @returns Promise that resolves with function result
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config: Required<RetryOptions> = {
      maxAttempts: options.maxAttempts || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 10000,
      backoffFactor: options.backoffFactor || 2,
      jitter: options.jitter || false,
      shouldRetry: options.shouldRetry || (() => true),
      onRetry: options.onRetry
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxAttempts || !config.shouldRetry(lastError, attempt)) {
          throw lastError;
        }
        
        if (config.onRetry) {
          config.onRetry(lastError, attempt, config.maxAttempts);
        }
        
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );
        
        const actualDelay = config.jitter ? WaitUtils.applyJitter(delay) : delay;
        await WaitUtils.sleep(actualDelay);
      }
    }
    
    throw lastError!;
  }

  // ==========================================
  // PRIVATE UTILITY METHODS
  // ==========================================

  private static validateParameters(timeout: number, interval: number): void {
    if (timeout <= 0) {
      throw new Error('Timeout must be positive');
    }
    
    if (interval <= 0) {
      throw new Error('Interval must be positive');
    }
    
    if (interval > timeout) {
      throw new Error('Interval cannot be greater than timeout');
    }
  }

  private static validatePollOptions(options: Required<PollOptions>): void {
    WaitUtils.validateParameters(options.timeout, options.interval);
    
    if (options.maxInterval < options.interval) {
      throw new Error('Max interval cannot be less than initial interval');
    }
    
    if (options.backoffFactor <= 0) {
      throw new Error('Backoff factor must be positive');
    }
  }

  private static isCriticalError(error: any): boolean {
    // Define critical errors that should not be retried
    const criticalErrors = [
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'AssertionError'
    ];
    
    return criticalErrors.includes(error?.constructor?.name);
  }

  private static calculateNextInterval(
    currentInterval: number, 
    options: Required<PollOptions>
  ): number {
    switch (options.backoff) {
      case 'linear':
        return Math.min(currentInterval + options.interval, options.maxInterval);
      
      case 'exponential':
        return Math.min(currentInterval * options.backoffFactor, options.maxInterval);
      
      case 'none':
      default:
        return currentInterval;
    }
  }

  private static applyJitter(interval: number, jitterFactor: number = 0.1): number {
    const jitterRange = interval * jitterFactor;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(interval + jitter, 0);
  }
}

/**
 * Cancellation token for cancellable operations
 */
export class CancellationToken {
  private _isCancelled: boolean = false;
  private _reason?: string;

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  get reason(): string | undefined {
    return this._reason;
  }

  cancel(reason?: string): void {
    this._isCancelled = true;
    this._reason = reason;
  }

  throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new WaitCancelledError(this._reason || 'Operation was cancelled');
    }
  }
}

/**
 * Fluent wait builder for complex waiting scenarios
 */
export class WaitBuilder {
  private condition?: () => boolean | Promise<boolean>;
  private timeout: number = WaitUtils.DEFAULT_TIMEOUT;
  private interval: number = WaitUtils.DEFAULT_INTERVAL;
  private errorMessage?: string;
  private onRetry?: (attempt: number, interval: number) => void;
  private onError?: (error: Error, attempt: number) => void;

  static for(condition: () => boolean | Promise<boolean>): WaitBuilder {
    const builder = new WaitBuilder();
    builder.condition = condition;
    return builder;
  }

  withTimeout(ms: number): WaitBuilder {
    this.timeout = ms;
    return this;
  }

  withInterval(ms: number): WaitBuilder {
    this.interval = ms;
    return this;
  }

  withErrorMessage(message: string): WaitBuilder {
    this.errorMessage = message;
    return this;
  }

  onRetryDo(callback: (attempt: number, interval: number) => void): WaitBuilder {
    this.onRetry = callback;
    return this;
  }

  onErrorDo(callback: (error: Error, attempt: number) => void): WaitBuilder {
    this.onError = callback;
    return this;
  }

  async execute(): Promise<void> {
    if (!this.condition) {
      throw new Error('No condition specified');
    }

    await WaitUtils.pollUntil(this.condition, {
      timeout: this.timeout,
      interval: this.interval,
      onRetry: this.onRetry,
      onError: this.onError
    });
  }
}

// ==========================================
// ERROR CLASSES
// ==========================================

export class WaitTimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout: number,
    public readonly elapsed: number
  ) {
    super(message);
    this.name = 'WaitTimeoutError';
  }
}

export class WaitCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WaitCancelledError';
  }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

export interface PollOptions {
  timeout?: number;
  interval?: number;
  backoff?: 'none' | 'linear' | 'exponential';
  maxInterval?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryOnError?: boolean;
  onRetry?: (attempt: number, interval: number) => void;
  onError?: (error: Error, attempt: number) => void;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, maxAttempts: number) => void;
}

// ==========================================
// CONVENIENCE FUNCTIONS
// ==========================================

/**
 * Convenience function for simple sleep
 */
export const sleep = WaitUtils.sleep;

/**
 * Convenience function for waiting until condition is met
 */
export const waitUntil = WaitUtils.waitUntil;

/**
 * Convenience function for waiting for a value
 */
export const waitForValue = WaitUtils.waitForValue;

/**
 * Convenience function for fluent wait building
 */
export const waitFor = WaitBuilder.for;