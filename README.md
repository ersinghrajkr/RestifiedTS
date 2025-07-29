# 🚀 RestifiedTS – Modern API Testing Framework

[![npm version](https://badge.fury.io/js/restifiedts.svg)](https://badge.fury.io/js/restifiedts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

**RestifiedTS** is a production-grade API testing framework built in TypeScript, inspired by Java's RestAssured. Test REST APIs, GraphQL endpoints, and WebSocket connections with a fluent DSL, comprehensive features, and extensive reporting capabilities.

> **🎉 NEW in v1.2.5:** **Zero-Configuration Mochawesome Integration!** RestifiedTS now automatically detects Mocha environments and attaches HTTP request/response data to test reports without any setup required!

## ✨ Key Features

✅ **Fluent DSL** - Clean `given().when().then()` syntax
✅ **TypeScript First** - Full type safety and IntelliSense support
✅ **Multi-Protocol** - REST, GraphQL, and WebSocket testing
✅ **Database Integration** - Test API with database state validation
✅ **Performance Testing** - Artillery integration for load testing
✅ **Security Testing** - OWASP ZAP integration for vulnerability scanning
✅ **Test Orchestration** - Unified API + Performance + Security testing
✅ **Multi-Client Architecture** - Test multiple services in one suite
✅ **Variable Resolution** - Dynamic payloads with Faker.js integration
✅ **Authentication Support** - Bearer, Basic, API Key, OAuth2
✅ **Advanced Schema Validation** - Joi, Zod, AJV multi-validator support
✅ **Zero-Config Mochawesome Integration** - Automatic request/response context attachment
✅ **Comprehensive Test Analytics** - Performance metrics, error tracking, and execution flow
✅ **CLI Tools** - Generate advanced test templates and project scaffolding

## 🚀 Quick Start

### Installation

```bash
npm install restifiedts
npm install --save-dev mocha chai @types/mocha @types/chai @types/node typescript ts-node

# Optional: For enhanced HTML reports with automatic context attachment
npm install --save-dev mochawesome mochawesome-report-generator mochawesome-merge
```

### Your First Test

Create `tests/my-first-test.ts`:

```typescript
import { restified } from 'restifiedts';
import { expect } from 'chai';

describe('My First API Test', function() {
  // Essential: Always include cleanup to prevent hanging processes
  afterAll(async function() {
    await restified.cleanup();
  });

  it('should test a simple GET request', async function() {
    this.timeout(10000);
  
    // Step 1: Execute the HTTP request
    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
      .when()
        .get('/posts/1')
        .execute(); // First execute() - sends the request
  
    // Step 2: Perform assertions on the response
    await response
      .statusCode(200)
      .jsonPath('$.userId', 1)
      .jsonPath('$.title').isString()
      .execute(); // Second execute() - runs assertions
  
    // Step 3: Additional custom assertions (optional)
    expect(response.response.data.title).to.be.a('string');
  });
});
```

### Run Your Tests

Add comprehensive test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "npm run test:clean && npm run test:all:json && npm run test:merge:all",
    "test:unit": "npm run test:clean && npm run test:unit:json && npm run test:merge:unit",
    "test:integration": "npm run test:clean && npm run test:integration:json && npm run test:merge:integration",
    "test:smoke": "npm run test:clean && npm run test:smoke:json && npm run test:merge:smoke",
    "test:regression": "npm run test:clean && npm run test:regression:json && npm run test:merge:regression",
    "test:comprehensive": "npm run test:systems && npm run test:unit && npm run test:integration && npm run test:smoke && npm run test:regression && npm run test:merge:comprehensive",
    "test:coverage": "nyc npm run test:all:json",
    "test:clean": "rimraf output && mkdirp output/reports && mkdirp output/snapshots && mkdirp output/temp && mkdirp output/logs"
  }
}
```

### Enhanced Reporting Commands

RestifiedTS includes comprehensive reporting with request/response logging:

```bash
# Run all tests with comprehensive reporting
npm test

# Run specific test types
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:smoke        # Smoke tests (@smoke tagged)
npm run test:regression   # Regression tests (@regression tagged)

# Run comprehensive test suite (all test types)
npm run test:comprehensive

# Run with coverage reporting
npm run test:coverage

# Generate standalone reports
npm run report:html       # Generate HTML reports from existing JSON
```

### 📊 Enhanced Test Reports

RestifiedTS automatically captures and includes in Mochawesome reports:
- ✅ **Request Payloads** - Full HTTP request details
- ✅ **Response Payloads** - Complete response data
- ✅ **Error Stack Traces** - Detailed error information
- ✅ **Performance Metrics** - Response times and payload sizes
- ✅ **Variable Resolution** - Template variable substitutions
- ✅ **Test Execution Flow** - Complete test lifecycle tracking

Reports are generated in `output/reports/` with interactive HTML views.

### 🔧 Automatic Mochawesome Integration

**🎉 NEW:** RestifiedTS now automatically detects Mocha environments and integrates with Mochawesome **without any configuration**!

**✅ Zero Configuration Required**
Simply use RestifiedTS in your tests and run with Mochawesome reporter:

```bash
npx mocha tests/**/*.ts --reporter mochawesome --reporter-options addContext=true
```

**✅ Automatic Context Attachment**
Every HTTP request made through RestifiedTS automatically attaches:
- 🔍 **HTTP Request Details** - Method, URL, headers, body, timestamp
- ✅ **HTTP Response Details** - Status, headers, data, response time, timestamp  
- ❌ **Error Details** - Stack traces and error context (when applicable)

**✅ Works Out of the Box**
```json
{
  "scripts": {
    "test": "mocha 'tests/**/*.ts' --reporter mochawesome --reporter-options addContext=true",
    "test:html": "mocha 'tests/**/*.ts' --reporter mochawesome --reporter-options reportDir=reports,reportFilename=test-report,html=true"
  }
}
```

**✅ Rich HTML Reports**
Reports are automatically generated with:
- Interactive test result views
- Expandable request/response details
- Performance metrics and timing information
- Error context and stack traces
- Test execution flow tracking

**📋 Example Context Data**
Each test automatically includes detailed context like:

```typescript
// Your test code
const response = await restified
  .given()
    .baseURL('https://api.example.com')
    .bearerToken('your-token')
    .body({ name: 'John Doe' })
  .when()
    .post('/users')
    .execute();
```

**Automatically generates in Mochawesome report:**
- 🔍 **HTTP Request Details**
  - Method: POST
  - URL: https://api.example.com/users
  - Headers: Authorization, Content-Type
  - Body: { name: 'John Doe' }
  - Timestamp: 2025-01-29T10:30:15.123Z

- ✅ **HTTP Response Details**
  - Status: 201 Created
  - Headers: Content-Type, Location
  - Data: { id: 123, name: 'John Doe' }
  - Response Time: 245ms
  - Timestamp: 2025-01-29T10:30:15.368Z

**🔧 Troubleshooting**
If you don't see request/response data in your reports:
1. Ensure you're using the `mochawesome` reporter
2. Add `--reporter-options addContext=true` to your mocha command
3. Verify your tests are making HTTP requests through RestifiedTS DSL
4. Check that tests are completing successfully (context attaches even to failed tests)

### 🛡️ Corporate Proxy Support

RestifiedTS automatically handles corporate proxies and firewalls:

**Automatic Environment Variable Detection:**
```bash
# Set these environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,*.company.com

# With authentication
export HTTP_PROXY=http://username:password@proxy.company.com:8080
```

**Manual Proxy Configuration:**
```typescript
import { restified } from 'restifiedts';

// Configure proxy globally
restified.updateConfig({
  proxy: {
    host: 'proxy.company.com',
    port: 8080,
    protocol: 'http',
    username: 'your-username',
    password: 'your-password'
  }
});

// Now all requests will use the proxy automatically
const response = await restified
  .given()
  .when()
    .get('/api/data')
    .execute();
```

**Per-Request Proxy:**
```typescript
const response = await restified
  .given()
    .proxy({
      host: 'proxy.company.com',
      port: 8080,
      protocol: 'http'
    })
  .when()
    .get('/api/data')
    .execute();
```

See [Proxy Troubleshooting Guide](./docs/troubleshooting/PROXY-TROUBLESHOOTING.md) for detailed troubleshooting guide.

## 🔑 Essential Concepts

### 1. Double Execute Pattern ⚠️

RestifiedTS requires **two** `.execute()` calls:

```typescript
// ✅ CORRECT
const response = await restified
  .given().baseURL('https://api.example.com')
  .when().get('/users').execute(); // First execute() - sends request

await response
  .statusCode(200)
  .execute(); // Second execute() - runs assertions
```

### 2. Use Regular Functions (Not Arrow Functions) ⚠️

```typescript
// ✅ CORRECT: Use regular functions for Mocha compatibility
describe('API Tests', function() {
  it('should work correctly', async function() {
    this.timeout(5000); // This works with regular functions
  });
});
```

### 3. Always Include Cleanup ⚠️

```typescript
describe('Your Test Suite', function() {
  // This is MANDATORY to prevent hanging processes
  afterAll(async function() {
    await restified.cleanup();
  });
});
```

## 🌟 NEW: Comprehensive Features Demo (v1.2.0)

RestifiedTS v1.2.0 includes a complete comprehensive test that demonstrates **ALL** framework features in a single, production-ready example:

```bash
# Generate the comprehensive features demo
npx restifiedts generate --type comprehensive --name my-comprehensive-demo

# Or explore the built-in comprehensive test
npm test -- --grep "comprehensive"
```

**Features Demonstrated:**
- ✅ **Configuration Management** - JSON, .env, and runtime configuration
- ✅ **Authentication Flow** - Complete login → token → refresh workflow  
- ✅ **Variable Templating** - All built-in functions ($faker, $date, $math, $string, $random, $env)
- ✅ **Multiple Client Management** - mainAPI, authService, paymentGateway, externalAPI
- ✅ **Performance Testing** - 10 concurrent requests with metrics
- ✅ **Security Testing** - Authentication validation and input sanitization
- ✅ **Database Integration** - Setup/teardown/validation patterns
- ✅ **GraphQL & WebSocket** - Complete testing workflows
- ✅ **Snapshot Testing** - Response comparison and validation
- ✅ **Report Generation** - HTML/JSON reports with metadata
- ✅ **Error Handling** - Retries, fallbacks, and recovery patterns
- ✅ **Logging & Audit** - Complete request/response/error logging

This comprehensive demo serves as both a **complete feature showcase** and a **learning resource** for production implementation patterns.

## 📚 Complete Examples

### CRUD Operations

```typescript
describe('User API CRUD Tests', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  it('should create a new user', async function() {
    this.timeout(10000);
  
    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
        .body({
          name: 'John Doe',
          username: 'johndoe',
          email: 'john@example.com'
        })
      .when()
        .post('/users')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.name', 'John Doe')
      .extract('$.id', 'userId')
      .execute();
  
    console.log('Created user ID:', restified.getVariable('userId'));
  });
});
```

### Authentication & Variables

```typescript
describe('Authentication Tests', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  it('should authenticate and use token', async function() {
    this.timeout(10000);
  
    // Login and get token
    const loginResponse = await restified
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .body({
          username: 'testuser',
          password: 'testpass'
        })
      .when()
        .post('/auth/login')
        .execute();

    await loginResponse
      .statusCode(200)
      .extract('$.token', 'authToken')
      .execute();

    // Use token for protected endpoint
    const profileResponse = await restified
      .given()
        .baseURL('https://api.example.com')
        .bearerToken('{{authToken}}') // Use extracted token
      .when()
        .get('/profile')
        .execute();

    await profileResponse
      .statusCode(200)
      .execute();
  });
});
```

### Multi-Service Testing

```typescript
describe('Multi-Service Integration', function() {
  beforeAll(function() {
    // Create multiple clients for different services
    restified.createClient('authService', {
      baseURL: 'https://auth.example.com',
      timeout: 5000
    });

    restified.createClient('userService', {
      baseURL: 'https://users.example.com',
      timeout: 10000
    });
  });

  afterAll(async function() {
    await restified.cleanup();
  });

  it('should orchestrate multi-service workflow', async function() {
    this.timeout(30000);
  
    // Step 1: Authenticate with auth service
    const authResponse = await restified
      .given()
        .useClient('authService')
        .body({ username: 'testuser', password: 'testpass' })
      .when()
        .post('/login')
        .execute();

    await authResponse
      .statusCode(200)
      .extract('$.token', 'authToken')
      .execute();

    // Step 2: Create user with user service
    const userResponse = await restified
      .given()
        .useClient('userService')
        .bearerToken('{{authToken}}')
        .body({ name: 'Test User', email: 'test@example.com' })
      .when()
        .post('/users')
        .execute();

    await userResponse
      .statusCode(201)
      .execute();
  });
});
```

### Dynamic Data with Faker.js

```typescript
it('should create user with dynamic data', async function() {
  this.timeout(10000);
  
  const response = await restified
    .given()
      .baseURL('https://jsonplaceholder.typicode.com')
      .header('Content-Type', 'application/json')
      .body({
        id: '{{$random.uuid}}',
        name: '{{$faker.person.fullName}}',
        email: '{{$faker.internet.email}}',
        phone: '{{$faker.phone.number}}',
        createdAt: '{{$date.now}}',
        score: '{{$math.random(1,100)}}'
      })
    .when()
      .post('/users')
      .execute();

  await response
    .statusCode(201)
    .jsonPath('$.name').isString()
    .jsonPath('$.email').contains('@')
    .execute();
});
```

## 🛠️ CLI Tools & Project Management

### Initialize a New RestifiedTS Project

```bash
# Initialize RestifiedTS in current directory
npx restifiedts init

# Initialize with force overwrite
npx restifiedts init --force
```

### Generate Test Files

The CLI supports these test types:

```bash
# Basic API test
npx restifiedts generate --type api --name UserAPI

# Authentication test
npx restifiedts generate --type auth --name LoginAuth

# Multi-client integration test
npx restifiedts generate --type multi-client --name ServiceIntegration

# Database integration test
npx restifiedts generate --type database --name UserDatabase

# Performance test
npx restifiedts generate --type performance --name LoadTest

# GraphQL test
npx restifiedts generate --type graphql --name GraphQLQueries

# WebSocket test
npx restifiedts generate --type websocket --name RealtimeEvents

# Security test
npx restifiedts generate --type security --name SecurityScan

# Comprehensive test (all features)
npx restifiedts generate --type comprehensive --name FullStackTest

# Schema validation test
npx restifiedts generate --type validation --name SchemaValidation

# Unified test (API + Performance + Security)
npx restifiedts generate --type unified --name UnifiedTest
```

### Advanced CLI Options

```bash
# Specify output directory
npx restifiedts generate --type api --name UserAPI --output tests/api

# Set base URL
npx restifiedts generate --type api --name UserAPI --baseURL https://api.example.com

# Generate complete test suite
npx restifiedts generate --type api --name UserAPI --suite

# Scaffold complete service test suite
npx restifiedts scaffold --service UserService --baseURL https://api.example.com
npx restifiedts scaffold --service UserService --include-graphql --include-websocket
```

## ⚙️ Configuration Guide

RestifiedTS provides multiple ways to configure your API testing setup. Choose the method that best fits your workflow:

### 1. Environment Variables (Recommended for CI/CD)

Create a `.env` file in your project root:

```bash
# Main API Configuration
NODE_ENV=development
API_BASE_URL=https://api.example.com
API_KEY=your-api-key-here
API_TIMEOUT=30000

# Authentication
AUTH_TOKEN=bearer-token-here
REFRESH_TOKEN=refresh-token-here

# Third-party Services
PAYMENT_API_URL=https://payments.example.com
PAYMENT_API_KEY=payment-api-key-123
NOTIFICATION_API_URL=https://notifications.example.com

# Output Configuration (optional - uses defaults if not set)
REPORTS_DIR=output/reports
SNAPSHOTS_DIR=output/snapshots
LOGS_DIR=output/logs
```

**Usage in tests:**
```typescript
describe('API Tests with Environment Config', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  it('should use environment variables', async function() {
    this.timeout(10000);
    
    const response = await restified
      .given()
        .baseURL(process.env.API_BASE_URL || 'https://api.example.com')
        .header('Authorization', `Bearer ${process.env.AUTH_TOKEN}`)
        .header('X-API-Key', process.env.API_KEY)
      .when()
        .get('/users')
        .execute();

    await response
      .statusCode(200)
      .execute();
  });
});
```

### 2. Configuration Files

Create a `config/` directory with environment-specific files:

**config/default.json** (Base settings)
```json
{
  "baseURL": "https://api.example.com",
  "timeout": 30000,
  "reporting": {
    "directory": "output/reports",
    "formats": ["html", "json"]
  },
  "snapshots": {
    "directory": "output/snapshots",
    "enabled": true
  },
  "services": {
    "payment": {
      "baseURL": "https://payments.example.com",
      "timeout": 15000
    },
    "notification": {
      "baseURL": "https://notifications.example.com",
      "timeout": 10000
    }
  }
}
```

**config/development.json** (Development overrides)
```json
{
  "baseURL": "https://dev-api.example.com",
  "logging": {
    "level": "debug",
    "console": true
  },
  "services": {
    "payment": {
      "baseURL": "https://dev-payments.example.com"
    }
  }
}
```

**Usage with config files:**
```typescript
import config from '../config/default.json';

describe('Config File Tests', function() {
  beforeAll(function() {
    // Set up multiple clients from config
    restified.createClient('main', {
      baseURL: config.baseURL,
      timeout: config.timeout
    });

    restified.createClient('payment', {
      baseURL: config.services.payment.baseURL,
      timeout: config.services.payment.timeout
    });
  });

  afterAll(async function() {
    await restified.cleanup();
  });

  it('should use main API', async function() {
    const response = await restified
      .given()
        .useClient('main')
        .bearerToken(process.env.AUTH_TOKEN)
      .when()
        .get('/users')
        .execute();

    await response.statusCode(200).execute();
  });

  it('should use payment API', async function() {
    const response = await restified
      .given()
        .useClient('payment')
        .bearerToken(process.env.PAYMENT_TOKEN)
      .when()
        .get('/balance')
        .execute();

    await response.statusCode(200).execute();
  });
});
```

### 3. Global Test Setup (Best Practice)

Create a setup file for consistent configuration:

**tests/setup/global-setup.ts**
```typescript
import { restified } from 'restifiedts';

export class TestSetup {
  static async configure() {
    // Main API configuration
    restified.configure({
      baseURL: process.env.API_BASE_URL || 'https://api.example.com',
      timeout: parseInt(process.env.API_TIMEOUT || '30000'),
      headers: {
        'User-Agent': 'RestifiedTS-TestSuite/1.0'
      },
      reporting: {
        directory: process.env.REPORTS_DIR || 'output/reports'
      }
    });

    // Set up multiple service clients
    restified.createClient('auth', {
      baseURL: process.env.AUTH_API_URL || 'https://auth.example.com',
      timeout: 10000
    });

    restified.createClient('payment', {
      baseURL: process.env.PAYMENT_API_URL || 'https://payments.example.com',
      timeout: 15000,
      headers: {
        'X-API-Key': process.env.PAYMENT_API_KEY
      }
    });

    // Authenticate once for all tests
    if (process.env.AUTH_TOKEN) {
      restified.setGlobalVariable('authToken', process.env.AUTH_TOKEN);
    } else {
      await this.authenticate();
    }
  }

  private static async authenticate() {
    const authResponse = await restified
      .given()
        .useClient('auth')
        .body({
          username: process.env.AUTH_USERNAME || 'testuser',
          password: process.env.AUTH_PASSWORD || 'testpass'
        })
      .when()
        .post('/login')
        .execute();

    await authResponse
      .statusCode(200)
      .extract('$.token', 'authToken')
      .execute();
  }
}
```

**Usage in test files:**
```typescript
import { TestSetup } from '../setup/global-setup';

describe('User API Tests', function() {
  beforeAll(async function() {
    await TestSetup.configure();
  });

  afterAll(async function() {
    await restified.cleanup();
  });

  it('should create user and process payment', async function() {
    this.timeout(15000);

    // Create user with main API
    const userResponse = await restified
      .given()
        .bearerToken('{{authToken}}') // From global setup
        .body({
          name: 'Test User',
          email: 'test@example.com'
        })
      .when()
        .post('/users')
        .execute();

    await userResponse
      .statusCode(201)
      .extract('$.id', 'userId')
      .execute();

    // Process payment with payment API
    const paymentResponse = await restified
      .given()
        .useClient('payment')
        .bearerToken('{{authToken}}')
        .body({
          userId: '{{userId}}',
          amount: 99.99,
          currency: 'USD'
        })
      .when()
        .post('/charges')
        .execute();

    await paymentResponse
      .statusCode(200)
      .jsonPath('$.status', 'completed')
      .execute();
  });
});
```

### 4. CLI Configuration

Generate configuration files automatically:

```bash
# Initialize project with config setup
npx restifiedts init

# Generate environment-specific configs
npx restifiedts config --env development
npx restifiedts config --env production

# Generate tests with specific configuration
npx restifiedts generate --type api --name UserAPI --baseURL https://api.example.com
```

### 5. Different Environments

**package.json scripts for different environments:**
```json
{
  "scripts": {
    "test": "NODE_ENV=development npm run test:run",
    "test:dev": "NODE_ENV=development npm run test:run",
    "test:staging": "NODE_ENV=staging npm run test:run",
    "test:prod": "NODE_ENV=production npm run test:run",
    "test:run": "mocha --require ts-node/register 'tests/**/*.ts'"
  }
}
```

**Environment-specific .env files:**
- `.env.development`
- `.env.staging` 
- `.env.production`

### 6. Security Best Practices

✅ **Never commit secrets to version control**
```bash
# .gitignore
.env
.env.*
!.env.example
config/secrets.json
```

✅ **Use environment variables for sensitive data**
```typescript
// ✅ Good
.bearerToken(process.env.AUTH_TOKEN)

// ❌ Bad - hardcoded secrets
.bearerToken('hardcoded-token-123')
```

✅ **Provide example files**
```bash
# .env.example
API_BASE_URL=https://api.example.com
API_KEY=your-api-key-here
AUTH_TOKEN=your-auth-token-here
```

## 📖 Complete Documentation

### 📚 **Comprehensive Guides**

- 📄 [**Complete RestifiedTS Guide**](./docs/guides/RESTIFIEDTS-GUIDE.md) - Full framework documentation
- ⚙️ [**Configuration Guide**](./docs/guides/CONFIGURATION-GUIDE.md) - Environment configs, multi-instance setup
- 🔧 [**TypeScript Guide**](./docs/guides/TYPESCRIPT-GUIDE.md) - Enhanced IntelliSense and type safety

### 🛠️ **Troubleshooting & Support**

- 🔍 [**Proxy Troubleshooting**](./docs/troubleshooting/PROXY-TROUBLESHOOTING.md) - Corporate firewall and proxy issues

### 👥 **Development & Contributing**

- 🤝 [**Contributing Guide**](./docs/development/CONTRIBUTING.md) - How to contribute to RestifiedTS

The complete guide covers:

- 🔐 **Authentication & Token Management** - Bearer, OAuth2, refresh tokens
- 🏗️ **Multi-Instance Architecture** - Service-oriented testing, runtime instances
- 🔧 **Advanced Features** - Performance testing, schema validation, custom assertions
- 📦 **Publishing to NPM** - Complete publishing workflow
- 🐛 **Common Issues** - Troubleshooting guide with solutions

## 🎯 Generated Test Templates

The CLI generates modern test templates with:

- ✅ Proper double execute pattern
- ✅ Regular functions (Mocha compatible)
- ✅ Essential cleanup patterns
- ✅ Authentication handling
- ✅ Variable resolution
- ✅ Error handling
- ✅ Performance assertions

## ⚡ Quick Examples

### REST API Testing

```typescript
const response = await restified
  .given().baseURL('https://api.example.com').bearerToken('token')
  .when().get('/users').execute();
await response.statusCode(200).execute();
```

### GraphQL Testing

```typescript
const response = await restified
  .given().baseURL('https://api.example.com')
  .when().graphql('query { users { id name } }').post('/graphql').execute();
await response.statusCode(200).execute();
```

### WebSocket Testing

```typescript
restified.addWebSocketConnection({ name: 'chat', url: 'wss://echo.websocket.org' });
await restified.connectWebSocket('chat');
await restified.sendWebSocketText('Hello!', 'chat');
```

## 🚀 Advanced Features

### Database Integration Testing

Test APIs with database state management and validation:

```typescript
import { restified, DatabaseManager } from 'restifiedts';

describe('User API with Database Tests', function() {
  const dbManager = new DatabaseManager();
  
  beforeAll(async function() {
    // Connect to test database
    await dbManager.connect({
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_pass'
    });
  });

  afterAll(async function() {
    await dbManager.disconnect();
    await restified.cleanup();
  });

  it('should create user and verify database state', async function() {
    // Seed test data
    await dbManager.execute(
      'INSERT INTO users (email, name) VALUES ($1, $2)',
      ['existing@example.com', 'Existing User']
    );

    // Create user via API
    const response = await restified
      .given()
        .baseURL('https://api.example.com')
        .body({ email: 'new@example.com', name: 'New User' })
      .when()
        .post('/users')
        .execute();

    await response.statusCode(201).execute();

    // Verify database state
    const users = await dbManager.query(
      'SELECT * FROM users WHERE email = $1',
      ['new@example.com']
    );
    
    expect(users.rows).to.have.length(1);
    expect(users.rows[0].name).to.equal('New User');
  });
});
```

### Performance Testing with Artillery

Load test your APIs with built-in Artillery integration:

```typescript
import { ArtilleryIntegration } from 'restifiedts';

describe('API Performance Tests', function() {
  const artillery = new ArtilleryIntegration();

  it('should handle load testing scenarios', async function() {
    this.timeout(120000); // 2 minutes for load test

    const config = {
      target: 'https://api.example.com',
      phases: [
        { duration: 30, arrivalRate: 1, name: 'warmup' },
        { duration: 60, arrivalRate: 10, name: 'rampup' },
        { duration: 30, arrivalRate: 20, name: 'sustained' }
      ],
      scenarios: [{
        name: 'Get Users',
        requests: [
          { url: '/users', method: 'GET' },
          { url: '/users/{{userId}}', method: 'GET' }
        ]
      }]
    };

    const testId = await artillery.runLoadTest(config);
    const report = await artillery.generatePerformanceReport(testId);
    
    // Performance assertions
    expect(report.performance.responseTime.median).to.be.below(500);
    expect(report.performance.errorRate).to.be.below(1);
    expect(report.grade).to.match(/A|B/); // Expect A or B grade
  });
});
```

### Security Testing with OWASP ZAP

Automated security vulnerability scanning:

```typescript
import { ZapIntegration } from 'restifiedts';

describe('API Security Tests', function() {
  const zap = new ZapIntegration({
    zapApiUrl: 'http://localhost:8080',
    targetUrl: 'https://api.example.com'
  });

  beforeAll(async function() {
    // Ensure ZAP daemon is running
    await zap.checkZapStatus();
  });

  it('should perform security vulnerability scan', async function() {
    this.timeout(300000); // 5 minutes for security scan

    // Start spider scan
    const spiderId = await zap.startSpider('https://api.example.com');
    await zap.waitForSpiderCompletion(spiderId);

    // Start active security scan
    const scanId = await zap.startActiveScan('https://api.example.com');
    await zap.waitForScanCompletion(scanId);

    // Generate security report
    const report = await zap.generateSecurityReport(scanId);
    
    // Security assertions
    expect(report.summary.highRisk).to.equal(0);
    expect(report.summary.mediumRisk).to.be.below(3);
    expect(report.vulnerabilities).to.not.deep.include.members([
      { type: 'SQL Injection', risk: 'High' },
      { type: 'XSS', risk: 'High' }
    ]);
  });
});
```

### Unified Test Orchestration

Coordinate API, performance, and security testing in one workflow:

```typescript
import { UnifiedTestOrchestrator } from 'restifiedts';

describe('Complete API Testing Workflow', function() {
  const orchestrator = new UnifiedTestOrchestrator();

  it('should run comprehensive test suite', async function() {
    this.timeout(600000); // 10 minutes for full suite

    const config = {
      target: 'https://api.example.com',
      tests: {
        api: {
          endpoints: ['/users', '/orders', '/payments'],
          authentication: { type: 'bearer', token: 'test-token' }
        },
        performance: {
          phases: [{ duration: 60, arrivalRate: 10 }],
          thresholds: { responseTime: 1000, errorRate: 1 }
        },
        security: {
          zapConfig: { host: 'localhost', port: 8080 },
          policies: ['owasp-top-10', 'api-security']
        }
      }
    };

    const results = await orchestrator.runUnifiedTests(config);
    
    // Unified assertions
    expect(results.api.passed).to.be.true;
    expect(results.performance.grade).to.match(/A|B/);
    expect(results.security.highRiskCount).to.equal(0);
    expect(results.overall.score).to.be.above(85); // Overall quality score
  });
});
```

### Advanced Schema Validation

Multi-validator schema validation with performance benchmarking:

```typescript
import { SchemaValidationManager } from 'restifiedts';

describe('API Schema Validation Tests', function() {
  const validator = new SchemaValidationManager();

  it('should validate with multiple schema libraries', async function() {
    const userSchema = {
      joi: Joi.object({
        id: Joi.number().required(),
        email: Joi.string().email().required(),
        name: Joi.string().min(2).required()
      }),
      zod: z.object({
        id: z.number(),
        email: z.string().email(),
        name: z.string().min(2)
      }),
      ajv: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string', minLength: 2 }
        },
        required: ['id', 'email', 'name']
      }
    };

    const response = await restified
      .given().baseURL('https://api.example.com')
      .when().get('/users/1').execute();

    // Validate with multiple validators
    const results = await validator.validateMultiple(
      response.response.data,
      userSchema
    );

    expect(results.joi.valid).to.be.true;
    expect(results.zod.valid).to.be.true;
    expect(results.ajv.valid).to.be.true;
    expect(results.performance.fastest).to.be.oneOf(['joi', 'zod', 'ajv']);
  });
});
```

### Enhanced Reporting

Generate comprehensive reports with custom formatting:

```typescript
import { ReportingManager } from 'restifiedts';

describe('API Tests with Enhanced Reporting', function() {
  const reporter = new ReportingManager({
    outputDir: './reports',
    formats: ['html', 'json', 'xml'],
    includeMetrics: true,
    customSections: ['performance', 'security', 'database']
  });

  afterAll(async function() {
    // Generate comprehensive test report
    await reporter.generateUnifiedReport({
      testResults: this.currentTest?.parent?.tests,
      performanceData: artillery.getMetrics(),
      securityFindings: zap.getFindings(),
      databaseQueries: dbManager.getQueryLog()
    });
    
    await restified.cleanup();
  });

  it('should generate detailed test reports', async function() {
    const response = await restified
      .given().baseURL('https://api.example.com')
      .when().get('/users').execute();

    await response
      .statusCode(200)
      .responseTime(1000)
      .jsonPath('$[0].id').isNumber()
      .execute();

    // Custom report data
    reporter.addCustomData('endpoint_coverage', {
      '/users': { tested: true, methods: ['GET'] },
      '/orders': { tested: false, methods: ['GET', 'POST'] }
    });
  });
});
```

### CLI Test Generation

Generate tests for advanced features:

```bash
# Generate database integration test
npx restifiedts generate --type database --name UserDatabase --baseURL https://api.example.com

# Generate performance test with Artillery
npx restifiedts generate --type performance --name LoadTest --baseURL https://api.example.com

# Generate security test with ZAP
npx restifiedts generate --type security --name SecurityScan --baseURL https://api.example.com

# Generate unified orchestration test
npx restifiedts generate --type unified --name ComprehensiveTest --baseURL https://api.example.com --suite

# Generate schema validation test
npx restifiedts generate --type validation --name SchemaTest --baseURL https://api.example.com
```

## 🐛 Troubleshooting

### Common Issues

**Tests hang after completion?** ➜ Add `await restified.cleanup()` in `afterAll()`
**DSL chaining errors?** ➜ Use double execute pattern
**Arrow function errors?** ➜ Use regular functions: `function() {}`
**Variable not resolving?** ➜ Use `{{$faker.person.fullName}}` (v8+ syntax)

### Debug Mode

```typescript
const restified = new RestifiedTS({
  logging: { level: 'debug', console: true }
});
```

## 💰 Looking for Funding

RestifiedTS is an open-source project that requires ongoing development and maintenance. We're looking for sponsors and funding to:

- 🚀 **Accelerate Development** - Add new features and protocol support
- 🐛 **Improve Quality** - Enhanced testing, bug fixes, and stability
- 📚 **Better Documentation** - More examples, tutorials, and guides
- 🔧 **Professional Support** - Dedicated support for enterprise users
- 🌟 **Community Growth** - Workshops, conferences, and ecosystem development

### Ways to Support

- ⭐ **Star the Repository** - Show your support and help us grow
- 💖 **Support via Razorpay** - [https://razorpay.me/@singhrajkr](https://razorpay.me/@singhrajkr)
- 🏢 **Enterprise Support** - Contact us for commercial licensing and support
- 🤝 **Partnership** - Collaborate on features or integrations
- 📢 **Spread the Word** - Share RestifiedTS with your network

**Contact**: For funding discussions and partnership opportunities, reach out to me at [er.singhrajkr@gmail.com](mailto:er.singhrajkr@gmail.com)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- 📚 [**Complete Guide**](./RESTIFIEDTS-GUIDE.md) - Comprehensive documentation
- 🐛 [**Issues**](https://github.com/ersinghrajkr/RestifiedTS/issues) - Report bugs
- 💡 [**Discussions**](https://github.com/ersinghrajkr/RestifiedTS/discussions) - Ask questions

---

**RestifiedTS** - Modern API testing for the TypeScript era 🚀

*Made with ❤️ by Raj Kumar*
