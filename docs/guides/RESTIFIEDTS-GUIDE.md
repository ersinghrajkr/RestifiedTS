# 🚀 RestifiedTS Complete Guide

A comprehensive guide to master RestifiedTS for REST API automation testing with TypeScript.

> **🎉 NEW in v1.2.0:** Complete comprehensive features demo showcasing ALL RestifiedTS capabilities!

---

## 📋 Table of Contents

1. [🌟 NEW: Comprehensive Features Demo (v1.2.0)](#-new-comprehensive-features-demo-v120)
2. [🎯 Quick Start](#-quick-start)
3. [⚙️ Configuration Guide](#️-configuration-guide)
4. [🔐 Authentication &amp; Token Management](#-authentication--token-management)
5. [🏗️ Multi-Instance Architecture](#️-multi-instance-architecture)
6. [📚 Complete Examples](#-complete-examples)
7. [🔧 Advanced Features](#-advanced-features)
8. [📦 Publishing to NPM](#-publishing-to-npm)
9. [🐛 Troubleshooting](#-troubleshooting)

---

## 🌟 NEW: Comprehensive Features Demo (v1.2.0)

RestifiedTS v1.2.0 includes a complete comprehensive test that showcases **ALL** framework capabilities in a single, production-ready example. This is the perfect starting point for learning RestifiedTS!

### Generate Your Own Comprehensive Demo

```bash
# Generate a comprehensive features demo
npx restifiedts generate --type comprehensive --name my-comprehensive-demo

# This creates a complete test file demonstrating:
# ✅ Configuration management (JSON, .env, runtime)
# ✅ Authentication flow (login → token → refresh)
# ✅ Variable templating with all built-in functions
# ✅ Multiple client management
# ✅ Performance testing (10 concurrent requests)
# ✅ Security testing patterns
# ✅ Database integration workflows
# ✅ GraphQL and WebSocket testing
# ✅ Snapshot testing and report generation
# ✅ Complete error handling and logging
```

### Explore the Built-in Demo

```bash
# Run the comprehensive features test
npm test -- --grep "comprehensive"

# View the source for learning
cat tests/integration/comprehensive-features.test.ts
```

### What You'll Learn

The comprehensive demo demonstrates **production-ready patterns** including:

- **Real Authentication Flows**: Login → extract tokens → use in subsequent requests
- **Multi-Service Testing**: Different clients for auth, main API, payments, external services
- **Performance Validation**: Concurrent request testing with metrics
- **Database Integration**: Setup/teardown patterns with state validation
- **Security Patterns**: Input validation and authentication testing
- **Error Recovery**: Retry logic, fallbacks, and graceful degradation
- **Complete Configuration**: JSON files, environment variables, runtime updates

This comprehensive demo serves as both a **feature showcase** and a **learning resource** for implementing RestifiedTS in production environments.

---

## 🎯 Quick Start

### Installation

```bash
# Install RestifiedTS
npm install restifiedts

# Install testing dependencies
npm install --save-dev mocha chai @types/mocha @types/chai @types/node typescript ts-node
```

### Basic Setup

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "experimentalDecorators": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["tests/**/*"],
  "exclude": ["node_modules"]
}
```

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "mocha --require ts-node/register 'tests/**/*.ts'",
    "test:api": "mocha --require ts-node/register 'tests/api/**/*.ts'",
    "test:integration": "mocha --require ts-node/register 'tests/integration/**/*.ts'"
  }
}
```

### Your First Test

Create `tests/my-first-api.test.ts`:

```typescript
import { restified } from 'restifiedts';
import { expect } from 'chai';

describe('My First API Test', function() {
  // ESSENTIAL: Always include cleanup
  afterAll(async function() {
    await restified.cleanup();
  });

  it('should test JSONPlaceholder API', async function() {
    this.timeout(10000);
  
    // Execute request
    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
      .when()
        .get('/posts/1')
        .execute(); // First execute - sends request
  
    // Execute assertions
    await response
      .statusCode(200)
      .jsonPath('$.userId', 1)
      .jsonPath('$.title').isString()
      .execute(); // Second execute - runs assertions
  });
});
```

Run your test:

```bash
npm test
```

---

## ⚙️ Configuration Guide

### 1. Environment-Based Configuration

Create configuration files for different environments:

**config/default.json**

```json
{
  "baseURL": "https://api.example.com",
  "timeout": 30000,
  "retryConfig": {
    "maxRetries": 3,
    "backoffFactor": 2,
    "retryDelay": 1000,
    "retryStatusCodes": [408, 429, 500, 502, 503, 504]
  },
  "auth": {
    "tokenEndpoint": "/auth/login",
    "refreshEndpoint": "/auth/refresh",
    "tokenStorage": "memory"
  },
  "logging": {
    "level": "info",
    "console": true,
    "auditEnabled": true,
    "auditPath": "./logs/audit.log"
  },
  "reporting": {
    "enabled": true,
    "format": "html",
    "outputPath": "./reports"
  }
}
```

**config/test.json**

```json
{
  "baseURL": "https://test-api.example.com",
  "timeout": 15000,
  "logging": {
    "level": "debug"
  }
}
```

**config/production.json**

```json
{
  "baseURL": "https://prod-api.example.com",
  "timeout": 45000,
  "logging": {
    "level": "error",
    "console": false
  }
}
```

### 2. Programmatic Configuration

Create a configuration manager:

**tests/config/ConfigManager.ts**

```typescript
import { RestifiedTS } from 'restifiedts';

export interface APIConfig {
  baseURL: string;
  timeout: number;
  authConfig?: {
    username: string;
    password: string;
    tokenEndpoint: string;
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private configs: Map<string, APIConfig> = new Map();
  private restifiedInstances: Map<string, RestifiedTS> = new Map();

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  // Set up configuration for different environments
  setupConfigurations(): void {
    // Development configuration
    this.configs.set('development', {
      baseURL: 'https://dev-api.example.com',
      timeout: 15000,
      authConfig: {
        username: 'dev-user',
        password: 'dev-pass',
        tokenEndpoint: '/auth/login'
      },
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000
      }
    });

    // Staging configuration
    this.configs.set('staging', {
      baseURL: 'https://staging-api.example.com',
      timeout: 30000,
      authConfig: {
        username: 'staging-user',
        password: 'staging-pass',
        tokenEndpoint: '/auth/login'
      }
    });

    // Production configuration
    this.configs.set('production', {
      baseURL: 'https://api.example.com',
      timeout: 45000,
      authConfig: {
        username: process.env.PROD_USERNAME || '',
        password: process.env.PROD_PASSWORD || '',
        tokenEndpoint: '/auth/login'
      }
    });

    // Third-party service configurations
    this.configs.set('payment-service', {
      baseURL: 'https://payment-api.example.com',
      timeout: 20000,
      authConfig: {
        username: process.env.PAYMENT_API_USER || '',
        password: process.env.PAYMENT_API_PASS || '',
        tokenEndpoint: '/oauth/token'
      }
    });

    this.configs.set('notification-service', {
      baseURL: 'https://notifications.example.com',
      timeout: 10000
    });
  }

  // Get RestifiedTS instance for specific service
  getRestifiedInstance(serviceName: string): RestifiedTS {
    if (!this.restifiedInstances.has(serviceName)) {
      const config = this.configs.get(serviceName);
      if (!config) {
        throw new Error(`Configuration not found for service: ${serviceName}`);
      }

      const restifiedInstance = new RestifiedTS({
        baseURL: config.baseURL,
        timeout: config.timeout,
        retryConfig: config.retryConfig,
        logging: {
          level: 'info',
          console: true
        }
      });

      this.restifiedInstances.set(serviceName, restifiedInstance);
    }

    return this.restifiedInstances.get(serviceName)!;
  }

  // Get configuration for a service
  getConfig(serviceName: string): APIConfig {
    const config = this.configs.get(serviceName);
    if (!config) {
      throw new Error(`Configuration not found for service: ${serviceName}`);
    }
    return config;
  }

  // Cleanup all instances
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.restifiedInstances.values()).map(
      instance => instance.cleanup()
    );
    await Promise.all(cleanupPromises);
    this.restifiedInstances.clear();
  }
}
```

### 3. Global Setup for Test Suite

**tests/setup/global-setup.ts**

```typescript
import { ConfigManager } from '../config/ConfigManager';

export class GlobalTestSetup {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  async setup(): Promise<void> {
    // Initialize configurations
    this.configManager.setupConfigurations();

    // Set environment based on NODE_ENV
    const environment = process.env.NODE_ENV || 'development';
    console.log(`🚀 Setting up tests for environment: ${environment}`);

    // Pre-authenticate services that require tokens
    await this.preAuthenticate();
  }

  private async preAuthenticate(): Promise<void> {
    const services = ['development', 'payment-service'];
  
    for (const serviceName of services) {
      try {
        const restified = this.configManager.getRestifiedInstance(serviceName);
        const config = this.configManager.getConfig(serviceName);
      
        if (config.authConfig) {
          console.log(`🔐 Pre-authenticating ${serviceName}...`);
        
          const authResponse = await restified
            .given()
              .baseURL(config.baseURL)
              .header('Content-Type', 'application/json')
              .body({
                username: config.authConfig.username,
                password: config.authConfig.password
              })
            .when()
              .post(config.authConfig.tokenEndpoint)
              .execute();

          await authResponse
            .statusCode(200)
            .extract('$.token', `${serviceName}_token`)
            .execute();

          console.log(`✅ ${serviceName} authenticated successfully`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to pre-authenticate ${serviceName}:`, error.message);
      }
    }
  }

  async cleanup(): Promise<void> {
    await this.configManager.cleanup();
  }
}
```

---

## 🔐 Authentication & Token Management

### 1. Bearer Token Authentication

```typescript
import { restified } from 'restifiedts';

describe('Bearer Token Authentication', function() {
  let authToken: string;

  beforeAll(async function() {
    this.timeout(10000);
  
    // Get authentication token
    const loginResponse = await restifiedinstanceNameserviceNameNameServicerestified
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .body({
          username: process.env.API_USERNAME || 'testuser',
          password: process.env.API_PASSWORD || 'testpass'
        })
      .when()
        .post('/auth/login')
        .execute();

    await loginResponse
      .statusCode(200)
      .extract('$.access_token', 'authToken')
      .extract('$.refresh_token', 'refreshToken')
      .execute();

    // Store tokens globally
    authToken = restified.getVariable('authToken');
    restified.setGlobalVariable('authToken', authToken);
    restified.setGlobalVariable('refreshToken', restified.getVariable('refreshToken'));
  });

  afterAll(async function() {
    await restified.cleanup();
  });

  it('should access protected endpoint with token', async function() {
    this.timeout(10000);
  
    const response = await restified
      .given()
        .baseURL('https://api.example.com')
        .bearerToken(authToken)
      .when()
        .get('/protected/profile')
        .execute();

    await response
      .statusCode(200)
      .jsonPath('$.user').isObject()
      .execute();
  });
});
```

### 2. Token Refresh Mechanism

```typescript
export class TokenManager {
  private static instance: TokenManager;
  private accessToken: string = '';
  private refreshToken: string = '';
  private tokenExpiry: number = 0;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async getValidToken(): Promise<string> {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  private isTokenExpired(): boolean {
    return Date.now() >= this.tokenExpiry - 60000; // Refresh 1 minute before expiry
  }

  private async refreshAccessToken(): Promise<void> {
    const refreshResponse = await restified
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .body({
          refresh_token: this.refreshToken
        })
      .when()
        .post('/auth/refresh')
        .execute();

    await refreshResponse
      .statusCode(200)
      .extract('$.access_token', 'newAccessToken')
      .extract('$.expires_in', 'expiresIn')
      .execute();

    this.accessToken = restified.getVariable('newAccessToken');
    const expiresIn = parseInt(restified.getVariable('expiresIn'));
    this.tokenExpiry = Date.now() + (expiresIn * 1000);

    restified.setGlobalVariable('authToken', this.accessToken);
  }

  setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = Date.now() + (expiresIn * 1000);
  }
}
```

### 3. API Key Authentication

```typescript
describe('API Key Authentication', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  it('should authenticate with API key in header', async function() {
    this.timeout(10000);
  
    const response = await restified
      .given()
        .baseURL('https://api.example.com')
        .apiKey('X-API-Key', process.env.API_KEY || 'your-api-key')
      .when()
        .get('/data')
        .execute();

    await response
      .statusCode(200)
      .execute();
  });

  it('should authenticate with API key in query', async function() {
    this.timeout(10000);
  
    const response = await restified
      .given()
        .baseURL('https://api.example.com')
        .queryParam('apikey', process.env.API_KEY || 'your-api-key')
      .when()
        .get('/data')
        .execute();

    await response
      .statusCode(200)
      .execute();
  });
});
```

---

## 🏗️ Multi-Instance Architecture

### 1. Service-Oriented Architecture

```typescript
export class ServiceManager {
  private static instance: ServiceManager;
  private services: Map<string, RestifiedTS> = new Map();

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  initializeServices(): void {
    // Main API service
    this.services.set('main-api', new RestifiedTS({
      baseURL: 'https://api.example.com',
      timeout: 30000,
      logging: { level: 'info', console: true }
    }));

    // Authentication service
    this.services.set('auth', new RestifiedTS({
      baseURL: 'https://auth.example.com',
      timeout: 15000,
      logging: { level: 'debug', console: true }
    }));

    // Payment service
    this.services.set('payment', new RestifiedTS({
      baseURL: 'https://payments.example.com',
      timeout: 45000,
      retryConfig: {
        maxRetries: 5,
        retryDelay: 2000
      }
    }));

    // Notification service
    this.services.set('notification', new RestifiedTS({
      baseURL: 'https://notifications.example.com',
      timeout: 10000
    }));

    // External integration
    this.services.set('external-partner', new RestifiedTS({
      baseURL: 'https://partner-api.external.com',
      timeout: 60000,
      headers: {
        'User-Agent': 'RestifiedTS-TestSuite/1.0'
      }
    }));
  }

  getService(name: string): RestifiedTS {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found. Available services: ${Array.from(this.services.keys()).join(', ')}`);
    }
    return service;
  }

  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.services.values()).map(
      service => service.cleanup()
    );
    await Promise.all(cleanupPromises);
    this.services.clear();
  }
}
```

### 2. Cross-Service Integration Tests

```typescript
import { ServiceManager } from '../config/ServiceManager';

describe('Cross-Service Integration Tests', function() {
  let serviceManager: ServiceManager;

  beforeAll(function() {
    serviceManager = ServiceManager.getInstance();
    serviceManager.initializeServices();
  });

  afterAll(async function() {
    await serviceManager.cleanup();
  });

  it('should complete full user journey across services', async function() {
    this.timeout(60000);
  
    // Step 1: Authenticate with auth service
    const authService = serviceManager.getService('auth');
    const authResponse = await authService
      .given()
        .header('Content-Type', 'application/json')
        .body({
          username: 'integration-user',
          password: 'integration-pass'
        })
      .when()
        .post('/login')
        .execute();

    await authResponse
      .statusCode(200)
      .extract('$.token', 'userToken')
      .execute();

    // Step 2: Create user profile with main API
    const mainApi = serviceManager.getService('main-api');
    const profileResponse = await mainApi
      .given()
        .bearerToken('{{userToken}}')
        .body({
          name: 'Integration Test User',
          email: 'integration@example.com',
          preferences: {
            notifications: true,
            marketing: false
          }
        })
      .when()
        .post('/users/profile')
        .execute();

    await profileResponse
      .statusCode(201)
      .extract('$.id', 'userId')
      .execute();

    // Step 3: Set up payment method with payment service
    const paymentService = serviceManager.getService('payment');
    const paymentResponse = await paymentService
      .given()
        .bearerToken('{{userToken}}')
        .body({
          userId: '{{userId}}',
          paymentMethod: {
            type: 'credit_card',
            cardNumber: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123'
          }
        })
      .when()
        .post('/payment-methods')
        .execute();

    await paymentResponse
      .statusCode(201)
      .extract('$.id', 'paymentMethodId')
      .execute();

    // Step 4: Subscribe to notifications
    const notificationService = serviceManager.getService('notification');
    const subscriptionResponse = await notificationService
      .given()
        .bearerToken('{{userToken}}')
        .body({
          userId: '{{userId}}',
          channels: ['email', 'push'],
          preferences: {
            orderUpdates: true,
            promotions: false
          }
        })
      .when()
        .post('/subscriptions')
        .execute();

    await subscriptionResponse
      .statusCode(201)
      .execute();

    // Step 5: Sync with external partner
    const externalService = serviceManager.getService('external-partner');
    const syncResponse = await externalService
      .given()
        .bearerToken('{{userToken}}')
        .body({
          userId: '{{userId}}',
          action: 'user_created',
          metadata: {
            source: 'restifiedts-integration',
            timestamp: new Date().toISOString()
          }
        })
      .when()
        .post('/sync/user')
        .execute();

    await syncResponse
      .statusCode(200)
      .jsonPath('$.status', 'synced')
      .execute();

    console.log('✅ Full cross-service integration completed successfully');
  });

  it('should handle service failures gracefully', async function() {
    this.timeout(30000);
  
    const mainApi = serviceManager.getService('main-api');
  
    // Test with invalid token
    const response = await mainApi
      .given()
        .bearerToken('invalid-token')
        .body({ name: 'Test User' })
      .when()
        .post('/users/profile')
        .execute();

    await response
      .statusCode(401)
      .jsonPath('$.error', 'Unauthorized')
      .execute();
  });
});
```

### 3. Runtime Service Creation

```typescript
export class DynamicServiceManager {
  private services: Map<string, RestifiedTS> = new Map();

  createServiceAtRuntime(
    serviceName: string,
    baseURL: string,
    options?: {
      timeout?: number;
      authToken?: string;
      headers?: Record<string, string>;
    }
  ): RestifiedTS {
    const serviceConfig: any = {
      baseURL,
      timeout: options?.timeout || 30000,
      logging: { level: 'info', console: true }
    };

    if (options?.headers) {
      serviceConfig.headers = options.headers;
    }

    const service = new RestifiedTS(serviceConfig);

    // Set auth token if provided
    if (options?.authToken) {
      service.setGlobalVariable('authToken', options.authToken);
    }

    this.services.set(serviceName, service);
    return service;
  }

  getOrCreateService(
    serviceName: string,
    config: {
      baseURL: string;
      timeout?: number;
      authToken?: string;
    }
  ): RestifiedTS {
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName)!;
    }

    return this.createServiceAtRuntime(serviceName, config.baseURL, {
      timeout: config.timeout,
      authToken: config.authToken
    });
  }

  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.services.values()).map(
      service => service.cleanup()
    );
    await Promise.all(cleanupPromises);
    this.services.clear();
  }
}

// Usage example
describe('Dynamic Service Creation', function() {
  let dynamicManager: DynamicServiceManager;

  beforeAll(function() {
    dynamicManager = new DynamicServiceManager();
  });

  afterAll(async function() {
    await dynamicManager.cleanup();
  });

  it('should create and use service at runtime', async function() {
    this.timeout(10000);

    // Create service dynamically based on test environment
    const apiUrl = process.env.DYNAMIC_API_URL || 'https://httpbin.org';
    const dynamicService = dynamicManager.createServiceAtRuntime(
      'dynamic-test-service',
      apiUrl,
      {
        timeout: 15000,
        headers: {
          'X-Test-Suite': 'RestifiedTS',
          'X-Environment': process.env.NODE_ENV || 'test'
        }
      }
    );

    const response = await dynamicService
      .given()
        .header('Content-Type', 'application/json')
        .body({ message: 'Dynamic service test' })
      .when()
        .post('/post')
        .execute();

    await response
      .statusCode(200)
      .execute();
  });
});
```

---

## 📚 Complete Examples

### 1. E-commerce API Test Suite

```typescript
import { ServiceManager } from '../config/ServiceManager';
import { TokenManager } from '../auth/TokenManager';

describe('E-commerce Complete Test Suite', function() {
  let serviceManager: ServiceManager;
  let tokenManager: TokenManager;

  beforeAll(async function() {
    this.timeout(30000);
  
    serviceManager = ServiceManager.getInstance();
    tokenManager = TokenManager.getInstance();
  
    serviceManager.initializeServices();
  
    // Setup authentication
    const authService = serviceManager.getService('auth');
    const loginResponse = await authService
      .given()
        .header('Content-Type', 'application/json')
        .body({
          username: process.env.ECOMMERCE_USER || 'test@example.com',
          password: process.env.ECOMMERCE_PASS || 'testpass'
        })
      .when()
        .post('/login')
        .execute();

    await loginResponse
      .statusCode(200)
      .extract('$.access_token', 'accessToken')
      .extract('$.refresh_token', 'refreshToken')
      .extract('$.expires_in', 'expiresIn')
      .execute();

    tokenManager.setTokens(
      serviceManager.getService('auth').getVariable('accessToken'),
      serviceManager.getService('auth').getVariable('refreshToken'),
      parseInt(serviceManager.getService('auth').getVariable('expiresIn'))
    );
  });

  afterAll(async function() {
    await serviceManager.cleanup();
  });

  describe('Product Management', function() {
    it('should create and manage products', async function() {
      this.timeout(15000);
    
      const mainApi = serviceManager.getService('main-api');
      const token = await tokenManager.getValidToken();
    
      // Create product
      const productResponse = await mainApi
        .given()
          .bearerToken(token)
          .body({
            name: 'Test Product {{$random.uuid}}',
            description: 'Integration test product',
            price: 99.99,
            category: 'electronics',
            inventory: {
              quantity: 100,
              sku: 'TEST-{{$random.uuid}}'
            }
          })
        .when()
          .post('/products')
          .execute();

      await productResponse
        .statusCode(201)
        .jsonPath('$.name').isString()
        .jsonPath('$.price', 99.99)
        .extract('$.id', 'productId')
        .execute();

      // Update product
      const updateResponse = await mainApi
        .given()
          .bearerToken(token)
          .body({
            price: 89.99,
            inventory: { quantity: 150 }
          })
        .when()
          .patch('/products/{{productId}}')
          .execute();

      await updateResponse
        .statusCode(200)
        .jsonPath('$.price', 89.99)
        .execute();
    });
  });

  describe('Order Processing Workflow', function() {
    it('should complete full order workflow', async function() {
      this.timeout(30000);
    
      const mainApi = serviceManager.getService('main-api');
      const paymentService = serviceManager.getService('payment');
      const notificationService = serviceManager.getService('notification');
      const token = await tokenManager.getValidToken();

      // Create cart
      const cartResponse = await mainApi
        .given()
          .bearerToken(token)
          .body({
            items: [
              { productId: '{{productId}}', quantity: 2 },
              { productId: 'prod-456', quantity: 1 }
            ]
          })
        .when()
          .post('/cart')
          .execute();

      await cartResponse
        .statusCode(201)
        .extract('$.id', 'cartId')
        .extract('$.total', 'cartTotal')
        .execute();

      // Apply discount
      const discountResponse = await mainApi
        .given()
          .bearerToken(token)
          .body({
            couponCode: 'INTEGRATION10',
            cartId: '{{cartId}}'
          })
        .when()
          .post('/discounts/apply')
          .execute();

      await discountResponse
        .statusCode(200)
        .extract('$.discountedTotal', 'finalTotal')
        .execute();

      // Process payment
      const paymentResponse = await paymentService
        .given()
          .bearerToken(token)
          .body({
            amount: '{{finalTotal}}',
            currency: 'USD',
            paymentMethod: 'credit_card',
            metadata: {
              cartId: '{{cartId}}',
              orderType: 'integration_test'
            }
          })
        .when()
          .post('/payments')
          .execute();

      await paymentResponse
        .statusCode(200)
        .jsonPath('$.status', 'completed')
        .extract('$.transactionId', 'transactionId')
        .execute();

      // Create order
      const orderResponse = await mainApi
        .given()
          .bearerToken(token)
          .body({
            cartId: '{{cartId}}',
            paymentTransactionId: '{{transactionId}}',
            shippingAddress: {
              street: '123 Test Street',
              city: 'Test City',
              zipCode: '12345',
              country: 'US'
            }
          })
        .when()
          .post('/orders')
          .execute();

      await orderResponse
        .statusCode(201)
        .jsonPath('$.status', 'confirmed')
        .extract('$.id', 'orderId')
        .execute();

      // Send notification
      const notificationResponse = await notificationService
        .given()
          .bearerToken(token)
          .body({
            userId: 'current',
            type: 'order_confirmation',
            orderId: '{{orderId}}',
            channels: ['email', 'sms']
          })
        .when()
          .post('/notifications/send')
          .execute();

      await notificationResponse
        .statusCode(200)
        .jsonPath('$.sent', true)
        .execute();

      console.log('✅ Complete order workflow executed successfully');
    });
  });
});
```

### 2. Microservices Integration Test

```typescript
describe('Microservices Integration', function() {
  let services: Map<string, RestifiedTS>;

  beforeAll(function() {
    services = new Map();
  
    // Initialize all microservices
    const serviceConfigs = [
      { name: 'user-service', url: 'https://users.example.com' },
      { name: 'product-service', url: 'https://products.example.com' },
      { name: 'order-service', url: 'https://orders.example.com' },
      { name: 'inventory-service', url: 'https://inventory.example.com' },
      { name: 'notification-service', url: 'https://notifications.example.com' }
    ];

    serviceConfigs.forEach(config => {
      services.set(config.name, new RestifiedTS({
        baseURL: config.url,
        timeout: 20000,
        retryConfig: { maxRetries: 3, retryDelay: 1000 }
      }));
    });
  });

  afterAll(async function() {
    const cleanupPromises = Array.from(services.values()).map(service => service.cleanup());
    await Promise.all(cleanupPromises);
  });

  it('should handle distributed transaction', async function() {
    this.timeout(45000);

    // Step 1: Reserve inventory
    const inventoryResponse = await services.get('inventory-service')!
      .given()
        .bearerToken('{{serviceToken}}')
        .body({
          productId: 'prod-123',
          quantity: 5,
          reservationId: '{{$random.uuid}}'
        })
      .when()
        .post('/reservations')
        .execute();

    await inventoryResponse
      .statusCode(201)
      .extract('$.reservationId', 'reservationId')
      .execute();

    try {
      // Step 2: Create order
      const orderResponse = await services.get('order-service')!
        .given()
          .bearerToken('{{serviceToken}}')
          .body({
            userId: 'user-456',
            items: [{ productId: 'prod-123', quantity: 5 }],
            reservationId: '{{reservationId}}'
          })
        .when()
          .post('/orders')
          .execute();

      await orderResponse
        .statusCode(201)
        .extract('$.id', 'orderId')
        .execute();

      // Step 3: Confirm reservation
      const confirmResponse = await services.get('inventory-service')!
        .given()
          .bearerToken('{{serviceToken}}')
          .body({
            reservationId: '{{reservationId}}',
            orderId: '{{orderId}}'
          })
        .when()
          .post('/reservations/confirm')
          .execute();

      await confirmResponse
        .statusCode(200)
        .execute();

    } catch (error) {
      // Rollback reservation on failure
      await services.get('inventory-service')!
        .given()
          .bearerToken('{{serviceToken}}')
        .when()
          .delete('/reservations/{{reservationId}}')
          .execute();
    
      throw error;
    }
  });
});
```

---

## 🔧 Advanced Features

### 1. Custom Assertions and Validations

```typescript
import { z } from 'zod';

// Custom schema definitions
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(18).max(120),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string().regex(/^\d{5}$/)
  })
});

describe('Advanced Validation Tests', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  it('should validate complex response schemas', async function() {
    this.timeout(10000);
  
    const response = await restified
      .given()
        .baseURL('https://api.example.com')
        .bearerToken('{{authToken}}')
      .when()
        .get('/users/profile')
        .execute();

    await response
      .statusCode(200)
      .validateSchema(UserSchema)
      .jsonPath('$.email').matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      .jsonPath('$.age').isNumber().greaterThan(17)
      .execute();
  });

  it('should perform custom business validations', async function() {
    this.timeout(10000);
  
    const response = await restified
      .given()
        .baseURL('https://api.example.com')
        .bearerToken('{{authToken}}')
      .when()
        .get('/orders/recent')
        .execute();

    await response
      .statusCode(200)
      .customAssertion('orders should have valid totals', (responseData) => {
        const orders = responseData.data;
        return orders.every(order => 
          order.total >= 0 && 
          order.total === order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        );
      })
      .execute();
  });
});
```

### 2. Performance and Load Testing

```typescript
describe('Performance and Load Tests', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  it('should handle concurrent users', async function() {
    this.timeout(60000);
  
    const concurrentUsers = 50;
    const requestsPerUser = 10;
  
    const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      const userRequests = Array.from({ length: requestsPerUser }, async (_, requestIndex) => {
        const response = await restified
          .given()
            .baseURL('https://api.example.com')
            .bearerToken('{{authToken}}')
            .contextVariable('userId', userIndex)
            .contextVariable('requestId', requestIndex)
          .when()
            .get('/products?page={{requestId}}&user={{userId}}')
            .execute();

        await response
          .statusCode(200)
          .responseTime(5000)
          .execute();

        return {
          user: userIndex,
          request: requestIndex,
          responseTime: response.getResponseTime()
        };
      });

      return Promise.all(userRequests);
    });

    const results = await Promise.all(userPromises);
    const flatResults = results.flat();
  
    // Analyze performance metrics
    const responseTimes = flatResults.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
  
    console.log(`Performance Results:
      - Total Requests: ${flatResults.length}
      - Average Response Time: ${avgResponseTime}ms
      - Max Response Time: ${maxResponseTime}ms
      - Success Rate: 100%`);

    expect(avgResponseTime).to.be.lessThan(2000);
    expect(maxResponseTime).to.be.lessThan(5000);
  });
});
```

### 3. Data-Driven Testing

```typescript
interface TestCase {
  name: string;
  input: any;
  expectedStatus: number;
  expectedResponse?: any;
}

describe('Data-Driven API Tests', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  const testCases: TestCase[] = [
    {
      name: 'valid user creation',
      input: {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      },
      expectedStatus: 201,
      expectedResponse: { status: 'created' }
    },
    {
      name: 'invalid email format',
      input: {
        name: 'Jane Doe',
        email: 'invalid-email',
        age: 25
      },
      expectedStatus: 400
    },
    {
      name: 'missing required fields',
      input: {
        name: 'Bob Smith'
      },
      expectedStatus: 400
    },
    {
      name: 'age below minimum',
      input: {
        name: 'Minor User',
        email: 'minor@example.com',
        age: 15
      },
      expectedStatus: 400
    }
  ];

  testCases.forEach((testCase) => {
    it(`should handle ${testCase.name}`, async function() {
      this.timeout(10000);
    
      const response = await restified
        .given()
          .baseURL('https://api.example.com')
          .header('Content-Type', 'application/json')
          .bearerToken('{{authToken}}')
          .body(testCase.input)
        .when()
          .post('/users')
          .execute();

      const assertions = response.statusCode(testCase.expectedStatus);

      if (testCase.expectedResponse) {
        Object.keys(testCase.expectedResponse).forEach(key => {
          assertions.jsonPath(`$.${key}`, testCase.expectedResponse[key]);
        });
      }

      await assertions.execute();
    });
  });
});
```

---

## 📦 Publishing to NPM

### 1. Prepare for Publishing

**Update package.json:**

```json
{
  "name": "restifiedts",
  "version": "1.0.0",
  "description": "Production-grade API testing framework built in TypeScript",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "restifiedts": "dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc && tsc-alias",
    "prepublishOnly": "npm run clean && npm run build && npm test",
    "clean": "rimraf dist"
  },
  "keywords": [
    "api-testing",
    "typescript",
    "rest",
    "graphql",
    "websocket",
    "test-automation",
    "fluent-api"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/restifiedts.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/restifiedts/issues"
  },
  "homepage": "https://github.com/yourusername/restifiedts#readme"
}
```

### 2. Build and Test Before Publishing

```bash
# Clean and build
npm run clean
npm run build

# Run all tests
npm test

# Test the CLI
npm run cli -- --help

# Test installation locally
npm pack
npm install restifiedts-1.0.0.tgz
```

### 3. Publishing Process

```bash
# Login to NPM
npm login

# Publish (dry run first)
npm publish --dry-run

# Actual publish
npm publish

# For beta releases
npm publish --tag beta

# For scoped packages
npm publish --access public
```

### 4. Post-Publishing Setup

**Create CHANGELOG.md:**

```markdown
# Changelog

## [1.0.0] - 2025-07-25

### Added
- Fluent DSL for API testing
- TypeScript first design
- Multi-protocol support (REST, GraphQL, WebSocket)
- Comprehensive authentication support
- Variable resolution with Faker.js
- Snapshot testing capabilities
- Performance testing features
- CLI tool for test generation

### Features
- Bearer token authentication
- Basic authentication
- API Key authentication
- OAuth2 support
- Multi-client architecture
- Retry mechanisms
- Comprehensive reporting
- Schema validation

### Technical
- Full TypeScript support
- Mocha integration
- Chai assertions
- Modern ES2020 target
- Comprehensive test coverage
```

**Update README with installation:**

```markdown
## Installation

```bash
npm install restifiedts
```

## Quick Start

```typescript
import { restified } from 'restifiedts';

// Your first test
const response = await restified
  .given()
    .baseURL('https://api.example.com')
  .when()
    .get('/users')
    .execute();

await response
  .statusCode(200)
  .execute();
```

### 5. Continuous Integration for Publishing

**GitHub Actions (.github/workflows/publish.yml):**

```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
    
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
        
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Publish to NPM
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. Process Hanging After Tests

**Problem**: Tests don't exit cleanly.
**Solution**: Always include cleanup in afterAll hooks.

#### 2. Authentication Token Expiry

**Problem**: Tests fail due to expired tokens.
**Solution**: Implement token refresh mechanism.

#### 3. Network Timeouts

**Problem**: Tests fail with timeout errors.
**Solution**: Adjust timeout settings per service.

#### 4. Multi-Instance Memory Leaks

**Problem**: Memory usage grows with multiple instances.
**Solution**: Proper cleanup and instance management.

#### 5. TypeScript Compilation Issues

**Problem**: TypeScript errors during build.
**Solution**: Ensure proper tsconfig.json configuration.

### Debug Mode

Enable comprehensive logging:

```typescript
const restified = new RestifiedTS({
  logging: {
    level: 'debug',
    console: true,
    auditEnabled: true,
    auditPath: './logs/debug.log'
  }
});
```

### Performance Monitoring

```typescript
// Monitor resource usage
process.on('exit', () => {
  const memUsage = process.memoryUsage();
  console.log('Memory Usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
  });
});
```

---

**RestifiedTS** - Complete API Testing Solution 🚀

*This guide covers everything you need to master RestifiedTS for professional API automation testing.*
