/**
 * HTTP Client for RestifiedTS
 * 
 * This module provides a robust HTTP client with support for:
 * - Axios-based HTTP requests
 * - Basic retry logic
 * - Request/response logging
 * - Performance metrics
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import { 
  RestifiedConfig, 
  RestifiedRequest, 
  RestifiedResponse, 
  RestifiedError,
  PerformanceMetrics
} from '../../types/RestifiedTypes';

// Extend AxiosRequestConfig to include metadata
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  metadata?: {
    requestId: string;
    startTime: number;
  };
}

export class HttpClient {
  private axiosInstance: AxiosInstance;
  private config: RestifiedConfig;
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();

  constructor(config: RestifiedConfig) {
    this.config = config;
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * Create axios instance with configuration
   */
  private createAxiosInstance(): AxiosInstance {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.config.baseURL,
      timeout: this.config.timeout || 30000,
      maxRedirects: this.config.maxRedirects || 5,
      headers: this.config.headers || {},
      validateStatus: this.config.validateStatus || ((status: number) => status >= 200 && status < 300)
    };

    return axios.create(axiosConfig);
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: any) => {
        const requestId = uuidv4();
        config.metadata = { requestId, startTime: performance.now() };
        
        if (this.config.logging?.level === 'debug') {
          console.log(`[RestifiedTS] Request ${requestId}:`, {
            method: config.method?.toUpperCase(),
            url: config.url,
            headers: this.config.logging?.includeHeaders ? config.headers : undefined
          });
        }

        return config;
      },
      (error) => {
        console.error('[RestifiedTS] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        const endTime = performance.now();
        const requestId = (response.config as any).metadata?.requestId;
        const startTime = (response.config as any).metadata?.startTime;
        const responseTime = startTime ? endTime - startTime : 0;

        if (this.config.logging?.level === 'debug') {
          console.log(`[RestifiedTS] Response ${requestId}:`, {
            status: response.status,
            statusText: response.statusText,
            responseTime: `${responseTime.toFixed(2)}ms`
          });
        }

        return response;
      },
      (error) => {
        const endTime = performance.now();
        const requestId = (error.config as any)?.metadata?.requestId;
        const startTime = (error.config as any)?.metadata?.startTime;
        const responseTime = startTime ? endTime - startTime : 0;

        console.error(`[RestifiedTS] Response error ${requestId}:`, {
          message: error.message,
          status: error.response?.status,
          responseTime: `${responseTime.toFixed(2)}ms`
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make HTTP request
   */
  async request(config: AxiosRequestConfig): Promise<RestifiedResponse> {
    const requestId = uuidv4();
    const startTime = performance.now();

    try {
      const response = await this.axiosInstance.request(config);

      const restifiedResponse: RestifiedResponse = {
        id: requestId,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as any,
        data: response.data,
        config: response.config,
        request: {
          id: requestId,
          method: config.method as Method,
          url: this.buildFullUrl(config),
          headers: config.headers as Record<string, string>,
          body: config.data,
          params: config.params,
          queryParams: config.params,
          timestamp: new Date()
        },
        responseTime: performance.now() - startTime,
        size: this.calculateResponseSize(response),
        timestamp: new Date()
      };

      return restifiedResponse;

    } catch (error: any) {
      const restifiedError: RestifiedError = new RestifiedError(
        error.message || 'Request failed',
        error
      );

      restifiedError.config = config;
      restifiedError.code = error.code;
      restifiedError.isAxiosError = error.isAxiosError;

      if (error.response) {
        restifiedError.response = {
          id: requestId,
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers as any,
          data: error.response.data,
          config: error.response.config,
          request: {
            id: requestId,
            method: config.method as Method,
            url: this.buildFullUrl(config),
            headers: config.headers as Record<string, string>,
            body: config.data,
            params: config.params,
            queryParams: config.params,
            timestamp: new Date()
          },
          responseTime: performance.now() - startTime,
          size: this.calculateResponseSize(error.response),
          timestamp: new Date()
        };
      }

      throw restifiedError;
    }
  }

  /**
   * Build full URL from config
   */
  private buildFullUrl(config: AxiosRequestConfig): string {
    const baseURL = config.baseURL || this.config.baseURL || '';
    const url = config.url || '';
    return baseURL + url;
  }

  /**
   * Calculate response size
   */
  private calculateResponseSize(response: AxiosResponse): number {
    let size = 0;

    if (response.data) {
      if (typeof response.data === 'string') {
        size += response.data.length;
      } else if (Buffer.isBuffer(response.data)) {
        size += response.data.length;
      } else {
        size += JSON.stringify(response.data).length;
      }
    }

    return size;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RestifiedConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update axios instance
    this.axiosInstance.defaults.baseURL = this.config.baseURL;
    this.axiosInstance.defaults.timeout = this.config.timeout || 30000;
    this.axiosInstance.defaults.headers = { ...this.axiosInstance.defaults.headers, ...this.config.headers };
  }

  /**
   * Get current configuration
   */
  getConfig(): RestifiedConfig {
    return { ...this.config };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.performanceMetrics.clear();
    
    // Clean up axios instance if it has an HTTP agent
    if (this.axiosInstance.defaults.httpAgent) {
      try {
        (this.axiosInstance.defaults.httpAgent as any).destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    if (this.axiosInstance.defaults.httpsAgent) {
      try {
        (this.axiosInstance.defaults.httpsAgent as any).destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

export default HttpClient;