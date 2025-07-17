/**
 * Authentication Manager for RestifiedTS
 * 
 * This module provides centralized authentication management
 * supporting multiple authentication providers and strategies.
 */

import { AxiosRequestConfig } from 'axios';
import { AuthProvider } from '../../types/RestifiedTypes';
import { BaseAuthProvider } from './AuthProvider';
import { BearerAuth } from './BearerAuth';
import { BasicAuth } from './BasicAuth';
import { ApiKeyAuth } from './ApiKeyAuth';
import { OAuth2Auth } from './OAuth2Auth';

/**
 * Authentication manager for handling multiple auth providers
 */
export class AuthManager {
  private providers: Map<string, AuthProvider> = new Map();
  private activeProvider?: string;

  /**
   * Add an authentication provider
   */
  addProvider(name: string, provider: AuthProvider): void {
    this.providers.set(name, provider);
    
    // Set as active if it's the first provider
    if (!this.activeProvider) {
      this.activeProvider = name;
    }
  }

  /**
   * Remove an authentication provider
   */
  removeProvider(name: string): boolean {
    const removed = this.providers.delete(name);
    
    // If we removed the active provider, clear it
    if (this.activeProvider === name) {
      this.activeProvider = undefined;
      // Set the first available provider as active
      const firstProvider = this.providers.keys().next().value;
      if (firstProvider) {
        this.activeProvider = firstProvider;
      }
    }
    
    return removed;
  }

  /**
   * Set the active authentication provider
   */
  setActiveProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Authentication provider '${name}' not found`);
    }
    this.activeProvider = name;
  }

  /**
   * Get the active authentication provider
   */
  getActiveProvider(): AuthProvider | undefined {
    if (!this.activeProvider) {
      return undefined;
    }
    return this.providers.get(this.activeProvider);
  }

  /**
   * Get a specific authentication provider by name
   */
  getProvider(name: string): AuthProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   */
  getProviders(): Record<string, AuthProvider> {
    const result: Record<string, AuthProvider> = {};
    this.providers.forEach((provider, name) => {
      result[name] = provider;
    });
    return result;
  }

  /**
   * List all provider names
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider exists
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Authenticate a request using the active provider
   */
  async authenticate(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    const provider = this.getActiveProvider();
    if (!provider) {
      return config; // No authentication configured
    }

    return await provider.authenticate(config);
  }

  /**
   * Authenticate a request using a specific provider
   */
  async authenticateWith(providerName: string, config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Authentication provider '${providerName}' not found`);
    }

    return await provider.authenticate(config);
  }

  /**
   * Refresh authentication for the active provider
   */
  async refresh(): Promise<void> {
    const provider = this.getActiveProvider();
    if (!provider || !provider.refresh) {
      return; // No refresh capability
    }

    await provider.refresh();
  }

  /**
   * Refresh authentication for a specific provider
   */
  async refreshProvider(name: string): Promise<void> {
    const provider = this.getProvider(name);
    if (!provider || !provider.refresh) {
      throw new Error(`Provider '${name}' does not support refresh`);
    }

    await provider.refresh();
  }

  /**
   * Check if the active provider is valid
   */
  isValid(): boolean {
    const provider = this.getActiveProvider();
    if (!provider) {
      return true; // No auth required
    }

    return provider.isValid ? provider.isValid() : true;
  }

  /**
   * Check if a specific provider is valid
   */
  isProviderValid(name: string): boolean {
    const provider = this.getProvider(name);
    if (!provider) {
      return false;
    }

    return provider.isValid ? provider.isValid() : true;
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
    this.activeProvider = undefined;
  }

  /**
   * Clean up all providers
   */
  async cleanup(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    this.providers.forEach(provider => {
      if ('cleanup' in provider && typeof provider.cleanup === 'function') {
        cleanupPromises.push(provider.cleanup());
      }
    });

    await Promise.all(cleanupPromises);
    this.clear();
  }

  /**
   * Create a Bearer token authentication provider
   */
  static createBearerAuth(token: string, headerName?: string, prefix?: string): BearerAuth {
    return new BearerAuth({ token, headerName, prefix });
  }

  /**
   * Create a Basic authentication provider
   */
  static createBasicAuth(username: string, password: string): BasicAuth {
    return new BasicAuth({ username, password });
  }

  /**
   * Create an API key authentication provider
   */
  static createApiKeyAuth(key: string, headerName?: string, location?: 'header' | 'query'): ApiKeyAuth {
    return new ApiKeyAuth({ key, headerName, location });
  }

  /**
   * Create an OAuth2 authentication provider
   */
  static createOAuth2Auth(config: {
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
    scope?: string;
    grantType?: 'client_credentials' | 'authorization_code' | 'password' | 'refresh_token';
  }): OAuth2Auth {
    return new OAuth2Auth(config);
  }

  /**
   * Get authentication summary
   */
  getSummary(): {
    activeProvider: string | undefined;
    totalProviders: number;
    providers: Array<{
      name: string;
      type: string;
      valid: boolean;
    }>;
  } {
    const providers: Array<{ name: string; type: string; valid: boolean }> = [];
    
    this.providers.forEach((provider, name) => {
      providers.push({
        name,
        type: provider.name,
        valid: provider.isValid ? provider.isValid() : true
      });
    });

    return {
      activeProvider: this.activeProvider,
      totalProviders: this.providers.size,
      providers
    };
  }
}

export default AuthManager;