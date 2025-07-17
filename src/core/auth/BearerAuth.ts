/**
 * Bearer Token Authentication Provider for RestifiedTS
 * 
 * This module provides Bearer token authentication functionality
 * for HTTP requests in RestifiedTS.
 */

import { AxiosRequestConfig } from 'axios';
import { BearerAuthConfig } from '../../types/RestifiedTypes';
import { BaseAuthProvider } from './AuthProvider';

/**
 * Bearer token authentication provider
 */
export class BearerAuth extends BaseAuthProvider {
  private config: BearerAuthConfig;

  constructor(config: BearerAuthConfig) {
    super('bearer');
    this.config = {
      headerName: 'Authorization',
      prefix: 'Bearer',
      ...config
    };
  }

  /**
   * Authenticate the request by adding Bearer token header
   */
  async authenticate(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    if (!this.config.token) {
      throw new Error('Bearer token is required but not provided');
    }

    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {};
    }

    // Add the Bearer token to the specified header
    const headerValue = this.config.prefix 
      ? `${this.config.prefix} ${this.config.token}`
      : this.config.token;
    
    const headerName = this.config.headerName || 'Authorization';
    (config.headers as any)[headerName] = headerValue;

    return config;
  }

  /**
   * Update the Bearer token
   */
  updateToken(token: string): void {
    this.config.token = token;
  }

  /**
   * Get the current token
   */
  getToken(): string | undefined {
    return this.config.token;
  }

  /**
   * Check if the token is set
   */
  override isValid(): boolean {
    return !!this.config.token;
  }

  /**
   * Set custom header name for the token
   */
  setHeaderName(headerName: string): void {
    this.config.headerName = headerName;
  }

  /**
   * Set custom prefix for the token
   */
  setPrefix(prefix: string): void {
    this.config.prefix = prefix;
  }

  /**
   * Remove the token prefix
   */
  removePrefix(): void {
    this.config.prefix = '';
  }
}

export default BearerAuth;