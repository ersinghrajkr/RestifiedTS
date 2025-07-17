/**
 * Basic Authentication Provider for RestifiedTS
 * 
 * This module provides HTTP Basic authentication functionality
 * for HTTP requests in RestifiedTS.
 */

import { AxiosRequestConfig } from 'axios';
import { BasicAuthConfig } from '../../types/RestifiedTypes';
import { BaseAuthProvider } from './AuthProvider';

/**
 * Basic authentication provider
 */
export class BasicAuth extends BaseAuthProvider {
  private config: BasicAuthConfig;

  constructor(config: BasicAuthConfig) {
    super('basic');
    this.config = config;
  }

  /**
   * Authenticate the request by adding Basic auth header
   */
  async authenticate(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    if (!this.config.username || !this.config.password) {
      throw new Error('Username and password are required for Basic authentication');
    }

    // Method 1: Use Axios built-in auth
    config.auth = {
      username: this.config.username,
      password: this.config.password
    };

    // Method 2: Alternatively, set the Authorization header manually
    // const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    // if (!config.headers) {
    //   config.headers = {};
    // }
    // config.headers['Authorization'] = `Basic ${credentials}`;

    return config;
  }

  /**
   * Update credentials
   */
  updateCredentials(username: string, password: string): void {
    this.config.username = username;
    this.config.password = password;
  }

  /**
   * Get the current username
   */
  getUsername(): string | undefined {
    return this.config.username;
  }

  /**
   * Check if credentials are set
   */
  override isValid(): boolean {
    return !!(this.config.username && this.config.password);
  }

  /**
   * Encode credentials to Base64 (for manual header setting)
   */
  encodeCredentials(): string {
    if (!this.config.username || !this.config.password) {
      throw new Error('Username and password are required');
    }
    
    const credentials = `${this.config.username}:${this.config.password}`;
    return Buffer.from(credentials).toString('base64');
  }

  /**
   * Get the Authorization header value
   */
  getAuthorizationHeader(): string {
    return `Basic ${this.encodeCredentials()}`;
  }
}

export default BasicAuth;