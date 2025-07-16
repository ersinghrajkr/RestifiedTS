# Authentication Domain - Architecture Design

## Architectural Overview

The Authentication domain follows Domain-Driven Design principles with clean separation between business logic, application orchestration, and infrastructure concerns. The architecture emphasizes security, extensibility, and maintainability while providing a simple, fluent API for test authors.

## Domain Architecture

### Domain Layer Structure

```
authentication/
├── entities/                    # Core business entities
│   ├── AuthProvider.ts         # Authentication provider entity
│   ├── Credential.ts           # Credential entity  
│   └── AuthSession.ts          # Authentication session entity
├── value-objects/              # Immutable value objects
│   ├── AuthType.ts            # Authentication type enumeration
│   ├── Token.ts               # Token value object
│   ├── AuthConfig.ts          # Configuration value object
│   └── ExpirationTime.ts      # Expiration time value object
├── services/                   # Domain services
│   ├── AuthenticationService.ts        # Core authentication logic
│   ├── TokenRefreshService.ts          # Token refresh management
│   ├── AuthProviderFactory.ts         # Provider creation
│   └── CredentialValidationService.ts  # Credential validation
├── repositories/               # Data access abstractions
│   ├── IAuthProviderRepository.ts      # Provider repository interface
│   ├── ICredentialRepository.ts        # Credential repository interface
│   └── IAuthSessionRepository.ts       # Session repository interface
├── specifications/            # Business rules as objects
│   ├── ValidCredentialSpecification.ts     # Credential validation rules
│   └── TokenExpirationSpecification.ts     # Token expiration rules
├── domain-events/             # Domain events
│   ├── AuthenticationSucceeded.ts      # Success event
│   ├── AuthenticationFailed.ts         # Failure event
│   ├── TokenRefreshed.ts              # Token refresh event
│   └── SessionExpired.ts              # Session expiration event
└── types/                     # TypeScript interfaces
    └── Authentication-Architecture.types.ts
```

## Core Domain Patterns

### 1. Entity Pattern

#### AuthProvider Entity
```typescript
/**
 * Authentication Provider Entity
 * 
 * Represents a configured authentication provider that can authenticate
 * requests using a specific authentication method.
 * 
 * @example
 * ```typescript
 * const provider = new AuthProvider(
 *   AuthProviderGuid.generate(),
 *   AuthType.OAUTH2,
 *   new AuthConfig({
 *     clientId: 'client-123',
 *     clientSecret: 'secret-456',
 *     tokenEndpoint: 'https://auth.example.com/token'
 *   })
 * );
 * ```
 */
export class AuthProvider extends Entity<AuthProviderGuid> {
  private readonly _type: AuthType;
  private readonly _config: AuthConfig;
  private _isActive: boolean;
  private _lastUsed?: Date;
  private _statistics: AuthProviderStatistics;

  constructor(
    id: AuthProviderGuid,
    type: AuthType,
    config: AuthConfig
  ) {
    super(id);
    this._type = type;
    this._config = config;
    this._isActive = true;
    this._statistics = new AuthProviderStatistics();
    this.validate();
  }

  /**
   * Authenticate a request using this provider
   * @param request - The request to authenticate
   * @returns Promise resolving to authenticated request
   */
  public async authenticate(request: AuthenticationRequest): Promise<AuthenticatedRequest> {
    if (!this._isActive) {
      throw new AuthProviderInactiveError(this.id);
    }

    const strategy = AuthenticationStrategyFactory.create(this._type);
    const result = await strategy.authenticate(request, this._config);
    
    this.updateStatistics(result.isSuccess);
    this._lastUsed = new Date();
    
    return result.authenticatedRequest;
  }

  /**
   * Validate provider configuration
   */
  private validate(): void {
    const specification = new ValidAuthProviderSpecification();
    if (!specification.isSatisfiedBy(this)) {
      throw new InvalidAuthProviderError('Provider configuration is invalid');
    }
  }

  /**
   * Update provider usage statistics
   */
  private updateStatistics(isSuccess: boolean): void {
    this._statistics.recordAttempt(isSuccess);
  }

  // Getters
  public get type(): AuthType { return this._type; }
  public get config(): AuthConfig { return this._config; }
  public get isActive(): boolean { return this._isActive; }
  public get lastUsed(): Date | undefined { return this._lastUsed; }
  public get statistics(): AuthProviderStatistics { return this._statistics; }

  // State management
  public activate(): void { this._isActive = true; }
  public deactivate(): void { this._isActive = false; }
}
```

### 2. Value Object Pattern

#### Token Value Object
```typescript
/**
 * Token Value Object
 * 
 * Represents an authentication token with its metadata and validation logic.
 * Immutable and contains all token-related business logic.
 */
export class Token extends ValueObject {
  private readonly _value: string;
  private readonly _type: TokenType;
  private readonly _expiresAt?: ExpirationTime;
  private readonly _scope?: TokenScope;
  private readonly _metadata: TokenMetadata;

  constructor(props: TokenProps) {
    super();
    this._value = props.value;
    this._type = props.type;
    this._expiresAt = props.expiresAt;
    this._scope = props.scope;
    this._metadata = props.metadata || new TokenMetadata();
    this.validate();
  }

  /**
   * Check if token is expired
   * @returns true if token is expired
   */
  public isExpired(): boolean {
    if (!this._expiresAt) {
      return false; // Non-expiring token
    }
    return this._expiresAt.isExpired();
  }

  /**
   * Check if token is expiring soon (within buffer time)
   * @param bufferSeconds - Buffer time in seconds
   * @returns true if token expires within buffer time
   */
  public isExpiringSoon(bufferSeconds: number = 300): boolean {
    if (!this._expiresAt) {
      return false;
    }
    return this._expiresAt.isExpiringSoon(bufferSeconds);
  }

  /**
   * Get time until token expiration
   * @returns seconds until expiration, or null if non-expiring
   */
  public timeToExpiry(): number | null {
    if (!this._expiresAt) {
      return null;
    }
    return this._expiresAt.timeToExpiry();
  }

  /**
   * Create sanitized version for logging
   * @returns sanitized token for safe logging
   */
  public sanitizeForLogging(): string {
    const visibleChars = 4;
    const totalLength = this._value.length;
    
    if (totalLength <= visibleChars * 2) {
      return '*'.repeat(totalLength);
    }
    
    const start = this._value.substring(0, visibleChars);
    const end = this._value.substring(totalLength - visibleChars);
    const masked = '*'.repeat(totalLength - (visibleChars * 2));
    
    return `${start}${masked}${end}`;
  }

  /**
   * Validate token format and content
   */
  private validate(): void {
    if (!this._value || this._value.trim().length === 0) {
      throw new InvalidTokenError('Token value cannot be empty');
    }

    const specification = new ValidTokenSpecification();
    if (!specification.isSatisfiedBy(this)) {
      throw new InvalidTokenError('Token format is invalid');
    }
  }

  // Getters
  public get value(): string { return this._value; }
  public get type(): TokenType { return this._type; }
  public get expiresAt(): ExpirationTime | undefined { return this._expiresAt; }
  public get scope(): TokenScope | undefined { return this._scope; }
  public get metadata(): TokenMetadata { return this._metadata; }

  // Value object equality
  protected equalityComponents(): Array<any> {
    return [this._value, this._type, this._expiresAt, this._scope];
  }
}
```

### 3. Domain Service Pattern

#### AuthenticationService
```typescript
/**
 * Authentication Domain Service
 * 
 * Orchestrates authentication flows and manages authentication state.
 * Contains business logic that doesn't naturally belong to a single entity.
 */
@Injectable()
export class AuthenticationService implements IAuthenticationService {
  constructor(
    private readonly providerRepository: IAuthProviderRepository,
    private readonly sessionRepository: IAuthSessionRepository,
    private readonly credentialRepository: ICredentialRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly logger: ILogger
  ) {}

  /**
   * Authenticate using the specified provider
   * 
   * @param providerId - Authentication provider identifier
   * @param credentials - Authentication credentials
   * @returns Promise resolving to authentication session
   */
  public async authenticate(
    providerId: AuthProviderGuid,
    credentials: Credential
  ): Promise<AuthSession> {
    try {
      this.logger.debug('Starting authentication', { providerId: providerId.value });
      
      // Get and validate provider
      const provider = await this.providerRepository.findById(providerId);
      if (!provider) {
        throw new AuthProviderNotFoundError(providerId);
      }

      if (!provider.isActive) {
        throw new AuthProviderInactiveError(providerId);
      }

      // Validate credentials
      const credentialSpec = new ValidCredentialSpecification();
      if (!credentialSpec.isSatisfiedBy(credentials)) {
        throw new InvalidCredentialsError('Provided credentials are invalid');
      }

      // Perform authentication
      const request = new AuthenticationRequest(credentials);
      const authenticatedRequest = await provider.authenticate(request);
      
      // Create authentication session
      const session = await this.createSession(provider, authenticatedRequest);
      
      // Store session
      await this.sessionRepository.save(session);
      
      // Emit success event
      await this.eventBus.publish(new AuthenticationSucceeded(
        session.id,
        providerId,
        new Date(),
        credentials.userId
      ));

      this.logger.info('Authentication successful', { 
        sessionId: session.id.value,
        providerId: providerId.value 
      });

      return session;

    } catch (error) {
      // Emit failure event
      await this.eventBus.publish(new AuthenticationFailed(
        providerId,
        error.message,
        new Date(),
        0 // TODO: Track retry attempts
      ));

      this.logger.error('Authentication failed', { 
        providerId: providerId.value,
        error: error.message 
      });

      throw error;
    }
  }

  /**
   * Validate an existing authentication session
   * 
   * @param sessionId - Session identifier
   * @returns Promise resolving to session validity
   */
  public async validateSession(sessionId: AuthSessionGuid): Promise<SessionValidationResult> {
    const session = await this.sessionRepository.findById(sessionId);
    
    if (!session) {
      return SessionValidationResult.invalid('Session not found');
    }

    const validationSpec = new SessionValiditySpecification();
    if (!validationSpec.isSatisfiedBy(session)) {
      return SessionValidationResult.invalid('Session is no longer valid');
    }

    // Check token expiration
    if (session.credential.isExpired()) {
      await this.handleExpiredSession(session);
      return SessionValidationResult.expired('Session token has expired');
    }

    // Check if token is expiring soon
    if (session.credential.isExpiringSoon()) {
      // Trigger token refresh in background
      this.scheduleTokenRefresh(session);
    }

    return SessionValidationResult.valid();
  }

  /**
   * Handle authentication failure with retry logic
   * 
   * @param error - Authentication error
   * @param retryContext - Retry context information
   * @returns Promise resolving to retry decision
   */
  public async handleAuthFailure(
    error: AuthenticationError,
    retryContext: RetryContext
  ): Promise<RetryDecision> {
    const retrySpec = new AuthenticationRetrySpecification();
    
    if (!retrySpec.shouldRetry(error, retryContext)) {
      return RetryDecision.doNotRetry('Maximum retries exceeded or non-retryable error');
    }

    const delay = this.calculateRetryDelay(retryContext.attemptNumber);
    return RetryDecision.retryAfter(delay);
  }

  /**
   * Create a new authentication session
   */
  private async createSession(
    provider: AuthProvider,
    authenticatedRequest: AuthenticatedRequest
  ): Promise<AuthSession> {
    const sessionId = AuthSessionGuid.generate();
    const credential = authenticatedRequest.credential;
    
    return new AuthSession(
      sessionId,
      provider,
      credential,
      new Date()
    );
  }

  /**
   * Handle expired authentication session
   */
  private async handleExpiredSession(session: AuthSession): Promise<void> {
    await this.sessionRepository.remove(session.id);
    
    await this.eventBus.publish(new SessionExpired(
      session.id,
      session.provider.id,
      new Date(),
      new Date()
    ));
  }

  /**
   * Schedule token refresh for expiring session
   */
  private scheduleTokenRefresh(session: AuthSession): void {
    // Implementation would schedule background refresh
    // This could be done via event bus or background service
  }

  /**
   * Calculate retry delay using exponential backoff
   */
  private calculateRetryDelay(attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = baseDelay * Math.pow(2, attemptNumber - 1);
    return Math.min(delay, maxDelay);
  }
}
```

### 4. Repository Pattern

#### IAuthProviderRepository Interface
```typescript
/**
 * Authentication Provider Repository Interface
 * 
 * Defines the contract for persisting and retrieving authentication providers.
 * Implementation details are left to the infrastructure layer.
 */
export interface IAuthProviderRepository extends IRepository<AuthProvider, AuthProviderGuid> {
  /**
   * Find provider by ID
   * @param id - Provider identifier
   * @returns Promise resolving to provider or null
   */
  findById(id: AuthProviderGuid): Promise<AuthProvider | null>;

  /**
   * Find provider by type and name
   * @param type - Authentication type
   * @param name - Provider name
   * @returns Promise resolving to provider or null
   */
  findByTypeAndName(type: AuthType, name: string): Promise<AuthProvider | null>;

  /**
   * Find all active providers
   * @returns Promise resolving to array of active providers
   */
  findAllActive(): Promise<AuthProvider[]>;

  /**
   * Find providers by type
   * @param type - Authentication type
   * @returns Promise resolving to array of providers
   */
  findByType(type: AuthType): Promise<AuthProvider[]>;

  /**
   * Save provider
   * @param provider - Provider to save
   * @returns Promise resolving when save completes
   */
  save(provider: AuthProvider): Promise<void>;

  /**
   * Remove provider
   * @param id - Provider ID to remove
   * @returns Promise resolving when removal completes
   */
  remove(id: AuthProviderGuid): Promise<void>;

  /**
   * Check if provider exists
   * @param id - Provider ID to check
   * @returns Promise resolving to existence boolean
   */
  exists(id: AuthProviderGuid): Promise<boolean>;
}
```

### 5. Specification Pattern

#### ValidCredentialSpecification
```typescript
/**
 * Valid Credential Specification
 * 
 * Encapsulates business rules for credential validation.
 * Implements the Specification pattern for reusable business logic.
 */
export class ValidCredentialSpecification implements ISpecification<Credential> {
  /**
   * Check if credential satisfies validation rules
   * 
   * @param credential - Credential to validate
   * @returns true if credential is valid
   */
  public isSatisfiedBy(credential: Credential): boolean {
    return this.hasRequiredFields(credential) &&
           this.hasValidFormat(credential) &&
           this.meetsSecurityRequirements(credential) &&
           this.isNotExpired(credential);
  }

  /**
   * Get detailed validation errors
   * 
   * @param credential - Credential to validate
   * @returns Array of validation errors
   */
  public getValidationErrors(credential: Credential): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!this.hasRequiredFields(credential)) {
      errors.push(new ValidationError('MISSING_REQUIRED_FIELDS', 'Credential is missing required fields'));
    }

    if (!this.hasValidFormat(credential)) {
      errors.push(new ValidationError('INVALID_FORMAT', 'Credential format is invalid'));
    }

    if (!this.meetsSecurityRequirements(credential)) {
      errors.push(new ValidationError('SECURITY_REQUIREMENTS', 'Credential does not meet security requirements'));
    }

    if (!this.isNotExpired(credential)) {
      errors.push(new ValidationError('EXPIRED', 'Credential has expired'));
    }

    return errors;
  }

  /**
   * Check if credential has all required fields
   */
  private hasRequiredFields(credential: Credential): boolean {
    switch (credential.type) {
      case CredentialType.BEARER_TOKEN:
        return !!credential.token;
      
      case CredentialType.BASIC_AUTH:
        return !!credential.username && !!credential.password;
      
      case CredentialType.API_KEY:
        return !!credential.apiKey;
      
      case CredentialType.OAUTH2:
        return !!credential.clientId && !!credential.clientSecret;
      
      default:
        return false;
    }
  }

  /**
   * Check if credential has valid format
   */
  private hasValidFormat(credential: Credential): boolean {
    switch (credential.type) {
      case CredentialType.BEARER_TOKEN:
        return this.isValidTokenFormat(credential.token!);
      
      case CredentialType.BASIC_AUTH:
        return this.isValidUsernameFormat(credential.username!) &&
               this.isValidPasswordFormat(credential.password!);
      
      case CredentialType.API_KEY:
        return this.isValidApiKeyFormat(credential.apiKey!);
      
      default:
        return true;
    }
  }

  /**
   * Check if credential meets security requirements
   */
  private meetsSecurityRequirements(credential: Credential): boolean {
    // Implement security checks based on credential type
    return true; // Simplified for example
  }

  /**
   * Check if credential is not expired
   */
  private isNotExpired(credential: Credential): boolean {
    if (!credential.expiresAt) {
      return true; // Non-expiring credential
    }
    return !credential.expiresAt.isExpired();
  }

  /**
   * Validate token format (JWT, UUID, etc.)
   */
  private isValidTokenFormat(token: string): boolean {
    // JWT pattern
    const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    
    // UUID pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Generic token pattern (base64-like)
    const genericPattern = /^[A-Za-z0-9+/=_-]+$/;
    
    return jwtPattern.test(token) || 
           uuidPattern.test(token) || 
           (genericPattern.test(token) && token.length >= 16);
  }

  /**
   * Validate username format
   */
  private isValidUsernameFormat(username: string): boolean {
    return username.length >= 3 && username.length <= 50 && 
           /^[a-zA-Z0-9._@-]+$/.test(username);
  }

  /**
   * Validate password format
   */
  private isValidPasswordFormat(password: string): boolean {
    return password.length >= 8; // Minimum length requirement
  }

  /**
   * Validate API key format
   */
  private isValidApiKeyFormat(apiKey: string): boolean {
    return apiKey.length >= 16 && /^[A-Za-z0-9_-]+$/.test(apiKey);
  }
}
```

### 6. Domain Event Pattern

#### AuthenticationSucceeded Event
```typescript
/**
 * Authentication Succeeded Domain Event
 * 
 * Emitted when authentication completes successfully.
 * Used for cross-domain communication and audit logging.
 */
export class AuthenticationSucceeded extends DomainEvent {
  public readonly sessionId: AuthSessionGuid;
  public readonly providerId: AuthProviderGuid;
  public readonly timestamp: Date;
  public readonly userId?: string;

  constructor(
    sessionId: AuthSessionGuid,
    providerId: AuthProviderGuid,
    timestamp: Date,
    userId?: string
  ) {
    super('AuthenticationSucceeded', timestamp);
    this.sessionId = sessionId;
    this.providerId = providerId;
    this.timestamp = timestamp;
    this.userId = userId;
  }

  /**
   * Serialize event for persistence or transmission
   */
  public toJson(): Record<string, any> {
    return {
      eventType: this.eventType,
      eventId: this.eventId.value,
      sessionId: this.sessionId.value,
      providerId: this.providerId.value,
      timestamp: this.timestamp.toISOString(),
      userId: this.userId,
      occurredAt: this.occurredAt.toISOString()
    };
  }

  /**
   * Create event from JSON data
   */
  public static fromJson(data: Record<string, any>): AuthenticationSucceeded {
    return new AuthenticationSucceeded(
      new AuthSessionGuid(data.sessionId),
      new AuthProviderGuid(data.providerId),
      new Date(data.timestamp),
      data.userId
    );
  }
}
```

## Integration Patterns

### 1. Application Layer Integration

```typescript
/**
 * Authentication Application Service
 * 
 * Orchestrates authentication use cases and coordinates with domain services.
 */
@Injectable()
export class AuthenticationApplicationService {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly tokenRefreshService: TokenRefreshService,
    private readonly configService: ConfigurationService,
    private readonly eventBus: IDomainEventBus
  ) {}

  /**
   * Execute authentication command
   */
  public async executeAuthentication(command: AuthenticateCommand): Promise<AuthenticationResult> {
    // Load provider configuration
    const providerConfig = await this.configService.getAuthProviderConfig(command.providerId);
    
    // Create credentials from command
    const credentials = this.createCredentials(command);
    
    // Perform authentication
    const session = await this.authService.authenticate(command.providerId, credentials);
    
    // Return result
    return new AuthenticationResult(session.id, session.credential.token);
  }
}
```

### 2. Infrastructure Layer Integration

```typescript
/**
 * File-based Authentication Provider Repository
 * 
 * Infrastructure implementation of auth provider repository using file system.
 */
@Injectable()
export class FileSystemAuthProviderRepository implements IAuthProviderRepository {
  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly encryption: IEncryptionService,
    private readonly logger: ILogger
  ) {}

  public async findById(id: AuthProviderGuid): Promise<AuthProvider | null> {
    try {
      const filePath = this.getProviderFilePath(id);
      const data = await this.fileSystem.readJson(filePath);
      return this.deserializeProvider(data);
    } catch (error) {
      this.logger.debug('Provider not found', { id: id.value, error: error.message });
      return null;
    }
  }

  public async save(provider: AuthProvider): Promise<void> {
    const filePath = this.getProviderFilePath(provider.id);
    const data = await this.serializeProvider(provider);
    await this.fileSystem.writeJson(filePath, data);
  }

  private getProviderFilePath(id: AuthProviderGuid): string {
    return `auth/providers/${id.value}.json`;
  }

  private async serializeProvider(provider: AuthProvider): Promise<any> {
    return {
      id: provider.id.value,
      type: provider.type.value,
      config: await this.encryption.encrypt(provider.config.toJson()),
      isActive: provider.isActive,
      lastUsed: provider.lastUsed?.toISOString(),
      statistics: provider.statistics.toJson()
    };
  }
}
```

## Security Architecture

### 1. Credential Protection
- **Encryption at Rest**: All stored credentials encrypted using AES-256
- **Encryption in Transit**: HTTPS/TLS for all authentication requests
- **Memory Protection**: Sensitive data cleared from memory after use
- **Access Control**: Role-based access to authentication configurations

### 2. Token Security
- **Token Sanitization**: Tokens sanitized in logs and error messages
- **Secure Storage**: Tokens stored in encrypted format
- **Automatic Rotation**: Expired tokens automatically refreshed
- **Revocation Support**: Ability to revoke and invalidate tokens

### 3. Audit and Monitoring
- **Authentication Events**: All auth events logged for audit
- **Security Violations**: Failed attempts tracked and reported
- **Performance Monitoring**: Auth latency and success rates monitored
- **Compliance**: Audit trails for security compliance requirements

This architecture provides a robust, secure, and extensible foundation for authentication within the RestifiedTS framework while maintaining clean separation of concerns and adherence to Domain-Driven Design principles.