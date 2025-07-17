/**
 * API Key Authentication Provider for RestifiedTS
 * 
 * This module provides API key authentication functionality
 * for HTTP requests in RestifiedTS.
 */

import { AxiosRequestConfig } from 'axios';
import { ApiKeyConfig } from '../../types/RestifiedTypes';
import { BaseAuthProvider } from './AuthProvider';

/**
 * API Key authentication provider
 */
export class ApiKeyAuth extends BaseAuthProvider {
  private config: ApiKeyConfig;

  constructor(config: ApiKeyConfig) {
    super('apikey');
    this.config = {
      headerName: 'X-API-Key',
      location: 'header',
      ...config
    };
  }

  /**
   * Authenticate the request by adding API key
   */
  async authenticate(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    if (!this.config.key) {
      throw new Error('API key is required but not provided');
    }

    if (this.config.location === 'header') {
      // Add API key to header
      if (!config.headers) {
        config.headers = {};
      }
      (config.headers as any)[this.config.headerName!] = this.config.key;
    } else if (this.config.location === 'query') {
      // Add API key to query parameters
      if (!config.params) {
        config.params = {};
      }
      const paramName = this.config.queryParamName || this.config.headerName || 'api_key';
      config.params[paramName] = this.config.key;
    }

    return config;
  }

  /**
   * Update the API key
   */
  updateKey(key: string): void {
    this.config.key = key;
  }

  /**
   * Get the current API key
   */
  getKey(): string | undefined {
    return this.config.key;
  }

  /**
   * Set the location for API key (header or query)
   */
  setLocation(location: 'header' | 'query'): void {
    this.config.location = location;
  }

  /**
   * Set custom header name for the API key
   */
  setHeaderName(headerName: string): void {
    this.config.headerName = headerName;
  }

  /**
   * Set custom query parameter name for the API key
   */
  setQueryParamName(queryParamName: string): void {
    this.config.queryParamName = queryParamName;
  }

  /**
   * Check if the API key is set
   */
  override isValid(): boolean {
    return !!this.config.key;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<ApiKeyConfig> {
    return Object.freeze({ ...this.config });
  }
}

export default ApiKeyAuth;