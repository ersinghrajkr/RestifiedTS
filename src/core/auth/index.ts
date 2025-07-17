/**
 * Authentication Module Exports for RestifiedTS
 * 
 * This module exports all authentication-related classes and utilities.
 */

// Base classes
export { BaseAuthProvider } from './AuthProvider';
export { AuthManager } from './AuthManager';

// Authentication providers
export { BearerAuth } from './BearerAuth';
export { BasicAuth } from './BasicAuth';
export { ApiKeyAuth } from './ApiKeyAuth';
export { OAuth2Auth } from './OAuth2Auth';

// Re-export types for convenience
export type {
  AuthProvider,
  BearerAuthConfig,
  BasicAuthConfig,
  ApiKeyConfig,
  OAuth2Config
} from '../../types/RestifiedTypes';

// Default export
export { AuthManager as default } from './AuthManager';