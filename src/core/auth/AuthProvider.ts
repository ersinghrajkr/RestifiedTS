/**
 * Base Authentication Provider for RestifiedTS
 * 
 * This module provides the base interface and abstract implementation
 * for authentication providers in RestifiedTS.
 */

import { AxiosRequestConfig } from 'axios';
import { AuthProvider as IAuthProvider } from '../../types/RestifiedTypes';

/**
 * Abstract base class for authentication providers
 */
export abstract class BaseAuthProvider implements IAuthProvider {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Authenticate the request by modifying the config
   */
  abstract authenticate(config: AxiosRequestConfig): Promise<AxiosRequestConfig>;

  /**
   * Refresh authentication credentials if applicable
   */
  async refresh?(): Promise<void> {
    // Default implementation - override if needed
  }

  /**
   * Check if the authentication is still valid
   */
  isValid?(): boolean {
    // Default implementation - override if needed
    return true;
  }

  /**
   * Clean up any resources when the provider is destroyed
   */
  async cleanup?(): Promise<void> {
    // Default implementation - override if needed
  }
}

export default BaseAuthProvider;