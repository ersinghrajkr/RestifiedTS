# 🚀 RestifiedTS – Modern API Testing Framework

[![npm version](https://badge.fury.io/js/restifiedts.svg)](https://badge.fury.io/js/restifiedts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

**RestifiedTS** is a production-grade API testing framework built in TypeScript, inspired by Java's RestAssured. Test REST APIs, GraphQL endpoints, and WebSocket connections with a fluent DSL, comprehensive features, and extensive reporting capabilities.

> **🎉 NEW in v1.3.0:** **Playwright-Style Configuration + K6 TypeScript Integration!** RestifiedTS now includes advanced configuration management similar to Playwright and native K6 TypeScript performance testing - the most comprehensive API testing solution!

## ✨ Key Features

### 🔧 **NEW: Playwright-Style Configuration**
✅ **`restified.config.ts`** - Centralized configuration like Playwright  
✅ **Multi-Project Support** - Test multiple services with different configs  
✅ **Environment-Aware** - Automatic CI/local settings detection  
✅ **Interactive Setup** - `restifiedts config-init` command  

### 🚀 **NEW: K6 TypeScript Performance Testing**
✅ **Native TypeScript Support** - Generate typed K6 scripts from RestifiedTS tests  
✅ **Unified Performance Engine** - Auto-select K6 or Artillery based on availability  
✅ **Faker Integration** - Realistic test data generation similar to xk6-faker  
✅ **Multi-Locale Support** - International testing with 50+ locales  
✅ **Modern Load Testing** - Smoke, Load, Stress, Spike, Soak scenarios  
✅ **Zero Configuration** - Direct `.ts` file execution with K6 v0.52+  

### 🎯 **Core Framework Features**
✅ **Fluent DSL** - Clean `given().when().then()` syntax  
✅ **TypeScript First** - Full type safety and IntelliSense support  
✅ **Multi-Protocol** - REST, GraphQL, and WebSocket testing  
✅ **Database Integration** - Test API with database state validation  
✅ **Dual Performance Engines** - K6 TypeScript + Artillery integration  
✅ **Security Testing** - OWASP ZAP integration for vulnerability scanning  
✅ **Test Orchestration** - Unified API + Performance + Security testing  
✅ **Multi-Client Architecture** - Test multiple services in one suite  
✅ **Variable Resolution** - Dynamic payloads with Faker.js integration  
✅ **Authentication Support** - Bearer, Basic, API Key, OAuth2  
✅ **Advanced Schema Validation** - Joi, Zod, AJV multi-validator support  
✅ **Zero-Config Mochawesome Integration** - Automatic request/response context attachment  
✅ **Comprehensive Test Analytics** - Performance metrics, error tracking, and execution flow  

### 🛠️ **Advanced Tooling**
✅ **Enhanced CLI Tools** - 13+ test template generators and project scaffolding  
✅ **Enterprise Features** - Multi-service, multi-role testing with parallel execution  
✅ **Role-Based Testing** - Define user roles with permissions for comprehensive access control testing  
✅ **Endpoint Discovery** - Auto-discover endpoints from OpenAPI/Swagger specifications  
✅ **Batch Test Orchestration** - Execute thousands of tests across services and roles in parallel  
✅ **Parallel Test Execution** - Configure folder-based parallel/sequential test execution

## 🚀 Quick Start

### Installation

```bash
npm install restifiedts
npm install --save-dev mocha chai @types/mocha @types/chai @types/node typescript ts-node

# Optional: For enhanced HTML reports with automatic context attachment
npm install --save-dev mochawesome mochawesome-report-generator mochawesome-merge
```

## 🔧 **NEW: Playwright-Style Configuration**

RestifiedTS v1.3.0 introduces advanced configuration management similar to Playwright, making it perfect for modern development workflows.

### Generate Playwright-Style Config

```bash
# Interactive configuration generator
npx restifiedts config-init

# Generate specific config type
npx restifiedts config-init --type enterprise
```

### Create `restified.config.ts`

```typescript
import { defineConfig } from 'restifiedts';

export default defineConfig({
  // Test Discovery
  testDir: './tests',
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  
  // Execution Settings
  fullyParallel: true,
  workers: process.env.CI ? 4 : '50%',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  
  // Multiple Service Projects
  projects: [
    {
      name: 'user-service',
      baseURL: process.env.USER_SERVICE_URL || 'https://api.example.com/users',
      auth: { type: 'bearer', token: process.env.USER_TOKEN }
    },
    {
      name: 'auth-service',
      baseURL: process.env.AUTH_SERVICE_URL || 'https://auth.example.com',
      auth: { type: 'oauth2', clientId: process.env.AUTH_CLIENT_ID }
    }
  ],
  
  // Enterprise Features
  enterprise: {
    roles: ['admin', 'manager', 'user'],
    dataGeneration: true,
    performanceTracking: true
  },
  
  // Performance Testing with K6
  performance: {
    engine: 'k6', // or 'artillery' or 'auto'
    thresholds: {
      responseTime: 2000,
      errorRate: 0.01,
      throughput: 10
    }
  }
});
```

### Use Configuration-Aware Testing

```typescript
// Automatically loads restified.config.ts
const restified = await RestifiedTS.create();

// Switch between configured projects
restified.useClient('user-service');
restified.useClient('auth-service');

// Run performance tests with configured engine
const performanceEngine = new PerformanceEngine();
await performanceEngine.runPerformanceTest({
  name: 'Load Test',
  engine: 'auto', // Uses config or auto-detects K6/Artillery
  scenarios: { load: true }
});
```

## 🚀 **NEW: K6 TypeScript Performance Testing**

RestifiedTS now includes native K6 TypeScript support - the most advanced performance testing integration available.

### Auto-Generate K6 TypeScript Scripts

```typescript
import { K6Integration } from 'restifiedts';

const k6 = new K6Integration();

// Convert RestifiedTS test to typed K6 script
const k6Script = k6.convertRestifiedTestToK6TypeScript({
  name: 'User API Performance Test',
  baseUrl: 'https://api.example.com',
  endpoints: [
    { path: '/users', method: 'GET', expectedStatus: 200 },
    { path: '/users', method: 'POST', body: { name: 'Test User' } }
  ],
  authentication: {
    type: 'bearer',
    credentials: { username: 'admin', password: 'admin123' }
  }
});

// Run TypeScript K6 test (requires K6 v0.52+)
const testId = await k6.runK6Test(k6Script, {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 20 },
        { duration: '1m', target: 0 }
      ]
    }
  },
  thresholds: {
    http_req_duration: [{ threshold: 'p(95)<2000' }],
    http_req_failed: [{ threshold: 'rate<0.01' }]
  }
}, { useTypeScript: true });
```

### Unified Performance Engine

```typescript
// Auto-selects best available engine (K6 → Artillery)
const performanceEngine = new PerformanceEngine();

const testResult = await performanceEngine.runPerformanceTest({
  name: 'Multi-Engine Test',
  engine: 'auto', // K6 if available, Artillery fallback
  baseUrl: 'https://api.example.com',
  endpoints: [
    { path: '/users', method: 'GET' },
    { path: '/posts', method: 'GET' }
  ],
  scenarios: {
    smoke: true,  // Quick validation
    load: true,   // Normal load
    stress: true  // Beyond capacity
  },
  thresholds: {
    responseTime: 1000,
    errorRate: 0.005,
    throughput: 25
  }
});

// Get comprehensive performance analysis
const report = await performanceEngine.generateUnifiedReport(testResult);
console.log(`Performance Score: ${report.analysis.performanceScore}/100`);
console.log(`Bottlenecks: ${report.analysis.bottlenecks.join(', ')}`);
```

### K6 Features Available

✅ **Native TypeScript** - Direct `.ts` execution with `--compatibility-mode=experimental_enhanced`  
✅ **Modern ES6+** - Optional chaining, object spread, private fields  
✅ **Type Safety** - Interfaces, generics, and compile-time checking  
✅ **5 Test Scenarios** - Smoke, Load, Stress, Spike, Soak  
✅ **Advanced Metrics** - Custom counters, trends, rates with typing  
✅ **Cloud Ready** - Grafana Cloud K6 integration  
✅ **Zero Build Step** - No webpack, babel, or bundling required  

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

## 🛠️ Enhanced CLI Tools & Project Management

RestifiedTS CLI provides comprehensive project scaffolding and test generation with 12+ templates and advanced configuration management.

### New Project Generation

```bash
# 🆕 Generate complete RestifiedTS project with interactive setup
npx restifiedts new

# Choose from: Basic, Enterprise (multi-service), Microservices (large-scale)
# Includes: Package.json, TypeScript config, test structure, environment setup
```

### Configuration Management

```bash
# 🆕 Generate Playwright-style configuration
npx restifiedts config-init

# Generate specific configuration type
npx restifiedts config-init --type basic
npx restifiedts config-init --type enterprise  
npx restifiedts config-init --type microservices

# Specify output directory
npx restifiedts config-init --output ./custom-config
```

### Initialize Existing Project

```bash
# Initialize RestifiedTS in current directory
npx restifiedts init

# Initialize with force overwrite
npx restifiedts init --force
```

### Generate Test Files (12+ Templates)

The CLI supports these comprehensive test types:

```bash
# 🆕 Complete list of available templates
npx restifiedts templates

# Basic Templates
npx restifiedts generate --type api --name UserAPI
npx restifiedts generate --type crud --name UserCRUD
npx restifiedts generate --type auth --name LoginAuth

# Advanced Integration Templates  
npx restifiedts generate --type multi-client --name ServiceIntegration
npx restifiedts generate --type database --name UserDatabase
npx restifiedts generate --type graphql --name GraphQLQueries
npx restifiedts generate --type websocket --name RealtimeEvents

# Performance & Security Templates
npx restifiedts generate --type performance --name LoadTest
npx restifiedts generate --type security --name SecurityScan

# Enterprise Templates
npx restifiedts generate --type unified --name UnifiedTest
npx restifiedts generate --type validation --name SchemaValidation
npx restifiedts generate --type comprehensive --name FullStackTest
npx restifiedts generate --type setup --name GlobalSetup
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

## 🎭 Faker-Powered Performance Testing

**NEW:** RestifiedTS now includes comprehensive faker integration that **follows the exact same pattern as [xk6-faker](https://github.com/grafana/xk6-faker)**, but with native TypeScript support and no binary extension required!

### 🔥 **xk6-faker Compatible Pattern**

RestifiedTS generates K6 scripts that work **exactly like xk6-faker** by making `faker` globally available:

```typescript
// Generated by RestifiedTS (same as xk6-faker!)
import { faker } from '@faker-js/faker';
globalThis.faker = faker;

export default function() {
  // Use faker directly, just like xk6-faker
  const user = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email()
  };
  
  http.post('/api/users', JSON.stringify(user));
}
```

### 📊 **RestifiedTS vs xk6-faker Comparison**

| Feature | xk6-faker | RestifiedTS Faker |
|---------|-----------|-------------------|
| **Setup** | Requires binary compilation | ✅ Zero setup - npm install only |
| **TypeScript** | ❌ JavaScript only | ✅ Native TypeScript support |
| **Faker API** | ✅ Global faker object | ✅ Same global faker object |
| **Pre-built Scenarios** | ❌ Manual coding | ✅ E-commerce, Financial, Social templates |
| **CLI Generation** | ❌ None | ✅ `restifiedts faker-test` command |
| **Data Types** | ✅ Basic faker | ✅ Extended with 6 specialized types |
| **User Journeys** | ❌ Manual | ✅ Multi-step journey generation |
| **Integration** | K6 extension | ✅ Full framework integration |

### Quick Start with Faker Tests

```bash
# Generate e-commerce load test with realistic data
npx restifiedts faker-test -u https://api.mystore.com -t ecommerce --users 50 --duration 5m

# Generate financial services test with German locale
npx restifiedts faker-test -t financial --locale de --seed 12345 --output financial-test.ts

# Generate social media test with custom parameters
npx restifiedts faker-test -t social -u https://api.social.com --users 100 --duration 10m
```

### 🎯 Faker Test Templates

| Template | Description | Scenarios |
|----------|-------------|-----------|
| `ecommerce` | E-commerce platform testing | User registration, product browsing, cart operations, checkout |
| `financial` | Financial services testing | Account creation, transactions, payment processing |
| `social` | Social media platform testing | User profiles, posts, interactions, messaging |
| `custom` | Generic API testing | Flexible data generation for any API |

### 🌍 Multi-Locale Support

```bash
# Test with different locales for international applications
npx restifiedts faker-test --locale en    # English (default)
npx restifiedts faker-test --locale de    # German
npx restifiedts faker-test --locale fr    # French
npx restifiedts faker-test --locale es    # Spanish
npx restifiedts faker-test --locale ja    # Japanese
```

### 🔄 Reproducible Test Data

```bash
# Use seed for consistent, reproducible test data
npx restifiedts faker-test --seed 12345

# Same seed = same generated data across test runs
npx restifiedts faker-test -t ecommerce --seed 98765 --users 20
```

### 💻 Programmatic Faker Usage

```typescript
import { K6Integration, K6FakerScenario, PerformanceEngine } from 'restifiedts';

// Create K6 integration with faker
const k6 = new K6Integration({
  fakerConfig: {
    locale: 'en',
    seed: 12345
  }
});

// Define realistic test scenarios
const scenarios: K6FakerScenario[] = [
  {
    name: 'User Registration',
    endpoint: '/api/users',
    method: 'POST',
    dataFields: [
      { name: 'user', type: 'person' },
      { name: 'address', type: 'address' }
    ],
    validations: [
      { description: 'user created', check: 'r.status === 201' }
    ]
  }
];

// Generate TypeScript K6 test
const script = k6.generateK6TestWithFaker(scenarios);

// Run performance test with faker data
const performanceEngine = new PerformanceEngine();
const testId = await performanceEngine.runFakerTest({
  baseUrl: 'https://api.example.com',
  scenarios,
  users: 50,
  duration: '5m'
});
```

### 🏪 Pre-built E-commerce Scenario

```typescript
import { K6Integration } from 'restifiedts';

const k6 = new K6Integration();

// Generate complete e-commerce test suite
const { script, config } = k6.createEcommerceScenario('https://api.shopify.example.com');

// The generated script includes:
// ✅ User registration with faker person data
// ✅ Product browsing and search
// ✅ Shopping cart operations
// ✅ Checkout with faker payment data
// ✅ Realistic user behavior patterns
```

### 🎭 Available Faker Data Types

| Type | Generated Data | Examples |
|------|---------------|----------|
| `person` | User profiles | firstName, lastName, email, phone, avatar |
| `address` | Location data | street, city, state, zipCode, country |
| `company` | Business data | name, catchPhrase, bs, ein, industry |
| `product` | Product info | name, description, price, category, sku |
| `financial` | Payment data | creditCard, iban, bic, amount, currency |
| `internet` | Web data | email, url, domain, username, password |

### 🚀 Generated K6 TypeScript Features

The faker integration generates modern K6 TypeScript scripts with:

- ✅ **Type-safe interfaces** for API responses
- ✅ **Custom metrics** with strong typing
- ✅ **Modern ES6+ features** (optional chaining, object spread)
- ✅ **Setup/teardown functions** with proper typing
- ✅ **Realistic think times** and user behavior
- ✅ **Comprehensive validations** and assertions
- ✅ **Error handling** with type safety

### Complete CLI Command Reference

```bash
# 📋 View all available commands
npx restifiedts --help

# 🎭 Generate faker-powered performance tests
npx restifiedts faker-test -u https://api.example.com -t ecommerce --users 50
npx restifiedts faker-test --template financial --locale de --seed 12345
npx restifiedts faker-test --template social --output my-social-test.ts

# 📊 Generate comprehensive reports
npx restifiedts report --comprehensive --performance --security

# ✅ Validate existing test files
npx restifiedts validate --path tests/

# 🔧 Configuration commands
npx restifiedts config --environments development,staging,production
```

**Available Commands:**
- **`new`** - Generate new RestifiedTS project with interactive setup
- **`init`** - Initialize RestifiedTS in existing project  
- **`config-init`** - Generate Playwright-style restified.config.ts
- **`generate`** - Generate test files from 12+ templates
- **`scaffold`** - Generate complete service test suite
- **`config`** - Generate environment configuration files
- **`templates`** - List all available test templates
- **`report`** - Generate HTML test reports with multiple formats
- **`validate`** - Validate existing test files for common issues

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

## 🏢 Enterprise Features

RestifiedTS provides enterprise-scale multi-service, multi-role testing capabilities for large organizations with complex API ecosystems.

### Role-Based Testing

Define user roles and test access control across all endpoints. **Permissions are optional** since your application controls endpoint access based on roles:

```typescript
import { restified } from 'restifiedts';

// Define roles - permissions are optional since application controls access
restified.createRole({
  name: 'admin',
  description: 'Administrator role',
  auth: {
    type: 'bearer',
    token: process.env.ADMIN_TOKEN
  }
});

restified.createRole({
  name: 'user',
  description: 'Standard user role',
  auth: {
    type: 'bearer',
    token: process.env.USER_TOKEN
  }
});

restified.createRole({
  name: 'manager',
  description: 'Manager role',
  auth: {
    type: 'bearer',
    token: process.env.MANAGER_TOKEN
  }
});

// Optional: You can still define permissions if you want to validate against expected behavior
restified.createRole({
  name: 'guest',
  description: 'Guest user with limited access',
  permissions: ['read.public'], // Optional - for validation purposes only
  auth: {
    type: 'bearer',
    token: process.env.GUEST_TOKEN
  }
});
```

#### 🚀 **New Usage Pattern:**

```typescript
// BEFORE (Complex permission mapping)
restified.createRole({
  name: 'user',
  permissions: ['read', 'profile.*', 'users.view'], // Complex mapping
  auth: { type: 'bearer', token: process.env.USER_TOKEN }
});

// AFTER (Simple role definition)
restified.createRole({
  name: 'user',
  description: 'Standard user role',
  auth: { type: 'bearer', token: process.env.USER_TOKEN }
  // No permissions needed - application controls access!
});
```

#### 🎯 **Benefits of Application-Controlled Model:**

✅ **Realistic Testing**: Tests actual application behavior, not configuration assumptions  
✅ **Simplified Setup**: Just define role name and auth - no complex permission mapping  
✅ **Discovery-Based**: Automatically tests all endpoints with all roles  
✅ **Real-World Results**: See exactly which roles can access which endpoints  
✅ **Maintenance-Free**: No need to keep permission configs in sync with application

### Endpoint Discovery

Auto-discover endpoints from OpenAPI/Swagger specifications:

```typescript
// Discover endpoints from Swagger/OpenAPI specs
const authServiceEndpoints = await restified.discoverEndpointsFromSwagger(
  'auth-service', 
  'https://auth.example.com/swagger.json'
);

const userServiceEndpoints = await restified.discoverEndpointsFromOpenAPI(
  'user-service',
  'https://users.example.com/api-docs'
);

console.log(`Discovered ${authServiceEndpoints.totalEndpoints} auth endpoints`);
console.log(`Discovered ${userServiceEndpoints.totalEndpoints} user endpoints`);
```

### Batch Test Orchestration

Test multiple services with multiple roles in parallel:

```typescript
// Test all discovered endpoints with all roles
const batchResult = await restified.testAllEndpointsWithRoles(
  ['admin', 'user', 'manager'], // roles to test
  [
    {
      serviceName: 'auth-service',
      specUrl: 'https://auth.example.com/swagger.json'
    },
    {
      serviceName: 'user-service',
      specUrl: 'https://users.example.com/api-docs'
    }
  ]
);

console.log(`Test Results:`);
console.log(`- Total Tests: ${batchResult.summary.total}`);
console.log(`- Passed: ${batchResult.summary.passed}`);
console.log(`- Failed: ${batchResult.summary.failed}`);
console.log(`- Pass Rate: ${batchResult.summary.passRate}%`);

// Access control analysis
console.log(`Access Control Results:`);
console.log(`- Admin Access Granted: ${batchResult.roleAnalysis.byRole.admin.accessGranted}`);
console.log(`- User Access Granted: ${batchResult.roleAnalysis.byRole.user.accessGranted}`);
console.log(`- Manager Access Granted: ${batchResult.roleAnalysis.byRole.manager.accessGranted}`);
```

**How Application-Controlled Permissions Work:**

1. **Role Definition**: You only define role name and authentication - no complex permission mapping needed
2. **Application Determines Access**: Your application's middleware/authorization decides if the role can access each endpoint
3. **RestifiedTS Tests Reality**: Tests what actually happens when each role hits each endpoint
4. **Results Analysis**: Get detailed reports on which roles can access which endpoints

#### 📊 **Enhanced Results:**

```typescript
const results = await restified.testAllEndpointsWithRoles(['admin', 'user', 'manager']);

// Clear access control results
results.results.forEach(result => {
  if (result.hasAccess) {
    console.log(`✅ ${result.role} CAN access ${result.method} ${result.endpoint}`);
  } else {
    console.log(`❌ ${result.role} CANNOT access ${result.method} ${result.endpoint}`);
  }
});

// Role-specific access patterns  
console.log('Admin endpoints accessed:', results.roleAnalysis.byRole.admin.accessGranted);
console.log('User endpoints accessed:', results.roleAnalysis.byRole.user.accessGranted);
```

#### 🧪 **Testing Example:**

```typescript
// Example: Testing reveals actual application behavior
describe('Role-Based Access Control', function() {
  it('should test all endpoints with all roles', async function() {
    // This tests actual application behavior - not assumptions
    const results = await restified.testAllEndpointsWithRoles(['admin', 'user', 'manager']);
    
    // Verify admin has broader access than user
    expect(results.roleAnalysis.byRole.admin.accessGranted).to.be.greaterThan(
      results.roleAnalysis.byRole.user.accessGranted
    );
    
    // Check specific role access patterns
    const adminResults = results.results.filter(r => r.role === 'admin');
    const userResults = results.results.filter(r => r.role === 'user');
    
    // Admin should have access to admin endpoints
    const adminEndpoints = adminResults.filter(r => r.endpoint.includes('/admin/'));
    expect(adminEndpoints.every(r => r.hasAccess)).to.be.true;
    
    // User should be denied admin endpoints
    const userAdminAttempts = userResults.filter(r => r.endpoint.includes('/admin/'));
    expect(userAdminAttempts.every(r => !r.hasAccess)).to.be.true;
  });
});
```

### Parallel Test Execution

Configure folder-based parallel/sequential test execution:

```typescript
// Configure parallel execution
restified.configureParallelExecution({
  workerCount: 8,
  sequentialFolders: [
    'tests/integration',    // Run integration tests sequentially
    'tests/e2e',           // Run e2e tests sequentially
    'tests/database'       // Database tests need sequential execution
  ],
  parallelFolders: [
    'tests/unit',          // Unit tests can run in parallel
    'tests/api',           // API tests can run in parallel
    'tests/performance'    // Performance tests can run in parallel
  ],
  customFolders: {
    'tests/security': {
      pattern: '**/*.security.{test,spec}.{js,ts}',
      execution: 'sequential',
      priority: 10  // High priority, run first
    },
    'tests/load': {
      pattern: '**/*.load.{test,spec}.{js,ts}',
      execution: 'parallel',
      priority: 1   // Low priority, run last
    }
  }
});

// Execute tests with folder-based parallelism
const testResults = await restified.executeTestFolders(
  './tests',
  {
    timeout: 60000,
    retries: 2,
    continueOnFailure: true
  },
  (progress) => {
    console.log(`Progress: ${progress.progressPercentage}% (${progress.completedTasks}/${progress.totalTasks})`);
  }
);
```

### Enterprise Configuration

Centralized configuration management for large-scale testing:

```typescript
// Load enterprise configuration from file
const config = await restified.loadEnterpriseConfig('./config/enterprise.json');

// Configuration automatically applied:
// - All roles are created
// - All services are configured as clients
// - Parallel execution settings applied
// - Global timeouts and retries set
```

**Enterprise Configuration Example (`enterprise.json`):**

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "Enterprise Test Configuration",
    "description": "Multi-service API testing configuration"
  },
  
  "global": {
    "timeout": 30000,
    "retries": 2,
    "continueOnFailure": true,
    "environment": "staging"
  },

  "services": {
    "auth-service": {
      "name": "auth-service",
      "baseUrl": "${AUTH_SERVICE_URL||https://auth.example.com}",
      "discovery": {
        "enabled": true,
        "specUrl": "${AUTH_SERVICE_URL||https://auth.example.com}/swagger.json"
      }
    },
    "user-service": {
      "name": "user-service",
      "baseUrl": "${USER_SERVICE_URL||https://users.example.com}",
      "discovery": {
        "enabled": true,
        "specUrl": "${USER_SERVICE_URL||https://users.example.com}/api-docs"
      }
    }
  },

  "roles": {
    "admin": {
      "name": "admin",
      "description": "Administrator role",
      "auth": {
        "type": "bearer",
        "token": "${ADMIN_TOKEN}"
      }
    },
    "user": {
      "name": "user", 
      "description": "Standard user role",
      "auth": {
        "type": "bearer",
        "token": "${USER_TOKEN}"
      }
    },
    "manager": {
      "name": "manager",
      "description": "Manager role", 
      "auth": {
        "type": "bearer",
        "token": "${MANAGER_TOKEN}"
      }
    },
    "guest": {
      "name": "guest",
      "description": "Guest user with limited access",
      "permissions": ["read.public"],
      "auth": {
        "type": "bearer", 
        "token": "${GUEST_TOKEN}"
      }
    }
  },

  "parallel": {
    "workerCount": 6,
    "loadBalancing": "round-robin",
    "testFolders": {
      "sequential": ["tests/integration", "tests/e2e"],
      "parallel": ["tests/unit", "tests/api", "tests/performance"]
    }
  },

  "batchPresets": {
    "smoke-test": {
      "name": "Smoke Test Suite",
      "services": ["auth-service", "user-service"],
      "roles": ["admin", "user"],
      "filters": {
        "includeTags": ["smoke", "critical"]
      }
    },
    "full-regression": {
      "name": "Full Regression Suite",
      "services": ["auth-service", "user-service"],
      "roles": ["admin", "manager", "user", "guest"]
    }
  }
}
```

### Environment Variables for Enterprise

```bash
# Service URLs
export AUTH_SERVICE_URL=https://auth.example.com
export USER_SERVICE_URL=https://users.example.com

# Authentication tokens
export ADMIN_TOKEN=your-admin-token-here
export MANAGER_TOKEN=your-manager-token-here
export USER_TOKEN=your-user-token-here
export GUEST_TOKEN=your-guest-token-here

# Test configuration
export NODE_ENV=staging
export PARALLEL_WORKERS=6
```

### Use Cases

✅ **Large Organizations**: Test 10+ microservices with 100+ endpoints each  
✅ **Permission Testing**: Verify role-based access control across all APIs  
✅ **CI/CD Integration**: Parallel execution for faster build pipelines  
✅ **Compliance**: Comprehensive permission auditing and reporting  
✅ **Scale Testing**: Handle thousands of test combinations efficiently  

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
