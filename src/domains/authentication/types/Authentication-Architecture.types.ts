/**
 * Authentication Domain - TypeScript Type Definitions
 * 
 * This file contains all TypeScript interfaces, types, and enums for the Authentication domain.
 * Following SOLID principles and Domain-Driven Design patterns.
 * 
 * @author Raj Kumar
 * @version 1.0.0
 * @since 1.0.0
 */

import { Entity, ValueObject, DomainEvent, Specification } from '../../../shared/domain';
import { Result, Either, Optional } from '../../../shared/utils';

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

/**
 * Authentication Type Enumeration
 * 
 * Defines the supported authentication methods in the system.
 */
export enum AuthType {
  BEARER = 'BEARER',
  BASIC = 'BASIC',
  API_KEY = 'API_KEY',
  OAUTH2 = 'OAUTH2',
  JWT = 'JWT',
  CUSTOM = 'CUSTOM'
}

/**
 * Token Type Enumeration
 * 
 * Defines the different types of authentication tokens.
 */
export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
  ID = 'ID',
  API_KEY = 'API_KEY'
}

/**
 * Credential Type Enumeration
 * 
 * Defines the different types of credentials that can be used for authentication.
 */
export enum CredentialType {
  BEARER_TOKEN = 'BEARER_TOKEN',
  BASIC_AUTH = 'BASIC_AUTH',
  API_KEY = 'API_KEY',
  OAUTH2 = 'OAUTH2',
  JWT = 'JWT',
  CUSTOM = 'CUSTOM'
}

/**
 * Authentication Status Enumeration
 * 
 * Represents the current status of an authentication attempt or session.
 */
export enum AuthenticationStatus {
  PENDING = 'PENDING',
  AUTHENTICATED = 'AUTHENTICATED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  REFRESHING = 'REFRESHING',
  REVOKED = 'REVOKED'
}

// ============================================================================
// VALUE OBJECT INTERFACES
// ============================================================================

/**
 * Authentication Provider GUID
 * 
 * Strongly-typed identifier for authentication providers.
 */
export interface AuthProviderGuid extends ValueObject {
  readonly value: string;
  
  /**
   * Generate a new provider GUID
   */
  static generate(): AuthProviderGuid;
  
  /**
   * Create GUID from string value
   * @param value - String value to create GUID from
   */
  static fromString(value: string): AuthProviderGuid;
}

/**
 * Authentication Session GUID
 * 
 * Strongly-typed identifier for authentication sessions.
 */
export interface AuthSessionGuid extends ValueObject {
  readonly value: string;
  
  /**
   * Generate a new session GUID
   */
  static generate(): AuthSessionGuid;
  
  /**
   * Create GUID from string value
   * @param value - String value to create GUID from
   */
  static fromString(value: string): AuthSessionGuid;
}

/**
 * Token Properties Interface
 * 
 * Properties required to create a Token value object.
 */
export interface TokenProps {
  readonly value: string;
  readonly type: TokenType;
  readonly expiresAt?: ExpirationTime;
  readonly scope?: TokenScope;
  readonly metadata?: TokenMetadata;
}

/**
 * Token Scope Interface
 * 
 * Represents the scope of permissions granted by a token.
 */
export interface TokenScope extends ValueObject {
  readonly scopes: readonly string[];
  
  /**
   * Check if scope includes a specific permission
   * @param permission - Permission to check
   */
  includes(permission: string): boolean;
  
  /**
   * Check if scope includes all specified permissions
   * @param permissions - Permissions to check
   */
  includesAll(permissions: string[]): boolean;
  
  /**
   * Check if scope includes any of the specified permissions
   * @param permissions - Permissions to check
   */
  includesAny(permissions: string[]): boolean;
}

/**
 * Token Metadata Interface
 * 
 * Additional metadata associated with a token.
 */
export interface TokenMetadata extends ValueObject {
  readonly issuer?: string;
  readonly audience?: string;
  readonly subject?: string;
  readonly issuedAt?: Date;
  readonly notBefore?: Date;
  readonly jwtId?: string;
  readonly customClaims?: Record<string, any>;
}

/**
 * Expiration Time Interface
 * 
 * Represents token or credential expiration information.
 */
export interface ExpirationTime extends ValueObject {
  readonly expiresAt: Date;
  readonly expiresIn: number;
  readonly bufferTime: number;
  
  /**
   * Check if the expiration time has passed
   */
  isExpired(): boolean;
  
  /**
   * Check if expiration is within buffer time
   * @param bufferSeconds - Buffer time in seconds (optional override)
   */
  isExpiringSoon(bufferSeconds?: number): boolean;
  
  /**
   * Get seconds until expiration
   */
  timeToExpiry(): number;
  
  /**
   * Get milliseconds until expiration
   */
  millisecondsToExpiry(): number;
}

/**
 * Authentication Configuration Interface
 * 
 * Configuration properties for authentication providers.
 */
export interface AuthConfig extends ValueObject {
  readonly authType: AuthType;
  readonly endpoint?: string;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly scope?: string[];
  readonly additionalParams?: Record<string, string>;
  readonly timeout?: number;
  readonly retryConfig?: RetryConfig;
  
  /**
   * Validate configuration for the specified auth type
   */
  validate(): ValidationResult;
  
  /**
   * Get sanitized configuration for logging
   */
  sanitizeForLogging(): Record<string, any>;
  
  /**
   * Convert to JSON representation
   */
  toJson(): Record<string, any>;
}

/**
 * Retry Configuration Interface
 * 
 * Configuration for authentication retry logic.
 */
export interface RetryConfig extends ValueObject {
  readonly maxRetries: number;
  readonly initialDelay: number;
  readonly maxDelay: number;
  readonly backoffFactor: number;
  readonly retryableErrors: string[];
}

// ============================================================================
// ENTITY INTERFACES
// ============================================================================

/**
 * Authentication Provider Entity Interface
 * 
 * Represents a configured authentication provider.
 */
export interface IAuthProvider extends Entity<AuthProviderGuid> {
  readonly type: AuthType;
  readonly config: AuthConfig;
  readonly isActive: boolean;
  readonly lastUsed?: Date;
  readonly statistics: AuthProviderStatistics;
  
  /**
   * Authenticate a request using this provider
   * @param request - Authentication request
   */
  authenticate(request: AuthenticationRequest): Promise<AuthenticatedRequest>;
  
  /**
   * Activate the authentication provider
   */
  activate(): void;
  
  /**
   * Deactivate the authentication provider
   */
  deactivate(): void;
  
  /**
   * Get provider usage statistics
   */
  getStatistics(): AuthProviderStatistics;
}

/**
 * Credential Entity Interface
 * 
 * Represents authentication credentials.
 */
export interface ICredential extends Entity<string> {
  readonly type: CredentialType;
  readonly value: string;
  readonly metadata: CredentialMetadata;
  readonly expiresAt?: ExpirationTime;
  readonly userId?: string;
  
  /**
   * Check if credential is expired
   */
  isExpired(): boolean;
  
  /**
   * Check if credential is expiring soon
   * @param bufferSeconds - Buffer time in seconds
   */
  isExpiringSoon(bufferSeconds?: number): boolean;
  
  /**
   * Get sanitized credential for logging
   */
  sanitizeForLogging(): string;
  
  /**
   * Validate credential format and content
   */
  validate(): ValidationResult;
}

/**
 * Authentication Session Entity Interface
 * 
 * Represents an active authentication session.
 */
export interface IAuthSession extends Entity<AuthSessionGuid> {
  readonly provider: IAuthProvider;
  readonly credential: ICredential;
  readonly startTime: Date;
  readonly lastActivity: Date;
  readonly metadata: SessionMetadata;
  
  /**
   * Check if session is valid and active
   */
  isValid(): boolean;
  
  /**
   * Refresh session credentials
   */
  refresh(): Promise<void>;
  
  /**
   * Invalidate the session
   */
  invalidate(): void;
  
  /**
   * Update last activity timestamp
   */
  updateActivity(): void;
  
  /**
   * Get session duration in seconds
   */
  getDuration(): number;
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

/**
 * Authentication Request Interface
 * 
 * Represents a request for authentication.
 */
export interface AuthenticationRequest {
  readonly credential: ICredential;
  readonly metadata?: RequestMetadata;
  readonly context?: AuthenticationContext;
}

/**
 * Authenticated Request Interface
 * 
 * Represents a request that has been authenticated.
 */
export interface AuthenticatedRequest {
  readonly originalRequest: AuthenticationRequest;
  readonly credential: ICredential;
  readonly headers: Record<string, string>;
  readonly metadata: AuthenticatedRequestMetadata;
}

/**
 * Authentication Context Interface
 * 
 * Context information for authentication requests.
 */
export interface AuthenticationContext {
  readonly requestId: string;
  readonly timestamp: Date;
  readonly clientInfo?: ClientInfo;
  readonly additionalContext?: Record<string, any>;
}

/**
 * Client Information Interface
 * 
 * Information about the client making the authentication request.
 */
export interface ClientInfo {
  readonly name: string;
  readonly version: string;
  readonly userAgent?: string;
  readonly ipAddress?: string;
}

/**
 * Authentication Provider Statistics Interface
 * 
 * Usage statistics for authentication providers.
 */
export interface AuthProviderStatistics extends ValueObject {
  readonly totalAttempts: number;
  readonly successfulAttempts: number;
  readonly failedAttempts: number;
  readonly averageResponseTime: number;
  readonly lastSuccessTime?: Date;
  readonly lastFailureTime?: Date;
  
  /**
   * Record an authentication attempt
   * @param isSuccess - Whether the attempt was successful
   * @param responseTime - Response time in milliseconds
   */
  recordAttempt(isSuccess: boolean, responseTime?: number): void;
  
  /**
   * Get success rate as percentage
   */
  getSuccessRate(): number;
  
  /**
   * Reset statistics
   */
  reset(): void;
}

/**
 * Credential Metadata Interface
 * 
 * Additional metadata for credentials.
 */
export interface CredentialMetadata extends ValueObject {
  readonly source: string;
  readonly createdAt: Date;
  readonly lastUsed?: Date;
  readonly tags?: string[];
  readonly customData?: Record<string, any>;
}

/**
 * Session Metadata Interface
 * 
 * Additional metadata for authentication sessions.
 */
export interface SessionMetadata extends ValueObject {
  readonly userAgent?: string;
  readonly ipAddress?: string;
  readonly location?: string;
  readonly deviceInfo?: DeviceInfo;
  readonly customData?: Record<string, any>;
}

/**
 * Device Information Interface
 * 
 * Information about the device used for authentication.
 */
export interface DeviceInfo {
  readonly type: string;
  readonly os: string;
  readonly browser?: string;
  readonly version?: string;
}

/**
 * Request Metadata Interface
 * 
 * Metadata for authentication requests.
 */
export interface RequestMetadata {
  readonly requestId: string;
  readonly timestamp: Date;
  readonly source: string;
  readonly priority?: number;
  readonly tags?: string[];
}

/**
 * Authenticated Request Metadata Interface
 * 
 * Metadata for authenticated requests.
 */
export interface AuthenticatedRequestMetadata extends RequestMetadata {
  readonly authenticationTime: Date;
  readonly providerUsed: string;
  readonly tokenType: TokenType;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Authentication Service Interface
 * 
 * Core authentication business logic.
 */
export interface IAuthenticationService {
  /**
   * Authenticate using specified provider and credentials
   * @param providerId - Authentication provider identifier
   * @param credentials - Authentication credentials
   */
  authenticate(providerId: AuthProviderGuid, credentials: ICredential): Promise<IAuthSession>;
  
  /**
   * Validate an existing authentication session
   * @param sessionId - Session identifier
   */
  validateSession(sessionId: AuthSessionGuid): Promise<SessionValidationResult>;
  
  /**
   * Handle authentication failure
   * @param error - Authentication error
   * @param retryContext - Retry context
   */
  handleAuthFailure(error: AuthenticationError, retryContext: RetryContext): Promise<RetryDecision>;
}

/**
 * Token Refresh Service Interface
 * 
 * Handles automatic token refresh operations.
 */
export interface ITokenRefreshService {
  /**
   * Schedule token refresh for a session
   * @param session - Authentication session
   */
  scheduleRefresh(session: IAuthSession): void;
  
  /**
   * Refresh token immediately
   * @param refreshToken - Refresh token
   */
  refreshToken(refreshToken: string): Promise<Token>;
  
  /**
   * Handle token refresh failure
   * @param error - Refresh error
   * @param session - Authentication session
   */
  handleRefreshFailure(error: TokenRefreshError, session: IAuthSession): Promise<void>;
}

/**
 * Authentication Provider Factory Interface
 * 
 * Creates and configures authentication providers.
 */
export interface IAuthProviderFactory {
  /**
   * Create authentication provider
   * @param type - Authentication type
   * @param config - Provider configuration
   */
  createProvider(type: AuthType, config: AuthConfig): Promise<IAuthProvider>;
  
  /**
   * Validate provider configuration
   * @param config - Configuration to validate
   */
  validateConfig(config: AuthConfig): ValidationResult;
  
  /**
   * Register custom authentication provider
   * @param provider - Custom provider to register
   */
  registerProvider(provider: IAuthProvider): void;
}

/**
 * Credential Validation Service Interface
 * 
 * Validates and secures credentials.
 */
export interface ICredentialValidationService {
  /**
   * Validate credential format and content
   * @param credential - Credential to validate
   */
  validateCredential(credential: ICredential): ValidationResult;
  
  /**
   * Encrypt credential value
   * @param value - Value to encrypt
   */
  encryptCredential(value: string): Promise<string>;
  
  /**
   * Decrypt credential value
   * @param encryptedValue - Encrypted value to decrypt
   */
  decryptCredential(encryptedValue: string): Promise<string>;
  
  /**
   * Sanitize credential for logging
   * @param credential - Credential to sanitize
   */
  sanitizeForLogging(credential: ICredential): string;
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

/**
 * Authentication Provider Repository Interface
 * 
 * Data access for authentication providers.
 */
export interface IAuthProviderRepository {
  /**
   * Find provider by ID
   * @param id - Provider identifier
   */
  findById(id: AuthProviderGuid): Promise<IAuthProvider | null>;
  
  /**
   * Find provider by type and name
   * @param type - Authentication type
   * @param name - Provider name
   */
  findByTypeAndName(type: AuthType, name: string): Promise<IAuthProvider | null>;
  
  /**
   * Find all active providers
   */
  findAllActive(): Promise<IAuthProvider[]>;
  
  /**
   * Find providers by type
   * @param type - Authentication type
   */
  findByType(type: AuthType): Promise<IAuthProvider[]>;
  
  /**
   * Save provider
   * @param provider - Provider to save
   */
  save(provider: IAuthProvider): Promise<void>;
  
  /**
   * Remove provider
   * @param id - Provider ID to remove
   */
  remove(id: AuthProviderGuid): Promise<void>;
  
  /**
   * Check if provider exists
   * @param id - Provider ID to check
   */
  exists(id: AuthProviderGuid): Promise<boolean>;
}

/**
 * Credential Repository Interface
 * 
 * Data access for credentials.
 */
export interface ICredentialRepository {
  /**
   * Find credential by ID
   * @param id - Credential identifier
   */
  findById(id: string): Promise<ICredential | null>;
  
  /**
   * Find credentials by user ID
   * @param userId - User identifier
   */
  findByUserId(userId: string): Promise<ICredential[]>;
  
  /**
   * Find credentials by type
   * @param type - Credential type
   */
  findByType(type: CredentialType): Promise<ICredential[]>;
  
  /**
   * Save credential
   * @param credential - Credential to save
   */
  save(credential: ICredential): Promise<void>;
  
  /**
   * Remove credential
   * @param id - Credential ID to remove
   */
  remove(id: string): Promise<void>;
  
  /**
   * Find expiring credentials
   * @param bufferSeconds - Buffer time in seconds
   */
  findExpiring(bufferSeconds: number): Promise<ICredential[]>;
}

/**
 * Authentication Session Repository Interface
 * 
 * Data access for authentication sessions.
 */
export interface IAuthSessionRepository {
  /**
   * Find session by ID
   * @param id - Session identifier
   */
  findById(id: AuthSessionGuid): Promise<IAuthSession | null>;
  
  /**
   * Find sessions by user ID
   * @param userId - User identifier
   */
  findByUserId(userId: string): Promise<IAuthSession[]>;
  
  /**
   * Find active sessions
   */
  findAllActive(): Promise<IAuthSession[]>;
  
  /**
   * Save session
   * @param session - Session to save
   */
  save(session: IAuthSession): Promise<void>;
  
  /**
   * Remove session
   * @param id - Session ID to remove
   */
  remove(id: AuthSessionGuid): Promise<void>;
  
  /**
   * Find expired sessions
   */
  findExpired(): Promise<IAuthSession[]>;
  
  /**
   * Cleanup expired sessions
   */
  cleanupExpired(): Promise<number>;
}

// ============================================================================
// SPECIFICATION INTERFACES
// ============================================================================

/**
 * Valid Credential Specification Interface
 * 
 * Business rules for credential validation.
 */
export interface IValidCredentialSpecification extends Specification<ICredential> {
  /**
   * Get detailed validation errors
   * @param credential - Credential to validate
   */
  getValidationErrors(credential: ICredential): ValidationError[];
}

/**
 * Token Expiration Specification Interface
 * 
 * Business rules for token expiration.
 */
export interface ITokenExpirationSpecification extends Specification<Token> {
  /**
   * Check if token should be refreshed
   * @param token - Token to check
   * @param bufferSeconds - Buffer time in seconds
   */
  shouldRefresh(token: Token, bufferSeconds?: number): boolean;
}

/**
 * Session Validity Specification Interface
 * 
 * Business rules for session validity.
 */
export interface ISessionValiditySpecification extends Specification<IAuthSession> {
  /**
   * Get session validity details
   * @param session - Session to validate
   */
  getValidityDetails(session: IAuthSession): SessionValidityDetails;
}

/**
 * Authentication Retry Specification Interface
 * 
 * Business rules for authentication retry logic.
 */
export interface IAuthenticationRetrySpecification extends Specification<AuthenticationError> {
  /**
   * Check if authentication should be retried
   * @param error - Authentication error
   * @param retryContext - Retry context
   */
  shouldRetry(error: AuthenticationError, retryContext: RetryContext): boolean;
  
  /**
   * Get retry delay for the next attempt
   * @param attemptNumber - Current attempt number
   */
  getRetryDelay(attemptNumber: number): number;
}

// ============================================================================
// RESULT AND ERROR TYPES
// ============================================================================

/**
 * Authentication Result Interface
 * 
 * Result of an authentication operation.
 */
export interface AuthenticationResult extends Result<IAuthSession, AuthenticationError> {
  readonly sessionId?: AuthSessionGuid;
  readonly token?: Token;
  readonly expiresAt?: Date;
}

/**
 * Session Validation Result Interface
 * 
 * Result of session validation.
 */
export interface SessionValidationResult extends Result<boolean, SessionValidationError> {
  readonly isValid: boolean;
  readonly reason?: string;
  readonly requiresRefresh?: boolean;
  
  /**
   * Create valid result
   */
  static valid(): SessionValidationResult;
  
  /**
   * Create invalid result
   * @param reason - Reason for invalidity
   */
  static invalid(reason: string): SessionValidationResult;
  
  /**
   * Create expired result
   * @param reason - Reason for expiration
   */
  static expired(reason: string): SessionValidationResult;
}

/**
 * Session Validity Details Interface
 * 
 * Detailed information about session validity.
 */
export interface SessionValidityDetails {
  readonly isValid: boolean;
  readonly isExpired: boolean;
  readonly requiresRefresh: boolean;
  readonly validationErrors: ValidationError[];
  readonly expiresAt?: Date;
  readonly timeToExpiry?: number;
}

/**
 * Retry Decision Interface
 * 
 * Decision about whether to retry a failed operation.
 */
export interface RetryDecision {
  readonly shouldRetry: boolean;
  readonly delayMs: number;
  readonly reason: string;
  
  /**
   * Create retry decision
   * @param delayMs - Delay before retry in milliseconds
   */
  static retryAfter(delayMs: number): RetryDecision;
  
  /**
   * Create no-retry decision
   * @param reason - Reason for not retrying
   */
  static doNotRetry(reason: string): RetryDecision;
}

/**
 * Retry Context Interface
 * 
 * Context information for retry decisions.
 */
export interface RetryContext {
  readonly attemptNumber: number;
  readonly totalAttempts: number;
  readonly lastError: Error;
  readonly elapsedTime: number;
  readonly maxRetries: number;
}

/**
 * Validation Result Interface
 * 
 * Result of a validation operation.
 */
export interface ValidationResult extends Result<boolean, ValidationError[]> {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
  
  /**
   * Create valid result
   */
  static valid(): ValidationResult;
  
  /**
   * Create invalid result
   * @param errors - Validation errors
   */
  static invalid(errors: ValidationError[]): ValidationResult;
}

/**
 * Validation Error Interface
 * 
 * Represents a validation error.
 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly value?: any;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base Authentication Error
 */
export abstract class AuthenticationError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
  }
}

/**
 * Invalid Credentials Error
 */
export class InvalidCredentialsError extends AuthenticationError {
  constructor(message: string = 'Invalid credentials provided') {
    super(message, 'INVALID_CREDENTIALS');
  }
}

/**
 * Token Expired Error
 */
export class TokenExpiredError extends AuthenticationError {
  constructor(message: string = 'Authentication token has expired') {
    super(message, 'TOKEN_EXPIRED');
  }
}

/**
 * Auth Provider Not Found Error
 */
export class AuthProviderNotFoundError extends AuthenticationError {
  constructor(providerId: AuthProviderGuid) {
    super(`Authentication provider not found: ${providerId.value}`, 'PROVIDER_NOT_FOUND');
  }
}

/**
 * Auth Provider Inactive Error
 */
export class AuthProviderInactiveError extends AuthenticationError {
  constructor(providerId: AuthProviderGuid) {
    super(`Authentication provider is inactive: ${providerId.value}`, 'PROVIDER_INACTIVE');
  }
}

/**
 * Token Refresh Error
 */
export class TokenRefreshError extends AuthenticationError {
  constructor(message: string = 'Failed to refresh authentication token') {
    super(message, 'TOKEN_REFRESH_FAILED');
  }
}

/**
 * Session Expired Error
 */
export class SessionExpiredError extends AuthenticationError {
  constructor(sessionId: AuthSessionGuid) {
    super(`Authentication session has expired: ${sessionId.value}`, 'SESSION_EXPIRED');
  }
}

/**
 * Session Validation Error
 */
export class SessionValidationError extends AuthenticationError {
  constructor(message: string = 'Session validation failed') {
    super(message, 'SESSION_VALIDATION_FAILED');
  }
}

/**
 * Configuration Error
 */
export class ConfigurationError extends AuthenticationError {
  constructor(message: string = 'Authentication configuration error') {
    super(message, 'CONFIGURATION_ERROR');
  }
}

// ============================================================================
// DOMAIN EVENT INTERFACES
// ============================================================================

/**
 * Authentication Succeeded Event Interface
 */
export interface IAuthenticationSucceeded extends DomainEvent {
  readonly sessionId: AuthSessionGuid;
  readonly providerId: AuthProviderGuid;
  readonly timestamp: Date;
  readonly userId?: string;
}

/**
 * Authentication Failed Event Interface
 */
export interface IAuthenticationFailed extends DomainEvent {
  readonly providerId: AuthProviderGuid;
  readonly error: string;
  readonly timestamp: Date;
  readonly retryAttempt: number;
}

/**
 * Token Refreshed Event Interface
 */
export interface ITokenRefreshed extends DomainEvent {
  readonly sessionId: AuthSessionGuid;
  readonly oldTokenHash: string;
  readonly newTokenHash: string;
  readonly timestamp: Date;
}

/**
 * Session Expired Event Interface
 */
export interface ISessionExpired extends DomainEvent {
  readonly sessionId: AuthSessionGuid;
  readonly providerId: AuthProviderGuid;
  readonly expiredAt: Date;
  readonly timestamp: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Authentication Strategy Type
 * 
 * Union type for all supported authentication strategies.
 */
export type AuthenticationStrategy = 
  | BearerTokenStrategy
  | BasicAuthStrategy
  | ApiKeyStrategy
  | OAuth2Strategy
  | JwtStrategy
  | CustomAuthStrategy;

/**
 * Token Value Type
 * 
 * Union type for different token value formats.
 */
export type TokenValue = string;

/**
 * Credential Value Type
 * 
 * Union type for different credential value formats.
 */
export type CredentialValue = 
  | { token: string }
  | { username: string; password: string }
  | { apiKey: string }
  | { clientId: string; clientSecret: string }
  | Record<string, any>;

/**
 * Authentication Header Type
 * 
 * Type for authentication headers.
 */
export type AuthenticationHeader = {
  readonly name: string;
  readonly value: string;
  readonly sensitive: boolean;
};

// ============================================================================
// STRATEGY INTERFACES
// ============================================================================

/**
 * Authentication Strategy Interface
 * 
 * Base interface for all authentication strategies.
 */
export interface IAuthenticationStrategy {
  readonly type: AuthType;
  
  /**
   * Authenticate a request
   * @param request - Authentication request
   * @param config - Authentication configuration
   */
  authenticate(request: AuthenticationRequest, config: AuthConfig): Promise<AuthenticatedRequest>;
  
  /**
   * Validate configuration for this strategy
   * @param config - Configuration to validate
   */
  validateConfig(config: AuthConfig): ValidationResult;
  
  /**
   * Check if strategy supports token refresh
   */
  supportsRefresh(): boolean;
  
  /**
   * Refresh token if supported
   * @param refreshToken - Refresh token
   * @param config - Authentication configuration
   */
  refreshToken?(refreshToken: string, config: AuthConfig): Promise<Token>;
}

/**
 * Bearer Token Strategy Interface
 */
export interface BearerTokenStrategy extends IAuthenticationStrategy {
  readonly type: AuthType.BEARER;
}

/**
 * Basic Auth Strategy Interface
 */
export interface BasicAuthStrategy extends IAuthenticationStrategy {
  readonly type: AuthType.BASIC;
}

/**
 * API Key Strategy Interface
 */
export interface ApiKeyStrategy extends IAuthenticationStrategy {
  readonly type: AuthType.API_KEY;
}

/**
 * OAuth2 Strategy Interface
 */
export interface OAuth2Strategy extends IAuthenticationStrategy {
  readonly type: AuthType.OAUTH2;
}

/**
 * JWT Strategy Interface
 */
export interface JwtStrategy extends IAuthenticationStrategy {
  readonly type: AuthType.JWT;
}

/**
 * Custom Auth Strategy Interface
 */
export interface CustomAuthStrategy extends IAuthenticationStrategy {
  readonly type: AuthType.CUSTOM;
  readonly name: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for authentication provider
 */
export function isAuthProvider(obj: any): obj is IAuthProvider {
  return obj && 
    typeof obj.authenticate === 'function' &&
    typeof obj.type === 'string' &&
    obj.config !== undefined;
}

/**
 * Type guard for credential
 */
export function isCredential(obj: any): obj is ICredential {
  return obj &&
    typeof obj.type === 'string' &&
    typeof obj.value === 'string' &&
    typeof obj.isExpired === 'function';
}

/**
 * Type guard for authentication session
 */
export function isAuthSession(obj: any): obj is IAuthSession {
  return obj &&
    typeof obj.isValid === 'function' &&
    typeof obj.refresh === 'function' &&
    obj.provider !== undefined &&
    obj.credential !== undefined;
}

/**
 * Type guard for token
 */
export function isToken(obj: any): obj is Token {
  return obj &&
    typeof obj.value === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.isExpired === 'function';
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * OAuth2 Configuration
 */
export interface OAuth2Config {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly tokenEndpoint: string;
  readonly scope?: string[];
  readonly grantType: 'client_credentials' | 'authorization_code' | 'refresh_token';
  readonly additionalParams?: Record<string, string>;
}

/**
 * Basic Auth Configuration
 */
export interface BasicAuthConfig {
  readonly username: string;
  readonly password: string;
  readonly realm?: string;
}

/**
 * API Key Configuration
 */
export interface ApiKeyConfig {
  readonly key: string;
  readonly location: 'header' | 'query' | 'cookie';
  readonly name: string;
}

/**
 * Bearer Token Configuration
 */
export interface BearerTokenConfig {
  readonly token: string;
  readonly prefix?: string; // Default: 'Bearer'
}

/**
 * JWT Configuration
 */
export interface JwtConfig {
  readonly token: string;
  readonly algorithm?: string;
  readonly secret?: string;
  readonly issuer?: string;
  readonly audience?: string;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  // Core types
  AuthType,
  TokenType,
  CredentialType,
  AuthenticationStatus,
  
  // Value objects
  AuthProviderGuid,
  AuthSessionGuid,
  TokenProps,
  TokenScope,
  TokenMetadata,
  ExpirationTime,
  AuthConfig,
  RetryConfig,
  
  // Entities
  IAuthProvider,
  ICredential,
  IAuthSession,
  
  // Services
  IAuthenticationService,
  ITokenRefreshService,
  IAuthProviderFactory,
  ICredentialValidationService,
  
  // Repositories
  IAuthProviderRepository,
  ICredentialRepository,
  IAuthSessionRepository,
  
  // Specifications
  IValidCredentialSpecification,
  ITokenExpirationSpecification,
  ISessionValiditySpecification,
  IAuthenticationRetrySpecification,
  
  // Results and errors
  AuthenticationResult,
  SessionValidationResult,
  SessionValidityDetails,
  RetryDecision,
  RetryContext,
  ValidationResult,
  ValidationError,
  
  // Events
  IAuthenticationSucceeded,
  IAuthenticationFailed,
  ITokenRefreshed,
  ISessionExpired,
  
  // Strategies
  IAuthenticationStrategy,
  BearerTokenStrategy,
  BasicAuthStrategy,
  ApiKeyStrategy,
  OAuth2Strategy,
  JwtStrategy,
  CustomAuthStrategy,
  
  // Configuration
  OAuth2Config,
  BasicAuthConfig,
  ApiKeyConfig,
  BearerTokenConfig,
  JwtConfig
};