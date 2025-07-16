# Proxy/SSL Configuration Feature Specification

## Feature Overview

**Feature Name**: Proxy/SSL Configuration  
**Domain**: `http-communication`  
**Priority**: High  
**Status**: Implementation Ready  
**Version**: 1.0.0  

## Business Requirements

### Functional Requirements

#### FR-1: HTTP/HTTPS Proxy Support
- **Description**: System must support HTTP and HTTPS proxy configuration for enterprise environments
- **Acceptance Criteria**:
  - Configure proxy host, port, and protocol
  - Support proxy authentication (username/password)
  - Handle proxy bypass patterns (no-proxy lists)
  - Support both HTTP and HTTPS proxies
- **Business Value**: Enables testing in corporate environments with mandatory proxy requirements

#### FR-2: SSL/TLS Configuration
- **Description**: System must support comprehensive SSL/TLS configuration for secure communications
- **Acceptance Criteria**:
  - Configure client certificates and private keys
  - Support certificate authority (CA) bundles
  - Control certificate verification behavior
  - Support custom SSL protocols and ciphers
- **Business Value**: Enables testing of secure APIs with mutual TLS authentication

#### FR-3: Corporate Network Integration
- **Description**: System must integrate seamlessly with corporate network infrastructure
- **Acceptance Criteria**:
  - Support Windows integrated authentication
  - Handle proxy auto-configuration (PAC) files
  - Support NTLM and Kerberos authentication
  - Automatic proxy detection capabilities
- **Business Value**: Reduces configuration overhead in enterprise environments

#### FR-4: Security Credential Management
- **Description**: System must securely handle and store proxy and SSL credentials
- **Acceptance Criteria**:
  - Encrypt stored credentials at rest
  - Support secure credential input (no plain text in code)
  - Integration with system credential stores
  - Secure credential rotation and expiration
- **Business Value**: Ensures secure handling of sensitive authentication information

### Non-Functional Requirements

#### NFR-1: Performance
- **Requirement**: Proxy/SSL configuration must not add more than 100ms to request latency
- **Measurement**: Response time comparison with and without proxy/SSL
- **Acceptance**: Performance impact remains within acceptable limits

#### NFR-2: Security
- **Requirement**: All credentials must be encrypted and never logged in plain text
- **Measurement**: Security audit of credential handling and logging
- **Acceptance**: No plain text credentials in logs or memory dumps

#### NFR-3: Reliability
- **Requirement**: Network configuration errors must be handled gracefully
- **Measurement**: Error handling coverage and recovery mechanisms
- **Acceptance**: System continues to function with meaningful error messages

## Technical Architecture

### Domain Model

#### Entities
```typescript
// Proxy Configuration Entity
export class ProxyConfiguration {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly protocol: ProxyProtocol,
    private readonly authentication?: ProxyAuthentication,
    private readonly noProxy?: string[]
  ) {
    this.validateConfiguration();
  }

  public isProxyRequired(url: string): boolean {
    return !this.matchesNoProxyPattern(url);
  }

  public getProxyUrl(): string {
    return `${this.protocol}://${this.host}:${this.port}`;
  }

  public hasAuthentication(): boolean {
    return this.authentication !== undefined;
  }

  public getAuthenticationHeader(): string {
    if (!this.authentication) return '';
    return this.authentication.getAuthorizationHeader();
  }

  private validateConfiguration(): void {
    if (!this.host || this.port < 1 || this.port > 65535) {
      throw new InvalidProxyConfigurationError('Invalid proxy host or port');
    }
  }

  private matchesNoProxyPattern(url: string): boolean {
    if (!this.noProxy) return false;
    
    const hostname = new URL(url).hostname;
    return this.noProxy.some(pattern => 
      this.matchesWildcardPattern(hostname, pattern)
    );
  }
}

// SSL Configuration Entity
export class SSLConfiguration {
  constructor(
    private readonly clientCert?: string,
    private readonly clientKey?: string,
    private readonly caCerts?: string[],
    private readonly rejectUnauthorized: boolean = true,
    private readonly secureProtocol?: string,
    private readonly ciphers?: string
  ) {
    this.validateConfiguration();
  }

  public hasClientCertificate(): boolean {
    return this.clientCert !== undefined && this.clientKey !== undefined;
  }

  public getAgentOptions(): any {
    return {
      cert: this.clientCert,
      key: this.clientKey,
      ca: this.caCerts,
      rejectUnauthorized: this.rejectUnauthorized,
      secureProtocol: this.secureProtocol,
      ciphers: this.ciphers
    };
  }

  private validateConfiguration(): void {
    if (this.clientCert && !this.clientKey) {
      throw new InvalidSSLConfigurationError('Client key required when client certificate is provided');
    }
    if (this.clientKey && !this.clientCert) {
      throw new InvalidSSLConfigurationError('Client certificate required when client key is provided');
    }
  }
}
```

#### Value Objects
```typescript
// Proxy Protocol Value Object
export enum ProxyProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  SOCKS4 = 'socks4',
  SOCKS5 = 'socks5'
}

// Proxy Authentication Value Object
export class ProxyAuthentication {
  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly domain?: string
  ) {}

  public getAuthorizationHeader(): string {
    const credentials = `${this.username}:${this.password}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  public getNTLMCredentials(): NTLMCredentials {
    return {
      username: this.username,
      password: this.password,
      domain: this.domain || ''
    };
  }
}

// SSL Certificate Value Object
export class SSLCertificate {
  constructor(
    private readonly certPath: string,
    private readonly keyPath: string,
    private readonly passphrase?: string
  ) {}

  public async loadCertificate(): Promise<string> {
    return await this.loadFile(this.certPath);
  }

  public async loadKey(): Promise<string> {
    return await this.loadFile(this.keyPath);
  }

  private async loadFile(filePath: string): Promise<string> {
    const fs = require('fs').promises;
    return await fs.readFile(filePath, 'utf8');
  }
}
```

#### Services
```typescript
// Proxy Configuration Service
export interface IProxyConfigurationService {
  configureProxy(config: ProxyConfiguration): Promise<void>;
  detectProxySettings(): Promise<ProxyConfiguration | null>;
  testProxyConnection(config: ProxyConfiguration): Promise<boolean>;
  getProxyForUrl(url: string): Promise<ProxyConfiguration | null>;
}

// SSL Configuration Service
export interface ISSLConfigurationService {
  configureSSL(config: SSLConfiguration): Promise<void>;
  validateCertificate(cert: SSLCertificate): Promise<boolean>;
  loadSystemCertificates(): Promise<string[]>;
  createSecureAgent(config: SSLConfiguration): Promise<any>;
}

// Network Configuration Service
export interface INetworkConfigurationService {
  applyProxyConfiguration(request: HttpRequest): Promise<HttpRequest>;
  applySSLConfiguration(request: HttpRequest): Promise<HttpRequest>;
  validateNetworkAccess(url: string): Promise<boolean>;
}
```

### Event Model

#### Domain Events
```typescript
// Proxy Configuration Events
export class ProxyConfigurationUpdatedEvent extends DomainEvent {
  constructor(
    public readonly proxyHost: string,
    public readonly proxyPort: number,
    public readonly hasAuth: boolean,
    public readonly timestamp: Date
  ) {
    super('ProxyConfigurationUpdated');
  }
}

export class ProxyConnectionFailedEvent extends DomainEvent {
  constructor(
    public readonly proxyHost: string,
    public readonly proxyPort: number,
    public readonly error: string,
    public readonly timestamp: Date
  ) {
    super('ProxyConnectionFailed');
  }
}

// SSL Configuration Events
export class SSLConfigurationUpdatedEvent extends DomainEvent {
  constructor(
    public readonly hasCertificate: boolean,
    public readonly hasKey: boolean,
    public readonly rejectUnauthorized: boolean,
    public readonly timestamp: Date
  ) {
    super('SSLConfigurationUpdated');
  }
}

export class SSLHandshakeFailedEvent extends DomainEvent {
  constructor(
    public readonly hostname: string,
    public readonly error: string,
    public readonly timestamp: Date
  ) {
    super('SSLHandshakeFailedEvent');
  }
}
```

### Integration Points

#### HTTP Client Integration
```typescript
// HTTP Client Extension for Proxy/SSL
export class NetworkConfigurationExtension implements HttpClientExtension {
  constructor(
    private readonly proxyService: IProxyConfigurationService,
    private readonly sslService: ISSLConfigurationService
  ) {}

  async configureRequest(request: HttpRequest): Promise<HttpRequest> {
    // Apply proxy configuration
    const proxyConfig = await this.proxyService.getProxyForUrl(request.getUrl());
    if (proxyConfig) {
      request.setProxy(proxyConfig);
    }

    // Apply SSL configuration
    if (request.isHttps()) {
      const sslConfig = await this.sslService.getSSLConfiguration();
      if (sslConfig) {
        request.setSSLConfiguration(sslConfig);
      }
    }

    return request;
  }
}
```

#### Configuration Management Integration
```typescript
// Configuration Schema for Proxy/SSL
export interface NetworkConfiguration {
  proxy?: {
    host: string;
    port: number;
    protocol?: string;
    auth?: {
      username: string;
      password: string;
      domain?: string;
    };
    noProxy?: string[];
  };
  ssl?: {
    rejectUnauthorized?: boolean;
    cert?: string;
    key?: string;
    ca?: string[];
    secureProtocol?: string;
    ciphers?: string;
  };
}
```

## API Design

### Fluent Interface API

#### Basic Proxy Configuration
```typescript
// HTTP proxy configuration
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
    .proxy('proxy.company.com', 8080)
    .proxyAuth('username', 'password')
  .when()
    .get('/users')
  .then()
    .statusCode(200)
  .execute();

// HTTPS proxy with authentication
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
    .httpsProxy('secure-proxy.company.com', 8443)
    .proxyAuth('domain\\username', 'password')
    .noProxy(['localhost', '*.internal.com'])
  .when()
    .get('/users')
  .then()
    .statusCode(200)
  .execute();
```

#### SSL/TLS Configuration
```typescript
// Client certificate authentication
await RestifiedTS
  .given()
    .baseUrl('https://secure-api.example.com')
    .clientCert('./certs/client.crt')
    .clientKey('./certs/client.key')
    .caCert('./certs/ca.crt')
  .when()
    .get('/secure-data')
  .then()
    .statusCode(200)
  .execute();

// Custom SSL configuration
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
    .sslConfig({
      rejectUnauthorized: false,
      secureProtocol: 'TLSv1_2_method',
      ciphers: 'ECDHE-RSA-AES128-GCM-SHA256'
    })
  .when()
    .get('/users')
  .then()
    .statusCode(200)
  .execute();
```

#### Advanced Configuration
```typescript
// Combined proxy and SSL configuration
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
    .proxy('proxy.company.com', 8080)
    .proxyAuth('username', 'password')
    .clientCert('./certs/client.crt')
    .clientKey('./certs/client.key')
    .rejectUnauthorized(true)
  .when()
    .get('/secure-endpoint')
  .then()
    .statusCode(200)
  .execute();

// Configuration from environment
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
    .proxyFromEnv() // Uses HTTP_PROXY, HTTPS_PROXY, NO_PROXY
    .sslFromEnv()   // Uses SSL_CERT, SSL_KEY, SSL_CA
  .when()
    .get('/users')
  .then()
    .statusCode(200)
  .execute();
```

#### Enterprise Features
```typescript
// Windows integrated authentication
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
    .proxy('proxy.company.com', 8080)
    .proxyNTLM('DOMAIN\\username', 'password')
  .when()
    .get('/users')
  .then()
    .statusCode(200)
  .execute();

// Proxy auto-configuration (PAC)
await RestifiedTS
  .given()
    .baseUrl('https://api.example.com')
    .proxyPAC('http://proxy.company.com/proxy.pac')
  .when()
    .get('/users')
  .then()
    .statusCode(200)
  .execute();
```

### Configuration API

#### Programmatic Configuration
```typescript
// Global proxy configuration
RestifiedTS.configure({
  proxy: {
    host: 'proxy.company.com',
    port: 8080,
    protocol: 'http',
    auth: {
      username: 'user',
      password: 'pass'
    },
    noProxy: ['localhost', '*.internal.com']
  }
});

// Global SSL configuration
RestifiedTS.configure({
  ssl: {
    rejectUnauthorized: false,
    cert: fs.readFileSync('./certs/client.crt'),
    key: fs.readFileSync('./certs/client.key'),
    ca: [
      fs.readFileSync('./certs/ca1.crt'),
      fs.readFileSync('./certs/ca2.crt')
    ]
  }
});
```

#### Environment-based Configuration
```typescript
// Environment variables
process.env.HTTP_PROXY = 'http://proxy.company.com:8080';
process.env.HTTPS_PROXY = 'https://secure-proxy.company.com:8443';
process.env.NO_PROXY = 'localhost,*.internal.com';
process.env.SSL_CERT = './certs/client.crt';
process.env.SSL_KEY = './certs/client.key';
process.env.SSL_CA = './certs/ca.crt';

// Automatic environment detection
RestifiedTS.configure({
  proxy: {
    autoDetect: true
  },
  ssl: {
    autoDetect: true
  }
});
```

## Error Handling

### Error Types

#### ProxyConfigurationError
```typescript
export class ProxyConfigurationError extends RestifiedError {
  constructor(
    message: string,
    public readonly proxyHost?: string,
    public readonly proxyPort?: number,
    public readonly cause?: Error
  ) {
    super(message, 'PROXY_CONFIGURATION_ERROR');
  }
}
```

#### SSLConfigurationError
```typescript
export class SSLConfigurationError extends RestifiedError {
  constructor(
    message: string,
    public readonly certificatePath?: string,
    public readonly cause?: Error
  ) {
    super(message, 'SSL_CONFIGURATION_ERROR');
  }
}
```

#### NetworkConnectionError
```typescript
export class NetworkConnectionError extends RestifiedError {
  constructor(
    message: string,
    public readonly hostname?: string,
    public readonly port?: number,
    public readonly cause?: Error
  ) {
    super(message, 'NETWORK_CONNECTION_ERROR');
  }
}
```

### Error Handling Strategy

#### Graceful Degradation
```typescript
// Proxy fallback mechanism
export class ProxyFallbackHandler {
  private fallbackProxies: ProxyConfiguration[] = [];

  async handleProxyFailure(
    originalProxy: ProxyConfiguration,
    request: HttpRequest
  ): Promise<HttpRequest> {
    console.warn(`Proxy ${originalProxy.getProxyUrl()} failed, trying fallback...`);
    
    for (const fallbackProxy of this.fallbackProxies) {
      try {
        const testResult = await this.testProxyConnection(fallbackProxy);
        if (testResult) {
          return request.setProxy(fallbackProxy);
        }
      } catch (error) {
        console.warn(`Fallback proxy ${fallbackProxy.getProxyUrl()} also failed`);
      }
    }
    
    // Last resort: try direct connection
    console.warn('All proxies failed, attempting direct connection...');
    return request.removeProxy();
  }
}
```

#### Detailed Error Messages
```typescript
// Example error messages
"Proxy connection failed: Unable to connect to proxy.company.com:8080 (Connection refused)"
"SSL certificate validation failed: Certificate has expired (Not valid after: 2023-01-01)"
"Proxy authentication failed: Invalid credentials for user 'username'"
"SSL handshake failed: Unable to verify certificate chain for api.example.com"
```

## Security Considerations

### Credential Security

#### Secure Credential Storage
```typescript
// Encrypted credential storage
export class SecureCredentialStore {
  private readonly encryptionKey: Buffer;

  constructor(masterKey: string) {
    this.encryptionKey = crypto.scryptSync(masterKey, 'salt', 32);
  }

  public encryptCredentials(credentials: any): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  public decryptCredentials(encryptedCredentials: string): any {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedCredentials, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }
}
```

#### Credential Rotation
```typescript
// Automatic credential rotation
export class CredentialRotationService {
  private rotationInterval: NodeJS.Timer;

  public startRotation(intervalMinutes: number): void {
    this.rotationInterval = setInterval(async () => {
      try {
        await this.rotateCredentials();
      } catch (error) {
        console.error('Credential rotation failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  private async rotateCredentials(): Promise<void> {
    // Fetch new credentials from secure store
    const newCredentials = await this.fetchNewCredentials();
    
    // Update proxy configuration
    await this.updateProxyCredentials(newCredentials);
    
    // Update SSL certificates
    await this.updateSSLCertificates(newCredentials);
  }
}
```

### Network Security

#### Certificate Validation
```typescript
// Custom certificate validation
export class CertificateValidator {
  public validateCertificate(cert: any, hostname: string): boolean {
    // Check certificate expiration
    if (cert.valid_to < new Date()) {
      throw new SSLConfigurationError('Certificate has expired');
    }
    
    // Check hostname matching
    if (!this.matchesHostname(cert, hostname)) {
      throw new SSLConfigurationError('Certificate hostname mismatch');
    }
    
    // Check certificate revocation
    if (this.isCertificateRevoked(cert)) {
      throw new SSLConfigurationError('Certificate has been revoked');
    }
    
    return true;
  }
}
```

#### Secure Communication
```typescript
// Secure proxy communication
export class SecureProxyHandler {
  public async createSecureConnection(
    proxy: ProxyConfiguration,
    target: string
  ): Promise<any> {
    const tunnelOptions = {
      proxy: proxy.getProxyUrl(),
      target: target,
      headers: {
        'Proxy-Authorization': proxy.getAuthenticationHeader()
      }
    };
    
    // Create secure tunnel through proxy
    const tunnel = await this.createTunnel(tunnelOptions);
    
    // Verify tunnel security
    await this.verifyTunnelSecurity(tunnel);
    
    return tunnel;
  }
}
```

## Performance Optimization

### Connection Pooling

#### Proxy Connection Pool
```typescript
// Proxy connection pooling
export class ProxyConnectionPool {
  private readonly connections = new Map<string, ProxyConnection[]>();
  private readonly maxConnectionsPerProxy = 10;

  public async getConnection(proxy: ProxyConfiguration): Promise<ProxyConnection> {
    const proxyKey = proxy.getProxyUrl();
    
    if (!this.connections.has(proxyKey)) {
      this.connections.set(proxyKey, []);
    }
    
    const pool = this.connections.get(proxyKey)!;
    
    // Reuse existing connection if available
    const availableConnection = pool.find(conn => conn.isAvailable());
    if (availableConnection) {
      return availableConnection;
    }
    
    // Create new connection if under limit
    if (pool.length < this.maxConnectionsPerProxy) {
      const newConnection = await this.createConnection(proxy);
      pool.push(newConnection);
      return newConnection;
    }
    
    // Wait for connection to become available
    return await this.waitForConnection(proxyKey);
  }
}
```

### Caching

#### DNS Caching
```typescript
// DNS resolution caching
export class DNSCache {
  private readonly cache = new Map<string, { ip: string, expires: Date }>();
  private readonly ttl = 300000; // 5 minutes

  public async resolve(hostname: string): Promise<string> {
    const cached = this.cache.get(hostname);
    
    if (cached && cached.expires > new Date()) {
      return cached.ip;
    }
    
    const ip = await this.performDNSLookup(hostname);
    const expires = new Date(Date.now() + this.ttl);
    
    this.cache.set(hostname, { ip, expires });
    return ip;
  }
}
```

### Monitoring

#### Performance Metrics
```typescript
// Network performance monitoring
export class NetworkMetrics {
  private readonly metrics = new Map<string, MetricData>();

  public recordProxyLatency(proxy: string, latency: number): void {
    this.updateMetric(`proxy.${proxy}.latency`, latency);
  }

  public recordSSLHandshakeTime(hostname: string, time: number): void {
    this.updateMetric(`ssl.${hostname}.handshake`, time);
  }

  public recordConnectionFailure(type: string, reason: string): void {
    this.incrementCounter(`connection.failure.${type}.${reason}`);
  }

  public getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, metric] of this.metrics) {
      result[key] = {
        average: metric.sum / metric.count,
        min: metric.min,
        max: metric.max,
        count: metric.count
      };
    }
    
    return result;
  }
}
```

## Testing Strategy

### Unit Tests

#### Proxy Configuration Tests
```typescript
describe('ProxyConfiguration', () => {
  it('should create valid proxy configuration', () => {
    const config = new ProxyConfiguration(
      'proxy.example.com',
      8080,
      ProxyProtocol.HTTP
    );
    
    expect(config.getProxyUrl()).toBe('http://proxy.example.com:8080');
    expect(config.hasAuthentication()).toBe(false);
  });

  it('should handle proxy authentication', () => {
    const auth = new ProxyAuthentication('user', 'pass');
    const config = new ProxyConfiguration(
      'proxy.example.com',
      8080,
      ProxyProtocol.HTTP,
      auth
    );
    
    expect(config.hasAuthentication()).toBe(true);
    expect(config.getAuthenticationHeader()).toContain('Basic ');
  });

  it('should validate no-proxy patterns', () => {
    const config = new ProxyConfiguration(
      'proxy.example.com',
      8080,
      ProxyProtocol.HTTP,
      undefined,
      ['localhost', '*.internal.com']
    );
    
    expect(config.isProxyRequired('http://localhost:3000')).toBe(false);
    expect(config.isProxyRequired('https://api.internal.com')).toBe(false);
    expect(config.isProxyRequired('https://api.external.com')).toBe(true);
  });
});
```

#### SSL Configuration Tests
```typescript
describe('SSLConfiguration', () => {
  it('should create valid SSL configuration', () => {
    const config = new SSLConfiguration(
      'cert-content',
      'key-content',
      ['ca-content'],
      true
    );
    
    expect(config.hasClientCertificate()).toBe(true);
    
    const agentOptions = config.getAgentOptions();
    expect(agentOptions.cert).toBe('cert-content');
    expect(agentOptions.key).toBe('key-content');
    expect(agentOptions.rejectUnauthorized).toBe(true);
  });

  it('should validate certificate/key pair', () => {
    expect(() => {
      new SSLConfiguration('cert-content', undefined);
    }).toThrow('Client key required when client certificate is provided');
  });
});
```

### Integration Tests

#### End-to-End Proxy Testing
```typescript
describe('Proxy Integration', () => {
  it('should make requests through HTTP proxy', async () => {
    const proxyServer = await startTestProxy(8080);
    
    try {
      await RestifiedTS
        .given()
          .baseUrl('https://httpbin.org')
          .proxy('localhost', 8080)
        .when()
          .get('/get')
        .then()
          .statusCode(200)
          .jsonPath('$.headers.Host', 'httpbin.org')
        .execute();
        
      expect(proxyServer.requestCount).toBe(1);
    } finally {
      await proxyServer.stop();
    }
  });

  it('should handle proxy authentication', async () => {
    const proxyServer = await startTestProxy(8080, {
      requireAuth: true,
      username: 'testuser',
      password: 'testpass'
    });
    
    try {
      await RestifiedTS
        .given()
          .baseUrl('https://httpbin.org')
          .proxy('localhost', 8080)
          .proxyAuth('testuser', 'testpass')
        .when()
          .get('/get')
        .then()
          .statusCode(200)
        .execute();
        
      expect(proxyServer.authenticatedRequests).toBe(1);
    } finally {
      await proxyServer.stop();
    }
  });
});
```

#### SSL Integration Testing
```typescript
describe('SSL Integration', () => {
  it('should connect with client certificate', async () => {
    const sslServer = await startTestSSLServer(8443, {
      requireClientCert: true,
      caCert: './test/certs/ca.crt'
    });
    
    try {
      await RestifiedTS
        .given()
          .baseUrl('https://localhost:8443')
          .clientCert('./test/certs/client.crt')
          .clientKey('./test/certs/client.key')
          .caCert('./test/certs/ca.crt')
        .when()
          .get('/secure')
        .then()
          .statusCode(200)
        .execute();
        
      expect(sslServer.clientCertificateVerified).toBe(true);
    } finally {
      await sslServer.stop();
    }
  });
});
```

## Documentation Requirements

### API Documentation

#### Method Documentation
```typescript
/**
 * Configures HTTP proxy for requests
 * 
 * @param host - Proxy server hostname
 * @param port - Proxy server port
 * @param protocol - Proxy protocol (http/https)
 * @returns GivenStepBuilder for method chaining
 * 
 * @example
 * .given()
 *   .proxy('proxy.company.com', 8080)
 *   .proxyAuth('username', 'password')
 * 
 * @throws ProxyConfigurationError When proxy configuration is invalid
 */
proxy(host: string, port: number, protocol?: string): GivenStepBuilder;

/**
 * Configures SSL client certificate
 * 
 * @param certPath - Path to client certificate file
 * @param keyPath - Path to client key file
 * @param passphrase - Optional passphrase for encrypted key
 * @returns GivenStepBuilder for method chaining
 * 
 * @example
 * .given()
 *   .clientCert('./certs/client.crt')
 *   .clientKey('./certs/client.key')
 * 
 * @throws SSLConfigurationError When SSL configuration is invalid
 */
clientCert(certPath: string): GivenStepBuilder;
clientKey(keyPath: string, passphrase?: string): GivenStepBuilder;
```

### Configuration Examples

#### Environment Variables
```bash
# Proxy configuration
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=https://secure-proxy.company.com:8443
export NO_PROXY=localhost,*.internal.com,127.0.0.1

# SSL configuration
export SSL_CERT=./certs/client.crt
export SSL_KEY=./certs/client.key
export SSL_CA=./certs/ca.crt
export SSL_REJECT_UNAUTHORIZED=false
```

#### Configuration File
```json
{
  "proxy": {
    "host": "proxy.company.com",
    "port": 8080,
    "protocol": "http",
    "auth": {
      "username": "${PROXY_USERNAME}",
      "password": "${PROXY_PASSWORD}"
    },
    "noProxy": ["localhost", "*.internal.com"]
  },
  "ssl": {
    "rejectUnauthorized": false,
    "cert": "./certs/client.crt",
    "key": "./certs/client.key",
    "ca": ["./certs/ca.crt"],
    "secureProtocol": "TLSv1_2_method"
  }
}
```

This comprehensive feature specification provides the foundation for implementing robust proxy and SSL configuration support in RestifiedTS, enabling enterprise-grade network connectivity and security features.