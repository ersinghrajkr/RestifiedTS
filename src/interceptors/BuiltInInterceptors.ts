/**
 * Built-in Interceptors for RestifiedTS
 * 
 * This module provides a collection of commonly used interceptors for
 * authentication, logging, retry logic, rate limiting, and other functionality.
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  InterceptorContext,
  InterceptorPhase,
  InterceptorPriority
} from './InterceptorTypes';

/**
 * Authentication interceptor
 */
export class AuthenticationInterceptor implements RequestInterceptor {
  name = 'authentication';
  priority = InterceptorPriority.HIGH;
  enabled = true;
  description = 'Adds authentication headers to requests';
  phase = InterceptorPhase.REQUEST as InterceptorPhase.REQUEST;

  constructor(private authProvider: any) {}

  async execute(config: AxiosRequestConfig, context: InterceptorContext): Promise<AxiosRequestConfig> {
    if (this.authProvider) {
      return this.authProvider.authenticate(config);
    }
    return config;
  }

  async onError(error: any, context: InterceptorContext): Promise<any> {
    console.error('Authentication interceptor error:', error);
    return error;
  }
}

/**
 * Logging interceptor for requests
 */
export class RequestLoggingInterceptor implements RequestInterceptor {
  name = 'requestLogging';
  priority = InterceptorPriority.LOW;
  enabled = true;
  description = 'Logs HTTP requests';
  phase = InterceptorPhase.REQUEST as InterceptorPhase.REQUEST;

  constructor(private logger: any = console) {}

  async execute(config: AxiosRequestConfig, context: InterceptorContext): Promise<AxiosRequestConfig> {
    const logData = {
      requestId: context.requestId,
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
      timestamp: context.timestamp
    };

    this.logger.info('HTTP Request:', logData);
    return config;
  }
}

/**
 * Logging interceptor for responses
 */
export class ResponseLoggingInterceptor implements ResponseInterceptor {
  name = 'responseLogging';
  priority = InterceptorPriority.LOW;
  enabled = true;
  description = 'Logs HTTP responses';
  phase = InterceptorPhase.RESPONSE as InterceptorPhase.RESPONSE;

  constructor(private logger: any = console) {}

  async execute(response: AxiosResponse, context: InterceptorContext): Promise<AxiosResponse> {
    const logData = {
      requestId: context.requestId,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      responseTime: Date.now() - context.timestamp.getTime(),
      dataSize: JSON.stringify(response.data).length
    };

    this.logger.info('HTTP Response:', logData);
    return response;
  }
}

/**
 * Retry interceptor for failed requests
 */
export class RetryInterceptor implements ErrorInterceptor {
  name = 'retry';
  priority = InterceptorPriority.HIGH;
  enabled = true;
  description = 'Retries failed requests with exponential backoff';
  phase = InterceptorPhase.ERROR as InterceptorPhase.ERROR;

  constructor(
    private maxRetries: number = 3,
    private baseDelay: number = 1000,
    private maxDelay: number = 30000
  ) {}

  shouldHandle(error: any, context: InterceptorContext): boolean {
    // Only retry specific error types
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408;
    }
    
    // Retry network errors
    return error.code === 'ECONNRESET' || 
           error.code === 'ECONNABORTED' || 
           error.code === 'ETIMEDOUT';
  }

  async execute(error: any, context: InterceptorContext): Promise<any> {
    if (context.attempt >= this.maxRetries) {
      throw error;
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, context.attempt - 1),
      this.maxDelay
    );

    await new Promise(resolve => setTimeout(resolve, delay));

    // Re-throw to trigger retry (handled by calling code)
    throw error;
  }
}

/**
 * Rate limiting interceptor
 */
export class RateLimitingInterceptor implements RequestInterceptor {
  name = 'rateLimiting';
  priority = InterceptorPriority.HIGH;
  enabled = true;
  description = 'Enforces rate limits on requests';
  phase = InterceptorPhase.REQUEST as InterceptorPhase.REQUEST;

  private requestTimes: number[] = [];

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000
  ) {}

  async execute(config: AxiosRequestConfig, context: InterceptorContext): Promise<AxiosRequestConfig> {
    const now = Date.now();
    
    // Clean old requests outside the window
    this.requestTimes = this.requestTimes.filter(time => now - time < this.windowMs);
    
    // Check if we've exceeded the rate limit
    if (this.requestTimes.length >= this.maxRequests) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Record this request
    this.requestTimes.push(now);
    
    return config;
  }
}

/**
 * Timeout interceptor
 */
export class TimeoutInterceptor implements RequestInterceptor {
  name = 'timeout';
  priority = InterceptorPriority.NORMAL;
  enabled = true;
  description = 'Adds timeout to requests';
  phase = InterceptorPhase.REQUEST as InterceptorPhase.REQUEST;

  constructor(private timeoutMs: number = 30000) {}

  async execute(config: AxiosRequestConfig, context: InterceptorContext): Promise<AxiosRequestConfig> {
    if (!config.timeout) {
      config.timeout = this.timeoutMs;
    }
    return config;
  }
}

/**
 * User Agent interceptor
 */
export class UserAgentInterceptor implements RequestInterceptor {
  name = 'userAgent';
  priority = InterceptorPriority.LOW;
  enabled = true;
  description = 'Adds User-Agent header to requests';
  phase = InterceptorPhase.REQUEST as InterceptorPhase.REQUEST;

  constructor(private userAgent: string = 'RestifiedTS/1.0.0') {}

  async execute(config: AxiosRequestConfig, context: InterceptorContext): Promise<AxiosRequestConfig> {
    if (!config.headers) {
      config.headers = {};
    }

    if (!config.headers['User-Agent']) {
      config.headers['User-Agent'] = this.userAgent;
    }

    return config;
  }
}

/**
 * Response time interceptor
 */
export class ResponseTimeInterceptor implements ResponseInterceptor {
  name = 'responseTime';
  priority = InterceptorPriority.LOW;
  enabled = true;
  description = 'Adds response time to response metadata';
  phase = InterceptorPhase.RESPONSE as InterceptorPhase.RESPONSE;

  async execute(response: AxiosResponse, context: InterceptorContext): Promise<AxiosResponse> {
    const responseTime = Date.now() - context.timestamp.getTime();
    
    // Add response time to response metadata
    (response as any).responseTime = responseTime;
    
    // Add to context metadata
    context.metadata.responseTime = responseTime;
    
    return response;
  }
}

/**
 * Compression interceptor
 */
export class CompressionInterceptor implements RequestInterceptor {
  name = 'compression';
  priority = InterceptorPriority.LOW;
  enabled = true;
  description = 'Adds compression headers to requests';
  phase = InterceptorPhase.REQUEST as InterceptorPhase.REQUEST;

  constructor(private acceptedEncodings: string[] = ['gzip', 'deflate']) {}

  async execute(config: AxiosRequestConfig, context: InterceptorContext): Promise<AxiosRequestConfig> {
    if (!config.headers) {
      config.headers = {};
    }

    if (!config.headers['Accept-Encoding']) {
      config.headers['Accept-Encoding'] = this.acceptedEncodings.join(', ');
    }

    return config;
  }
}

/**
 * CORS interceptor
 */
export class CORSInterceptor implements RequestInterceptor {
  name = 'cors';
  priority = InterceptorPriority.NORMAL;
  enabled = true;
  description = 'Adds CORS headers to requests';
  phase = InterceptorPhase.REQUEST as InterceptorPhase.REQUEST;

  constructor(private allowedOrigins: string[] = ['*']) {}

  async execute(config: AxiosRequestConfig, context: InterceptorContext): Promise<AxiosRequestConfig> {
    if (!config.headers) {
      config.headers = {};
    }

    if (!config.headers['Access-Control-Allow-Origin']) {
      config.headers['Access-Control-Allow-Origin'] = this.allowedOrigins.join(', ');
    }

    return config;
  }
}

/**
 * Request validation interceptor
 */
export class RequestValidationInterceptor implements RequestInterceptor {
  name = 'requestValidation';
  priority = InterceptorPriority.HIGH;
  enabled = true;
  description = 'Validates request data before sending';
  phase = InterceptorPhase.REQUEST as InterceptorPhase.REQUEST;

  constructor(private validator?: (config: AxiosRequestConfig) => boolean) {}

  async execute(config: AxiosRequestConfig, context: InterceptorContext): Promise<AxiosRequestConfig> {
    if (this.validator && !this.validator(config)) {
      throw new Error('Request validation failed');
    }

    // Basic validation
    if (!config.url) {
      throw new Error('Request URL is required');
    }

    if (!config.method) {
      config.method = 'GET';
    }

    return config;
  }
}

/**
 * Response validation interceptor
 */
export class ResponseValidationInterceptor implements ResponseInterceptor {
  name = 'responseValidation';
  priority = InterceptorPriority.HIGH;
  enabled = true;
  description = 'Validates response data';
  phase = InterceptorPhase.RESPONSE as InterceptorPhase.RESPONSE;

  constructor(private validator?: (response: AxiosResponse) => boolean) {}

  async execute(response: AxiosResponse, context: InterceptorContext): Promise<AxiosResponse> {
    if (this.validator && !this.validator(response)) {
      throw new Error('Response validation failed');
    }

    // Basic validation
    if (response.status < 200 || response.status >= 400) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    return response;
  }
}

/**
 * Cache interceptor
 */
export class CacheInterceptor implements RequestInterceptor {
  name = 'cache';
  priority = InterceptorPriority.NORMAL;
  enabled = true;
  description = 'Caches responses for GET requests';
  phase = InterceptorPhase.REQUEST as InterceptorPhase.REQUEST;

  private cache: Map<string, { response: AxiosResponse; timestamp: number }> = new Map();

  constructor(private cacheTTL: number = 300000) {} // 5 minutes default

  async execute(config: AxiosRequestConfig, context: InterceptorContext): Promise<AxiosRequestConfig> {
    if (config.method?.toUpperCase() === 'GET') {
      const cacheKey = this.getCacheKey(config);
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        // Return cached response by throwing it (will be caught by calling code)
        throw { cached: cached.response };
      }
    }

    return config;
  }

  private getCacheKey(config: AxiosRequestConfig): string {
    return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
  }

  getCache(): Map<string, { response: AxiosResponse; timestamp: number }> {
    return this.cache;
  }
}

/**
 * Monitoring interceptor
 */
export class MonitoringInterceptor implements RequestInterceptor {
  name = 'monitoring';
  priority = InterceptorPriority.LOWEST;
  enabled = true;
  description = 'Collects monitoring metrics';
  phase = InterceptorPhase.REQUEST as InterceptorPhase.REQUEST;

  private metrics: Map<string, {
    requests: number;
    responses: number;
    errors: number;
    totalResponseTime: number;
    averageResponseTime: number;
    lastRequest?: Date;
  }> = new Map();

  async execute(config: AxiosRequestConfig, context: InterceptorContext): Promise<AxiosRequestConfig> {
    const key = this.getMetricKey(config);
    const metric = this.metrics.get(key) || {
      requests: 0,
      responses: 0,
      errors: 0,
      totalResponseTime: 0,
      averageResponseTime: 0
    };

    metric.requests++;
    metric.lastRequest = new Date();
    this.metrics.set(key, metric);

    return config;
  }


  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    this.metrics.forEach((metric, key) => {
      result[key] = { ...metric };
    });
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  private getMetricKey(config: AxiosRequestConfig): string {
    return `${config.method?.toUpperCase()}:${config.url}`;
  }
}

/**
 * Built-in interceptor factory
 */
export class BuiltInInterceptorFactory {
  static createAuthenticationInterceptor(authProvider?: any): AuthenticationInterceptor {
    return new AuthenticationInterceptor(authProvider || null);
  }

  static createRequestLoggingInterceptor(logger?: any): RequestLoggingInterceptor {
    return new RequestLoggingInterceptor(logger);
  }

  static createResponseLoggingInterceptor(logger?: any): ResponseLoggingInterceptor {
    return new ResponseLoggingInterceptor(logger);
  }

  static createRetryInterceptor(maxRetries?: number, baseDelay?: number, maxDelay?: number): RetryInterceptor {
    return new RetryInterceptor(maxRetries, baseDelay, maxDelay);
  }

  static createRateLimitingInterceptor(maxRequests?: number, windowMs?: number): RateLimitingInterceptor {
    return new RateLimitingInterceptor(maxRequests, windowMs);
  }

  static createTimeoutInterceptor(timeoutMs?: number): TimeoutInterceptor {
    return new TimeoutInterceptor(timeoutMs);
  }

  static createUserAgentInterceptor(userAgent?: string): UserAgentInterceptor {
    return new UserAgentInterceptor(userAgent);
  }

  static createResponseTimeInterceptor(): ResponseTimeInterceptor {
    return new ResponseTimeInterceptor();
  }

  static createCompressionInterceptor(acceptedEncodings?: string[]): CompressionInterceptor {
    return new CompressionInterceptor(acceptedEncodings);
  }

  static createCORSInterceptor(allowedOrigins?: string[]): CORSInterceptor {
    return new CORSInterceptor(allowedOrigins);
  }

  static createRequestValidationInterceptor(validator?: (config: AxiosRequestConfig) => boolean): RequestValidationInterceptor {
    return new RequestValidationInterceptor(validator);
  }

  static createResponseValidationInterceptor(validator?: (response: AxiosResponse) => boolean): ResponseValidationInterceptor {
    return new ResponseValidationInterceptor(validator);
  }

  static createCacheInterceptor(cacheTTL?: number): CacheInterceptor {
    return new CacheInterceptor(cacheTTL);
  }

  static createMonitoringInterceptor(): MonitoringInterceptor {
    return new MonitoringInterceptor();
  }

  static createAllBasicInterceptors(): {
    request: RequestInterceptor[];
    response: ResponseInterceptor[];
    error: ErrorInterceptor[];
  } {
    return {
      request: [
        this.createRequestLoggingInterceptor(),
        this.createTimeoutInterceptor(),
        this.createUserAgentInterceptor(),
        this.createCompressionInterceptor(),
        this.createRequestValidationInterceptor()
      ],
      response: [
        this.createResponseLoggingInterceptor(),
        this.createResponseTimeInterceptor(),
        this.createResponseValidationInterceptor()
      ],
      error: [
        this.createRetryInterceptor()
      ]
    };
  }
}

export default BuiltInInterceptorFactory;