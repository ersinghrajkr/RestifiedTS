# 🚀 RestifiedTS – Modern API Testing Framework

[![npm version](https://badge.fury.io/js/restifiedts.svg)](https://badge.fury.io/js/restifiedts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

**RestifiedTS** is a production-grade API testing framework built in TypeScript, inspired by Java's RestAssured. Test REST APIs, GraphQL endpoints, and WebSocket connections with a fluent DSL, comprehensive features, and extensive reporting capabilities.

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
✅ **Enhanced Reporting** - Custom reports with performance and security metrics
✅ **CLI Tools** - Generate advanced test templates and project scaffolding

## 🚀 Quick Start

### Installation

```bash
npm install restifiedts
npm install --save-dev mocha chai @types/mocha @types/chai @types/node typescript ts-node
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

### Run Your Test

Add to `package.json`:

```json
{
  "scripts": {
    "test": "mocha --require ts-node/register 'tests/**/*.ts'"
  }
}
```

```bash
npm test
```

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

## 🛠️ CLI Tools

Generate test templates quickly:

```bash
# Generate basic API test template
npx restifiedts generate --type api --name User

# Generate authentication test
npx restifiedts generate --type auth --name Login

# Generate multi-client test
npx restifiedts generate --type multi-client --name Integration

# Generate database integration test
npx restifiedts generate --type database --name UserDatabase

# Generate performance test with Artillery
npx restifiedts generate --type performance --name LoadTest

# Generate security test with ZAP
npx restifiedts generate --type security --name SecurityScan

# Generate unified orchestration test
npx restifiedts generate --type unified --name ComprehensiveTest

# Generate schema validation test
npx restifiedts generate --type validation --name SchemaTest

# Initialize project structure
npx restifiedts init
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
npx restifiedts generate --type api --name User --base-url https://api.example.com
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

For comprehensive documentation, advanced features, configuration guides, and best practices, see:

### 📄 [**RESTIFIEDTS-GUIDE.md**](./RESTIFIEDTS-GUIDE.md)

The complete guide covers:

- ⚙️ **Configuration Management** - Environment configs, multi-instance setup
- 🔐 **Authentication & Token Management** - Bearer, OAuth2, refresh tokens
- 🏗️ **Multi-Instance Architecture** - Service-oriented testing, runtime instances
- 🔧 **Advanced Features** - Performance testing, schema validation, custom assertions
- 📦 **Publishing to NPM** - Complete publishing workflow
- 🐛 **Troubleshooting** - Common issues and solutions

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
npx restifiedts generate --type database --name UserDatabase --db-type postgresql

# Generate performance test with Artillery
npx restifiedts generate --type performance --name LoadTest --target https://api.example.com

# Generate security test with ZAP
npx restifiedts generate --type security --name SecurityScan --zap-host localhost:8080

# Generate unified orchestration test
npx restifiedts generate --type unified --name ComprehensiveTest --include-all

# Generate schema validation test
npx restifiedts generate --type validation --name SchemaTest --validators joi,zod,ajv
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
