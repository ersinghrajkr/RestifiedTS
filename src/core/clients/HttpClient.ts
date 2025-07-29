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
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { 
  RestifiedConfig, 
  RestifiedRequest, 
  RestifiedResponse, 
  RestifiedError,
  PerformanceMetrics
} from '../../types/RestifiedTypes';
import { ReportingManager } from '../../reporting/ReportingManager';

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
  private reportingManager?: ReportingManager;

  constructor(config: RestifiedConfig, reportingManager?: ReportingManager) {
    this.config = config;
    this.reportingManager = reportingManager;
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

    // Apply proxy configuration if available
    if (this.config.proxy) {
      const proxyConfig = this.config.proxy;
      const proxyUrl = `${proxyConfig.protocol || 'http'}://${proxyConfig.host}:${proxyConfig.port}`;
      
      // Add authentication if provided
      const proxyUrlWithAuth = proxyConfig.username && proxyConfig.password
        ? `${proxyConfig.protocol || 'http'}://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyConfig.port}`
        : proxyUrl;

      // Create appropriate proxy agents based on protocol
      if (proxyConfig.protocol === 'socks4' || proxyConfig.protocol === 'socks5') {
        // SOCKS proxy
        const socksAgent = new SocksProxyAgent(proxyUrlWithAuth);
        axiosConfig.httpAgent = socksAgent;
        axiosConfig.httpsAgent = socksAgent;
      } else {
        // HTTP/HTTPS proxy
        axiosConfig.httpAgent = new HttpProxyAgent(proxyUrlWithAuth);
        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrlWithAuth);
      }
    } else {
      // Check for standard environment variables as fallback
      const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
      const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
      
      if (httpProxy) {
        axiosConfig.httpAgent = new HttpProxyAgent(httpProxy);
      }
      
      if (httpsProxy) {
        axiosConfig.httpsAgent = new HttpsProxyAgent(httpsProxy);
      }
    }

    // Apply SSL configuration if available
    if (this.config.ssl) {
      const sslConfig = this.config.ssl;
      
      // Configure HTTPS agent with SSL options
      if (!axiosConfig.httpsAgent) {
        const { Agent: HttpsAgent } = require('https');
        axiosConfig.httpsAgent = new HttpsAgent({
          rejectUnauthorized: sslConfig.rejectUnauthorized !== false,
          cert: sslConfig.cert,
          key: sslConfig.key,
          ca: sslConfig.ca,
          passphrase: sslConfig.passphrase
        });
      }
    }

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

    // Prepare request object for logging
    const requestForLogging = {
      id: requestId,
      method: config.method as Method,
      url: this.buildFullUrl(config),
      headers: config.headers as Record<string, string>,
      data: config.data,
      params: config.params,
      timestamp: new Date()
    };

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

      // Log HTTP request/response through ReportingManager
      if (this.reportingManager) {
        await this.reportingManager.logHttpRequest(requestForLogging, restifiedResponse);
      }

      // Automatically attach to Mochawesome if available (no user setup required)
      this.autoAttachToMochawesome(requestForLogging, restifiedResponse);

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

        // Log HTTP request/response even for errors
        if (this.reportingManager) {
          await this.reportingManager.logHttpRequest(requestForLogging, restifiedError.response);
          // Also attach error details to test reports
          await this.reportingManager.attachErrorToReport(restifiedError, {
            request: requestForLogging,
            response: restifiedError.response,
            type: 'http_error'
          });
        }

        // Automatically attach to Mochawesome if available (no user setup required)
        this.autoAttachToMochawesome(requestForLogging, restifiedError.response, restifiedError);
      } else {
        // Log request without response for network errors
        if (this.reportingManager) {
          await this.reportingManager.logHttpRequest(requestForLogging);
          // Also attach error details to test reports
          await this.reportingManager.attachErrorToReport(restifiedError, {
            request: requestForLogging,
            type: 'network_error'
          });
        }

        // Automatically attach to Mochawesome if available (no user setup required)
        this.autoAttachToMochawesome(requestForLogging, undefined, restifiedError);
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
    
    // If proxy or SSL configuration changed, recreate the axios instance
    if (config.proxy || config.ssl) {
      this.axiosInstance = this.createAxiosInstance();
      this.setupInterceptors();
    } else {
      // Update simple configuration
      this.axiosInstance.defaults.baseURL = this.config.baseURL;
      this.axiosInstance.defaults.timeout = this.config.timeout || 30000;
      this.axiosInstance.defaults.headers = { ...this.axiosInstance.defaults.headers, ...this.config.headers };
    }
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
   * Automatically attach request/response data to Mochawesome if available
   * This provides transparent integration without requiring user setup
   */
  private autoAttachToMochawesome(requestData: any, responseData?: any, error?: any): void {
    try {
      // Only proceed if we're in a Mocha environment
      if (!this.isMochaEnvironment()) {
        return;
      }

      // Get current test reference from global context
      const currentMochaTest = this.getCurrentMochaTest();
      if (!currentMochaTest || !this.isValidMochaTest(currentMochaTest)) {
        if (this.config.logging?.level === 'debug') {
          console.debug('[RestifiedTS] No valid Mocha test context available for automatic attachment');
        }
        return;
      }

      // Try to use Mochawesome's addContext function
      try {
        const addContext = require('mochawesome/addContext');
        
        // Attach request details
        addContext(currentMochaTest, {
          title: '🔍 HTTP Request Details',
          value: JSON.stringify({
            method: requestData.method,
            url: requestData.url,
            headers: requestData.headers,
            body: requestData.data || requestData.body,
            timestamp: requestData.timestamp || new Date().toISOString()
          }, null, 2)
        });

        // Attach response details if available
        if (responseData) {
          addContext(currentMochaTest, {
            title: responseData.status >= 400 ? '❌ HTTP Response (Error)' : '✅ HTTP Response Details',
            value: JSON.stringify({
              status: responseData.status,
              statusText: responseData.statusText,
              headers: responseData.headers,
              data: responseData.data,
              responseTime: responseData.responseTime,
              timestamp: responseData.timestamp || new Date().toISOString()
            }, null, 2)
          });
        }

        // Attach error details if available
        if (error) {
          addContext(currentMochaTest, {
            title: '❌ Error Details',
            value: JSON.stringify({
              message: error.message,
              name: error.name,
              code: error.code,
              stack: error.stack,
              timestamp: new Date().toISOString()
            }, null, 2)
          });
        }

        if (this.config.logging?.level === 'debug') {
          console.log('[RestifiedTS] Request/Response data automatically attached to Mochawesome report');
        }

      } catch (mochaError) {
        // Mochawesome not available or addContext failed - this is expected in some environments
        if (this.config.logging?.level === 'debug') {
          console.debug('[RestifiedTS] Mochawesome addContext failed:', (mochaError as Error).message);
        }
      }
    } catch (error) {
      // Silently ignore errors to avoid breaking normal request flow
      if (this.config.logging?.level === 'debug') {
        console.debug('[RestifiedTS] Auto-attach to Mochawesome failed:', (error as Error).message);
      }
    }
  }

  /**
   * Check if we're in a Mocha environment
   */
  private isMochaEnvironment(): boolean {
    return (
      // Check for Mocha globals
      (typeof global !== 'undefined' && 
       (global as any).describe && 
       (global as any).it && 
       (global as any).beforeEach) ||
      // Check for test environment
      process.env.NODE_ENV === 'test' || 
      process.env.NODE_ENV === 'testing' ||
      // Check if we're running via mocha command
      process.argv.some(arg => arg.includes('mocha'))
    );
  }

  /**
   * Get current Mocha test instance from global context
   */
  private getCurrentMochaTest(): any {
    try {
      if (typeof global !== 'undefined') {
        // First try to get the actual test context that Mochawesome expects
        // This is set by our improved setup
        if ((global as any).restifiedCurrentTest) {
          return (global as any).restifiedCurrentTest;
        }
        
        // Fallback to the original method
        if ((global as any).currentMochaTest) {
          return (global as any).currentMochaTest;
        }
        
        // Try to get from mochaContext
        if ((global as any).mochaContext && (global as any).mochaContext.currentTest) {
          return (global as any).mochaContext.currentTest;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate that we have a proper Mocha test object for addContext
   */
  private isValidMochaTest(testObj: any): boolean {
    try {
      // Check if it's a valid test object that can be used with addContext
      // The test object from global.restifiedCurrentTest works with addContext
      // even if it doesn't have all the expected methods
      return testObj && 
             typeof testObj === 'object' &&
             testObj.constructor &&
             testObj.constructor.name === 'Context';
    } catch (error) {
      return false;
    }
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