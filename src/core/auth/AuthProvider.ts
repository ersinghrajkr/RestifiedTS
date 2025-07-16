// src/core/auth/AuthProvider.ts

import { RequestConfig } from '../../types/RestifiedTypes';

/**
 * Base authentication provider interface
 * Defines the contract for all authentication implementations
 * 
 * @example
 * ```typescript
 * class CustomAuthProvider extends AuthProvider {
 *   async authenticate(config: RequestConfig): Promise<RequestConfig> {
 *     // Custom authentication logic
 *     return config;
 *   }
 * }
 * ```
 */
export abstract class AuthProvider {
  /**
   * Authenticate a request by modifying the request configuration
   * 
   * @param config - Request configuration to authenticate
   * @returns Promise resolving to authenticated request configuration
   */
  abstract authenticate(config: RequestConfig): Promise<RequestConfig>;

  /**
   * Optional method to refresh authentication tokens
   * Should be implemented by providers that support token refresh
   */
  async refreshToken?(): Promise<void>;

  /**
   * Optional method to validate if current authentication is still valid
   * 
   * @returns Promise resolving to true if authentication is valid
   */
  async isValid?(): Promise<boolean>;

  /**
   * Optional method to clear/logout current authentication
   */
  async logout?(): Promise<void>;
}

// src/core/auth/BearerAuth.ts

/**
 * Bearer token authentication provider
 * Supports static tokens and dynamic token resolution
 * 
 * Features:
 * - Static bearer token authentication
 * - Dynamic token resolution from functions
 * - Automatic token refresh capabilities
 * - Token validation and expiry handling
 * - Configurable token prefix
 * 
 * @example
 * ```typescript
 * // Static token
 * const auth = new BearerAuth('your-token-here');
 * 
 * // Dynamic token from function
 * const auth = new BearerAuth(() => getTokenFromStorage());
 * 
 * // With custom prefix
 * const auth = new BearerAuth('token', { prefix: 'Token' });
 * 
 * // With auto-refresh
 * const auth = new BearerAuth(
 *   () => getCurrentToken(),
 *   { 
 *     autoRefresh: true,
 *     refreshFunction: () => refreshAccessToken()
 *   }
 * );
 * ```
 */
export class BearerAuth extends AuthProvider {
  private token: string | (() => string | Promise<string>);
  private readonly options: BearerAuthOptions;
  private cachedToken?: string;
  private tokenExpiry?: Date;

  constructor(
    token: string | (() => string | Promise<string>),
    options: BearerAuthOptions = {}
  ) {
    super();
    this.token = token;
    this.options = {
      prefix: 'Bearer',
      autoRefresh: false,
      cacheToken: true,
      ...options
    };
  }

  /**
   * Apply bearer token authentication to request
   */
  async authenticate(config: RequestConfig): Promise<RequestConfig> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Bearer token is not available');
    }

    return {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `${this.options.prefix} ${token}`
      }
    };
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<void> {
    if (!this.options.refreshFunction) {
      throw new Error('No refresh function configured for Bearer authentication');
    }

    try {
      const newToken = await this.options.refreshFunction();
      this.updateToken(newToken);
    } catch (error) {
      throw new Error(`Token refresh failed: ${(