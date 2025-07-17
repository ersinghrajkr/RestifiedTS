/**
 * OAuth2 Authentication Provider for RestifiedTS
 * 
 * This module provides OAuth2 authentication functionality
 * including token management and automatic token refresh.
 */

import axios, { AxiosRequestConfig } from 'axios';
import { OAuth2Config } from '../../types/RestifiedTypes';
import { BaseAuthProvider } from './AuthProvider';

/**
 * OAuth2 authentication provider
 */
export class OAuth2Auth extends BaseAuthProvider {
  private config: OAuth2Config;
  private tokenRefreshPromise?: Promise<void>;

  constructor(config: OAuth2Config) {
    super('oauth2');
    this.config = {
      grantType: 'client_credentials',
      ...config
    };
  }

  /**
   * Authenticate the request by adding OAuth2 access token
   */
  async authenticate(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    // Check if we need to get/refresh the token
    if (!this.isTokenValid()) {
      await this.fetchAccessToken();
    }

    if (!this.config.accessToken) {
      throw new Error('OAuth2 access token is not available');
    }

    // Add the access token to the request
    if (!config.headers) {
      config.headers = {};
    }
    config.headers['Authorization'] = `Bearer ${this.config.accessToken}`;

    return config;
  }

  /**
   * Get access token from OAuth2 server
   */
  async fetchAccessToken(): Promise<string> {
    // Prevent multiple simultaneous token requests
    if (this.tokenRefreshPromise) {
      await this.tokenRefreshPromise;
      return this.config.accessToken!;
    }

    this.tokenRefreshPromise = this.performTokenRequest();
    
    try {
      await this.tokenRefreshPromise;
      return this.config.accessToken!;
    } finally {
      this.tokenRefreshPromise = undefined;
    }
  }

  /**
   * Perform the actual token request
   */
  private async performTokenRequest(): Promise<void> {
    const tokenData: Record<string, string> = {
      grant_type: this.config.grantType!
    };

    // Add grant type specific parameters
    switch (this.config.grantType) {
      case 'client_credentials':
        tokenData.client_id = this.config.clientId;
        tokenData.client_secret = this.config.clientSecret;
        if (this.config.scope) {
          tokenData.scope = this.config.scope;
        }
        break;

      case 'authorization_code':
        tokenData.client_id = this.config.clientId;
        tokenData.client_secret = this.config.clientSecret;
        // Note: authorization_code would need additional parameters like 'code'
        break;

      case 'refresh_token':
        if (!this.config.refreshToken) {
          throw new Error('Refresh token is required for refresh_token grant type');
        }
        tokenData.refresh_token = this.config.refreshToken;
        tokenData.client_id = this.config.clientId;
        tokenData.client_secret = this.config.clientSecret;
        break;

      case 'password':
        tokenData.client_id = this.config.clientId;
        tokenData.client_secret = this.config.clientSecret;
        // Note: password grant would need username and password
        break;
    }

    try {
      const response = await axios.post(this.config.tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenResponse = response.data;
      this.config.accessToken = tokenResponse.access_token;
      
      if (tokenResponse.refresh_token) {
        this.config.refreshToken = tokenResponse.refresh_token;
      }

      // Calculate expiration time
      if (tokenResponse.expires_in) {
        const expiresInMs = tokenResponse.expires_in * 1000;
        this.config.expiresAt = new Date(Date.now() + expiresInMs);
      }

    } catch (error) {
      throw new Error(`Failed to get OAuth2 access token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  override async refresh(): Promise<void> {
    if (!this.config.refreshToken) {
      // If no refresh token, try to get a new token
      await this.fetchAccessToken();
      return;
    }

    // Update grant type temporarily for refresh
    const originalGrantType = this.config.grantType;
    this.config.grantType = 'refresh_token';
    
    try {
      await this.fetchAccessToken();
    } finally {
      this.config.grantType = originalGrantType;
    }
  }

  /**
   * Check if the current token is valid
   */
  override isValid(): boolean {
    return this.isTokenValid();
  }

  /**
   * Check if the access token is valid and not expired
   */
  private isTokenValid(): boolean {
    if (!this.config.accessToken) {
      return false;
    }

    if (this.config.expiresAt && this.config.expiresAt <= new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | undefined {
    return this.config.accessToken;
  }

  /**
   * Get the current refresh token
   */
  getRefreshToken(): string | undefined {
    return this.config.refreshToken;
  }

  /**
   * Set a custom access token (for testing or manual token management)
   */
  setAccessToken(token: string, expiresIn?: number): void {
    this.config.accessToken = token;
    
    if (expiresIn) {
      this.config.expiresAt = new Date(Date.now() + expiresIn * 1000);
    }
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.config.accessToken = undefined;
    this.config.refreshToken = undefined;
    this.config.expiresAt = undefined;
  }

  /**
   * Get token expiration date
   */
  getExpirationDate(): Date | undefined {
    return this.config.expiresAt;
  }

  /**
   * Check if token will expire within the specified seconds
   */
  willExpireWithin(seconds: number): boolean {
    if (!this.config.expiresAt) {
      return false;
    }

    const expirationBuffer = new Date(Date.now() + seconds * 1000);
    return this.config.expiresAt <= expirationBuffer;
  }
}

export default OAuth2Auth;