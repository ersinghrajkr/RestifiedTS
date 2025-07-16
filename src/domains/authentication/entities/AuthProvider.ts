/**
 * Authentication Provider Entity
 * 
 * Represents a configured authentication provider that can authenticate requests using
 * a specific authentication method. This entity encapsulates the business logic and
 * state management for authentication providers.
 * 
 * Follows Domain-Driven Design principles and SOLID principles:
 * - Single Responsibility: Manages authentication provider lifecycle and operations
 * - Open/Closed: Extensible through strategy pattern for different auth types
 * - Liskov Substitution: Implements IAuthProvider interface consistently
 * - Interface Segregation: Focused interface with specific responsibilities
 * - Dependency Inversion: Depends on abstractions for strategies and repositories
 * 
 * @author Raj Kumar
 * @version 1.0.0
 * @since 1.0.0
 */

import { Entity } from '../../../shared/domain/Entity';
import { DomainEvent } from '../../../shared/domain/DomainEvent';
import { ILogger } from '../../../shared/infrastructure/Logger';
import { 
  IAuthProvider,
  AuthProviderGuid,
  AuthType,
  AuthConfig,
  AuthProviderStatistics,
  AuthenticationRequest,
  AuthenticatedRequest,
  IAuthenticationStrategy,
  ValidationResult,
  AuthProviderInactiveError,
  InvalidAuthProviderError
} from '../types/Authentication-Architecture.types';
import { ValidAuthProviderSpecification } from '../specifications/ValidAuthProviderSpecification';
import { AuthenticationStrategyFactory } from '../services/AuthenticationStrategyFactory';

/**
 * Authentication Provider Entity
 * 
 * Core entity that represents an authentication provider in the domain.
 * Manages authentication operations, configuration, and lifecycle.
 * 
 * @example
 * ```typescript
 * // Create OAuth2 provider
 * const provider = new AuthProvider(
 *   AuthProviderGuid.generate(),
 *   AuthType.OAUTH2,
 *   new AuthConfig({
 *     clientId: 'client-123',
 *     clientSecret: 'secret-456',
 *     tokenEndpoint: 'https://auth.example.com/token',
 *     scope: ['read', 'write']
 *   }),
 *   logger
 * );
 * 
 * // Authenticate a request
 * const authenticatedRequest = await provider.authenticate(request);
 * ```
 */
export class AuthProvider extends Entity<AuthProviderGuid> implements IAuthProvider {
  // ========================================================================
  // PRIVATE FIELDS
  // ========================================================================
  
  /**
   * Authentication type supported by this provider
   */
  private readonly _type: AuthType;
  
  /**
   * Configuration specific to this authentication provider
   */
  private readonly _config: AuthConfig;
  
  /**
   * Current active status of the provider
   */
  private _isActive: boolean;
  
  /**
   * Timestamp of last successful authentication
   */
  private _lastUsed?: Date;
  
  /**
   * Statistical information about provider usage
   */
  private _statistics: AuthProviderStatistics;
  
  /**
   * Logger instance for this provider
   */
  private readonly _logger: ILogger;
  
  /**
   * Authentication strategy for this provider type
   */
  private readonly _strategy: IAuthenticationStrategy;

  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================
  
  /**
   * Creates a new AuthProvider instance
   * 
   * @param id - Unique identifier for this provider
   * @param type - Type of authentication this provider handles
   * @param config - Configuration specific to this authentication type
   * @param logger - Logger instance for audit and debugging
   * 
   * @throws {InvalidAuthProviderError} When provider configuration is invalid
   * 
   * @example
   * ```typescript
   * const provider = new AuthProvider(
   *   AuthProviderGuid.generate(),
   *   AuthType.BEARER,
   *   new AuthConfig({ token: 'bearer-token-123' }),
   *   logger
   * );
   * ```
   */
  constructor(
    id: AuthProviderGuid,
    type: AuthType,
    config: AuthConfig,
    logger: ILogger
  ) {
    super(id);
    
    this._type = type;
    this._config = config;
    this._isActive = true;
    this._statistics = new AuthProviderStatistics();
    this._logger = logger.createChild({ 
      component: 'AuthProvider',
      providerId: id.value,
      type: type 
    });
    
    // Create appropriate strategy for this auth type
    this._strategy = AuthenticationStrategyFactory.create(type);
    
    // Validate provider configuration on creation
    this.validateConfiguration();
    
    this._logger.debug('AuthProvider created successfully', {
      id: id.value,
      type: type,
      isActive: this._isActive
    });
  }

  // ========================================================================
  // PUBLIC PROPERTIES (GETTERS)
  // ========================================================================
  
  /**
   * Gets the authentication type supported by this provider
   * 
   * @returns The authentication type
   */
  public get type(): AuthType {
    return this._type;
  }
  
  /**
   * Gets the configuration for this authentication provider
   * 
   * @returns The authentication configuration
   */
  public get config(): AuthConfig {
    return this._config;
  }
  
  /**
   * Gets the current active status of the provider
   * 
   * @returns True if provider is active, false otherwise
   */
  public get isActive(): boolean {
    return this._isActive;
  }
  
  /**
   * Gets the timestamp of last successful authentication
   * 
   * @returns Date of last use, or undefined if never used
   */
  public get lastUsed(): Date | undefined {
    return this._lastUsed;
  }
  
  /**
   * Gets the usage statistics for this provider
   * 
   * @returns Statistical information about provider usage
   */
  public get statistics(): AuthProviderStatistics {
    return this._statistics;
  }

  // ========================================================================
  // PUBLIC METHODS
  // ========================================================================
  
  /**
   * Authenticates a request using this provider's authentication method
   * 
   * Performs the authentication operation using the configured strategy,
   * updates usage statistics, and handles any authentication errors.
   * 
   * @param request - The authentication request to process
   * @returns Promise resolving to the authenticated request
   * 
   * @throws {AuthProviderInactiveError} When provider is inactive
   * @throws {AuthenticationError} When authentication fails
   * 
   * @example
   * ```typescript
   * const request = new AuthenticationRequest(credential);
   * const authenticatedRequest = await provider.authenticate(request);
   * console.log('Authentication headers:', authenticatedRequest.headers);
   * ```
   */
  public async authenticate(request: AuthenticationRequest): Promise<AuthenticatedRequest> {
    const startTime = Date.now();
    
    try {
      // Check if provider is active
      this.ensureProviderIsActive();
      
      this._logger.debug('Starting authentication', {
        requestId: request.metadata?.requestId,
        credentialType: request.credential.type
      });
      
      // Delegate to authentication strategy
      const authenticatedRequest = await this._strategy.authenticate(request, this._config);
      
      // Update success statistics
      const responseTime = Date.now() - startTime;
      this.recordSuccessfulAuthentication(responseTime);
      
      this._logger.info('Authentication successful', {
        requestId: request.metadata?.requestId,
        responseTime: responseTime,
        successRate: this._statistics.getSuccessRate()
      });
      
      return authenticatedRequest;
      
    } catch (error) {
      // Update failure statistics
      const responseTime = Date.now() - startTime;
      this.recordFailedAuthentication(responseTime, error);
      
      this._logger.error('Authentication failed', {
        requestId: request.metadata?.requestId,
        error: error.message,
        responseTime: responseTime,
        successRate: this._statistics.getSuccessRate()
      });
      
      // Re-throw the error for caller handling
      throw error;
    }
  }
  
  /**
   * Activates the authentication provider
   * 
   * Enables the provider for use in authentication operations.
   * Emits a domain event to notify other parts of the system.
   * 
   * @example
   * ```typescript
   * provider.activate();
   * console.log('Provider is now active:', provider.isActive);
   * ```
   */
  public activate(): void {
    if (this._isActive) {
      this._logger.debug('Provider is already active');
      return;
    }
    
    this._isActive = true;
    
    this._logger.info('AuthProvider activated', {
      providerId: this.id.value,
      type: this._type
    });
    
    // Emit domain event for activation
    this.addDomainEvent(new AuthProviderActivated(
      this.id,
      this._type,
      new Date()
    ));
  }
  
  /**
   * Deactivates the authentication provider
   * 
   * Disables the provider from being used in authentication operations.
   * Emits a domain event to notify other parts of the system.
   * 
   * @param reason - Optional reason for deactivation
   * 
   * @example
   * ```typescript
   * provider.deactivate('Temporary maintenance');
   * console.log('Provider is now inactive:', !provider.isActive);
   * ```
   */
  public deactivate(reason?: string): void {
    if (!this._isActive) {
      this._logger.debug('Provider is already inactive');
      return;
    }
    
    this._isActive = false;
    
    this._logger.info('AuthProvider deactivated', {
      providerId: this.id.value,
      type: this._type,
      reason: reason
    });
    
    // Emit domain event for deactivation
    this.addDomainEvent(new AuthProviderDeactivated(
      this.id,
      this._type,
      new Date(),
      reason
    ));
  }
  
  /**
   * Gets detailed usage statistics for this provider
   * 
   * @returns Complete statistical information about provider usage
   * 
   * @example
   * ```typescript
   * const stats = provider.getStatistics();
   * console.log(`Success rate: ${stats.getSuccessRate()}%`);
   * console.log(`Total attempts: ${stats.totalAttempts}`);
   * ```
   */
  public getStatistics(): AuthProviderStatistics {
    return this._statistics.clone();
  }
  
  /**
   * Resets usage statistics for this provider
   * 
   * Clears all accumulated statistics while preserving configuration.
   * Useful for periodic statistics reset or testing scenarios.
   * 
   * @example
   * ```typescript
   * provider.resetStatistics();
   * console.log('Statistics reset, total attempts:', provider.statistics.totalAttempts);
   * ```
   */
  public resetStatistics(): void {
    this._statistics.reset();
    
    this._logger.info('Provider statistics reset', {
      providerId: this.id.value,
      type: this._type
    });
    
    // Emit domain event for statistics reset
    this.addDomainEvent(new AuthProviderStatisticsReset(
      this.id,
      new Date()
    ));
  }
  
  /**
   * Validates the current provider configuration
   * 
   * @returns Validation result indicating success or specific errors
   * 
   * @example
   * ```typescript
   * const validation = provider.validateConfiguration();
   * if (!validation.isValid) {
   *   console.log('Configuration errors:', validation.errors);
   * }
   * ```
   */
  public validateConfiguration(): ValidationResult {
    try {
      const specification = new ValidAuthProviderSpecification();
      
      if (!specification.isSatisfiedBy(this)) {
        const errors = specification.getValidationErrors(this);
        this._logger.warn('Provider configuration validation failed', {
          providerId: this.id.value,
          errors: errors.map(e => e.message)
        });
        return ValidationResult.invalid(errors);
      }
      
      // Also validate the auth configuration itself
      const configValidation = this._config.validate();
      if (!configValidation.isValid) {
        this._logger.warn('Auth configuration validation failed', {
          providerId: this.id.value,
          errors: configValidation.errors.map(e => e.message)
        });
        return configValidation;
      }
      
      this._logger.debug('Provider configuration validation successful');
      return ValidationResult.valid();
      
    } catch (error) {
      this._logger.error('Provider configuration validation error', {
        providerId: this.id.value,
        error: error.message
      });
      
      throw new InvalidAuthProviderError(
        `Provider configuration validation failed: ${error.message}`
      );
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================
  
  /**
   * Ensures the provider is active before performing operations
   * 
   * @throws {AuthProviderInactiveError} When provider is inactive
   */
  private ensureProviderIsActive(): void {
    if (!this._isActive) {
      throw new AuthProviderInactiveError(this.id);
    }
  }
  
  /**
   * Records a successful authentication attempt
   * 
   * Updates internal statistics and last used timestamp.
   * 
   * @param responseTime - Time taken for authentication in milliseconds
   */
  private recordSuccessfulAuthentication(responseTime: number): void {
    this._statistics.recordAttempt(true, responseTime);
    this._lastUsed = new Date();
    
    // Emit domain event for successful authentication
    this.addDomainEvent(new AuthProviderUsed(
      this.id,
      this._type,
      true,
      responseTime,
      new Date()
    ));
  }
  
  /**
   * Records a failed authentication attempt
   * 
   * Updates internal statistics with failure information.
   * 
   * @param responseTime - Time taken before failure in milliseconds
   * @param error - The error that caused the failure
   */
  private recordFailedAuthentication(responseTime: number, error: Error): void {
    this._statistics.recordAttempt(false, responseTime);
    
    // Emit domain event for failed authentication
    this.addDomainEvent(new AuthProviderUsed(
      this.id,
      this._type,
      false,
      responseTime,
      new Date(),
      error.message
    ));
  }
  
  /**
   * Validates configuration during construction
   * 
   * @throws {InvalidAuthProviderError} When configuration is invalid
   */
  private validateConfigurationOnCreation(): void {
    const validation = this.validateConfiguration();
    
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      throw new InvalidAuthProviderError(
        `Invalid provider configuration: ${errorMessages}`
      );
    }
  }

  // ========================================================================
  // EQUALITY AND COMPARISON
  // ========================================================================
  
  /**
   * Determines equality with another AuthProvider
   * 
   * Two providers are considered equal if they have the same ID.
   * 
   * @param other - Another AuthProvider to compare with
   * @returns True if providers are equal, false otherwise
   * 
   * @example
   * ```typescript
   * const isEqual = provider1.equals(provider2);
   * console.log('Providers are equal:', isEqual);
   * ```
   */
  public equals(other: AuthProvider): boolean {
    if (!other || !(other instanceof AuthProvider)) {
      return false;
    }
    
    return this.id.equals(other.id);
  }
  
  /**
   * Generates hash code for this provider
   * 
   * @returns Hash code based on provider ID
   */
  public hashCode(): number {
    return this.id.hashCode();
  }

  // ========================================================================
  // SERIALIZATION
  // ========================================================================
  
  /**
   * Converts the provider to a JSON representation
   * 
   * Excludes sensitive configuration data for security.
   * 
   * @returns JSON object representing the provider
   * 
   * @example
   * ```typescript
   * const json = provider.toJson();
   * console.log('Provider as JSON:', JSON.stringify(json, null, 2));
   * ```
   */
  public toJson(): Record<string, any> {
    return {
      id: this.id.value,
      type: this._type,
      isActive: this._isActive,
      lastUsed: this._lastUsed?.toISOString(),
      statistics: this._statistics.toJson(),
      config: this._config.sanitizeForLogging()
    };
  }
  
  /**
   * Creates a string representation of the provider
   * 
   * @returns String representation including key properties
   * 
   * @example
   * ```typescript
   * console.log(provider.toString());
   * // Output: "AuthProvider(id=123e4567-e89b-12d3-a456-426614174000, type=OAUTH2, active=true)"
   * ```
   */
  public toString(): string {
    return `AuthProvider(id=${this.id.value}, type=${this._type}, active=${this._isActive})`;
  }
}

// ============================================================================
// DOMAIN EVENTS
// ============================================================================

/**
 * Domain event emitted when an authentication provider is activated
 */
export class AuthProviderActivated extends DomainEvent {
  constructor(
    public readonly providerId: AuthProviderGuid,
    public readonly providerType: AuthType,
    public readonly activatedAt: Date
  ) {
    super('AuthProviderActivated', activatedAt);
  }
}

/**
 * Domain event emitted when an authentication provider is deactivated
 */
export class AuthProviderDeactivated extends DomainEvent {
  constructor(
    public readonly providerId: AuthProviderGuid,
    public readonly providerType: AuthType,
    public readonly deactivatedAt: Date,
    public readonly reason?: string
  ) {
    super('AuthProviderDeactivated', deactivatedAt);
  }
}

/**
 * Domain event emitted when an authentication provider is used
 */
export class AuthProviderUsed extends DomainEvent {
  constructor(
    public readonly providerId: AuthProviderGuid,
    public readonly providerType: AuthType,
    public readonly wasSuccessful: boolean,
    public readonly responseTime: number,
    public readonly usedAt: Date,
    public readonly errorMessage?: string
  ) {
    super('AuthProviderUsed', usedAt);
  }
}

/**
 * Domain event emitted when provider statistics are reset
 */
export class AuthProviderStatisticsReset extends DomainEvent {
  constructor(
    public readonly providerId: AuthProviderGuid,
    public readonly resetAt: Date
  ) {
    super('AuthProviderStatisticsReset', resetAt);
  }
}