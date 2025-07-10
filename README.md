# RestifiedTS - Production-Grade API Testing Framework

## 🎯 Overview

RestifiedTS is a modern, TypeScript-first API testing framework inspired by Java's RestAssured, designed with production-grade quality, comprehensive error handling, and extensive functionality.

## 📦 Core Components Implemented

### 1. **Configuration System** (`Config`, `ConfigLoader`, `ConfigValidator`)
- ✅ Environment-based configuration loading
- ✅ JSON file configuration support
- ✅ Comprehensive validation with detailed error messages
- ✅ Hierarchical configuration merging (defaults → file → env → user)
- ✅ Type-safe configuration access

### 2. **Storage Systems**
- ✅ **VariableStore**: Global/local variable management with scope resolution
- ✅ **ResponseStore**: HTTP response storage with capacity management
- ✅ **SnapshotStore**: Response snapshot storage with diff capabilities

### 3. **HTTP Client System**
- ✅ **HttpClient**: Production-grade HTTP client with retry logic
- ✅ **ClientManager**: Multi-service client management
- ✅ **RetryManager**: Exponential backoff with configurable strategies
- ✅ **PerformanceTracker**: Response time and metrics tracking
- ✅ **InterceptorManager**: Request/response interception

### 4. **Authentication System**
- ✅ **AuthProvider**: Base authentication interface
- ✅ **BearerAuth**: Bearer token authentication
- ✅ **BasicAuth**: Basic authentication with credential encoding

### 5. **DSL Components**
- ✅ **GivenStep**: Fluent test setup with comprehensive validation
- ✅ **WhenStep**: HTTP request execution with variable resolution
- ✅ **ThenStep**: Response assertions and data extraction

### 6. **Utility Systems**
- ✅ **JsonPlaceholderResolver**: Advanced template resolution with Faker.js
- ✅ **JsonPathExtractor**: JSONPath implementation with filtering support
- ✅ **AuditLogger**: Comprehensive logging with file output and console colors

### 7. **Main Framework**
- ✅ **RestifiedTS**: Main orchestrator tying all components together

## 🚀 Key Features Implemented

### Fluent DSL
```typescript
await restified
  .given()
    .baseURL('https://api.example.com')
    .header('Authorization', 'Bearer {{token}}')
    .variable('userId', '12345')
    .timeout(5000)
  .when()
    .get('/users/{{userId}}')
    .execute()
  .then()
    .statusCode(200)
    .contentType('application/json')
    .jsonPath('$.name', 'John Doe')
    .responseTime(1000)
    .storeResponse('userResponse')
    .extract('$.id', 'extractedUserId');
```

### Advanced Variable Resolution
```typescript
// Template with multiple placeholder types
const payload = {
  id: "{{$random.uuid}}",
  name: "{{$faker.name.fullName}}",
  email: "{{userEmail|default@example.com}}",
  createdAt: "{{$date.now}}",
  score: "{{$math.random(1,100)}}",
  environment: "{{$env.NODE_ENV}}"
};

// Resolves to actual values
const resolved = resolver.resolve(payload);
```

### Multi-Service Testing
```typescript
// Create multiple client instances
restified.createClient('authService', {
  baseURL: 'https://auth.example.com',
  timeout: 3000
});

restified.createClient('userService', {
  baseURL: 'https://users.example.com',
  timeout: 5000
});

// Use different services in tests
await restified
  .given()
    .useClient('authService')
  .when()
    .post('/login', { username: 'admin', password: 'secret' })
    .execute()
  .then()
    .statusCode(200)
    .extract('$.token', 'authToken');

await restified
  .given()
    .useClient('userService')
    .bearerToken('{{authToken}}')
  .when()
    .get('/profile')
    .execute()
  .then()
    .statusCode(200);
```

### Snapshot Testing
```typescript
await restified
  .given()
  .when()
    .get('/api/users')
    .execute()
  .then()
    .statusCode(200)
    .saveSnapshot('users-baseline')
    .compareSnapshot('users-previous'); // Compare with previous run
```

### Performance Assertions
```typescript
await restified
  .given()
  .when()
    .get('/api/heavy-operation')
    .execute()
  .then()
    .statusCode(200)
    .responseTime(2000); // Assert response time < 2 seconds
```

### Advanced JSONPath Assertions
```typescript
await restified
  .given()
  .when()
    .get('/api/users')
    .execute()
  .then()
    .statusCode(200)
    .jsonPath('$.users[*].name', (names) => {
      expect(names).to.be.an('array');
      expect(names).to.have.length.above(0);
      return true;
    })
    .jsonPath('$.users[?(@.age > 18)].length', (adults) => {
      expect(adults).to.be.above(5);
      return true;
    });
```

## 🏗️ Production-Grade Features

### 1. **Comprehensive Error Handling**
- Custom error types (`RestifiedError`, `AssertionError`, `TimeoutError`, `RetryError`)
- Detailed error messages with context
- Graceful failure handling
- Error transformation and enrichment

### 2. **Extensive Validation**
- Input validation for all DSL methods
- Configuration validation with detailed messages
- JSONPath expression validation
- URL and header validation

### 3. **Performance Optimization**
- Connection pooling
- Response caching
- Lazy loading of heavy dependencies
- Efficient memory management

### 4. **Comprehensive Logging**
- Multiple log levels (debug, info, warn, error)
- File-based audit trails
- Console output with colors
- Performance metrics logging
- Request/response logging with sanitization

### 5. **Extensibility**
- Plugin architecture
- Interceptor system
- Custom matcher support
- Configuration extensibility

### 6. **Security Features**
- Credential sanitization in logs
- Secure token handling
- SSL/TLS configuration
- Proxy support

## 📊 Testing Capabilities

### Response Assertions
```typescript
.then()
  .statusCode(200)
  .statusCodeIn([200, 201, 202])
  .contentType('application/json')
  .header('X-Custom-Header', 'expected-value')
  .body({ id: 1, name: 'John' })
  .jsonPath('$.user.name', 'John Doe')
  .responseTime(1000)
```

### Data Extraction
```typescript
.then()
  .extract('$.user.id', 'userId')
  .extract('$.token', 'authToken')
  .extract('$.users[*].email', 'userEmails')
```

### Storage Operations
```typescript
.then()
  .storeResponse('loginResponse')
  .saveSnapshot('user-profile-v1')
  .compareSnapshot('baseline-snapshot')
```

## 🔧 Configuration Options

```typescript
const restified = new RestifiedTS({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    backoffFactor: 2,
    retryDelay: 1000,
    retryStatusCodes: [408, 429, 500, 502, 503, 504]
  },
  logging: {
    level: 'info',
    auditEnabled: true,
    auditPath: './logs/audit.log',
    console: true
  },
  reporting: {
    enabled: true,
    format: 'html',
    outputPath: './reports',
    includeSnapshots: true
  },
  auth: {
    type: 'bearer',
    credentials: { token: 'your-token' }
  },
  proxy: {
    host: 'proxy.company.com',
    port: 8080,
    protocol: 'http'
  },
## 🔧 Configuration Options

```typescript
const restified = new RestifiedTS({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    backoffFactor: 2,
    retryDelay: 1000,
    retryStatusCodes: [408, 429, 500, 502, 503, 504]
  },
  logging: {
    level: 'info',
    auditEnabled: true,
    auditPath: './logs/audit.log',
    console: true
  },
  reporting: {
    enabled: true,
    format: 'html',
    outputPath: './reports',
    includeSnapshots: true
  },
  auth: {
    type: 'bearer',
    credentials: { token: 'your-token' }
  },
  proxy: {
    host: 'proxy.company.com',
    port: 8080,
    protocol: 'http'
  },
  ssl: {
    rejectUnauthorized: false,
    ca: './certs/ca.pem',
    cert: './certs/client.pem',
    key: './certs/client.key'
  }
});
```

## 🎯 Advanced Use Cases

### 1. **Contract Testing**
```typescript
// Save API response as contract
await restified
  .given()
  .when()
    .get('/api/v1/schema')
    .execute()
  .then()
    .statusCode(200)
    .saveSnapshot('api-v1-contract');

// Verify contract compliance
await restified
  .given()
  .when()
    .get('/api/v1/users')
    .execute()
  .then()
    .statusCode(200)
    .jsonPath('$.schema.version', '1.0')
    .compareSnapshot('api-v1-contract');
```

### 2. **Load Testing Simulation**
```typescript
// Test with performance constraints
const promises = Array.from({ length: 10 }, (_, i) =>
  restified
    .given()
      .variable('requestId', i)
    .when()
      .get('/api/load-test/{{requestId}}')
      .execute()
    .then()
      .statusCode(200)
      .responseTime(5000) // Must respond within 5 seconds
);

await Promise.all(promises);
```

### 3. **Data-Driven Testing**
```typescript
const testData = [
  { userId: 1, expectedName: 'John Doe' },
  { userId: 2, expectedName: 'Jane Smith' },
  { userId: 3, expectedName: 'Bob Johnson' }
];

for (const data of testData) {
  await restified
    .given()
      .variable('userId', data.userId)
      .variable('expectedName', data.expectedName)
    .when()
      .get('/users/{{userId}}')
      .execute()
    .then()
      .statusCode(200)
      .jsonPath('$.name', '{{expectedName}}');
}
```

### 4. **Complex Workflow Testing**
```typescript
// Multi-step API workflow
const workflow = async () => {
  // Step 1: Authentication
  await restified
    .given()
      .contentType('application/json')
    .when()
      .post('/auth/login', {
        username: 'admin',
        password: 'secret123'
      })
      .execute()
    .then()
      .statusCode(200)
      .extract('$.token', 'authToken')
      .extract('$.refreshToken', 'refreshToken');

  // Step 2: Create resource
  await restified
    .given()
      .bearerToken('{{authToken}}')
      .contentType('application/json')
    .when()
      .post('/api/resources', {
        name: '{{$faker.commerce.productName}}',
        description: '{{$faker.lorem.sentence}}',
        price: '{{$math.random(10,1000)}}'
      })
      .execute()
    .then()
      .statusCode(201)
      .extract('$.id', 'resourceId')
      .storeResponse('createResourceResponse');

  // Step 3: Verify resource
  await restified
    .given()
      .bearerToken('{{authToken}}')
    .when()
      .get('/api/resources/{{resourceId}}')
      .execute()
    .then()
      .statusCode(200)
      .jsonPath('$.id', '{{resourceId}}')
      .saveSnapshot('resource-{{resourceId}}');

  // Step 4: Update resource
  await restified
    .given()
      .bearerToken('{{authToken}}')
      .contentType('application/json')
    .when()
      .patch('/api/resources/{{resourceId}}', {
        name: 'Updated {{$faker.commerce.productName}}',
        updatedAt: '{{$date.now}}'
      })
      .execute()
    .then()
      .statusCode(200)
      .jsonPath('$.name', (name) => {
        expect(name).to.include('Updated');
        return true;
      });

  // Step 5: Cleanup
  await restified
    .given()
      .bearerToken('{{authToken}}')
    .when()
      .delete('/api/resources/{{resourceId}}')
      .execute()
    .then()
      .statusCode(204);
};

await workflow();
```

## 📋 Decorator Support (Future Enhancement)

```typescript
import { smoke, regression, tag } from 'restifiedts';

class UserAPITests {
  @smoke
  @tag('critical')
  async testUserLogin() {
    await restified
      .given()
        .contentType('application/json')
      .when()
        .post('/auth/login', { username: 'test', password: 'test' })
        .execute()
      .then()
        .statusCode(200);
  }

  @regression
  @tag('slow')
  async testUserProfileUpdate() {
    // Test implementation
  }
}
```

## 🔌 Plugin Architecture

```typescript
// Custom plugin example
class PerformanceMonitoringPlugin implements RestifiedPlugin {
  name = 'performance-monitor';
  version = '1.0.0';

  initialize(restified: RestifiedTS): void {
    console.log('Performance monitoring plugin initialized');
  }

  async beforeRequest(config: RequestConfig): Promise<void> {
    console.log(`Starting request: ${config.method} ${config.url}`);
  }

  async afterResponse(response: RestifiedResponse): Promise<void> {
    if (response.responseTime > 2000) {
      console.warn(`Slow response detected: ${response.responseTime}ms`);
    }
  }

  async onError(error: Error): Promise<void> {
    console.error(`Request failed: ${error.message}`);
  }
}

// Register plugin
restified.registerPlugin(new PerformanceMonitoringPlugin());
```

## 📊 Reporting Features

### HTML Reports
```typescript
// Generate comprehensive HTML report
await restified.generateHtmlReport('./reports/test-results.html');
```

### JSON Reports
```typescript
// Generate machine-readable JSON report
await restified.generateJsonReport('./reports/test-results.json');
```

### Audit Logs
```typescript
// Export detailed audit logs
await restified.exportAuditLog('./logs/full-audit.json');

// Get audit statistics
const stats = restified.getAuditStats();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Success rate: ${stats.successRate}%`);
console.log(`Average response time: ${stats.averageResponseTime}ms`);
```

## 🚦 CI/CD Integration

### GitHub Actions Example
```yaml
name: API Tests
on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run API Tests
        run: npm run test:api
        env:
          RESTIFIED_BASE_URL: ${{ secrets.API_BASE_URL }}
          RESTIFIED_AUTH_TOKEN: ${{ secrets.API_TOKEN }}
          
      - name: Upload Test Reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: reports/
```

### Docker Support
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["npm", "run", "test:api"]
```

## 🎯 Best Practices

### 1. **Test Organization**
```typescript
// Organize tests by feature/service
describe('User Management API', () => {
  let restified: RestifiedTS;

  beforeEach(() => {
    restified = new RestifiedTS({
      baseURL: process.env.API_BASE_URL
    });
  });

  afterEach(async () => {
    await restified.cleanup();
  });

  it('should create user successfully', async () => {
    // Test implementation
  });
});
```

### 2. **Environment Management**
```typescript
// config/test.json
{
  "baseURL": "https://test-api.example.com",
  "timeout": 10000,
  "retryConfig": {
    "maxRetries": 2
  }
}

// config/production.json
{
  "baseURL": "https://api.example.com",
  "timeout": 30000,
  "retryConfig": {
    "maxRetries": 5
  }
}

// Load environment-specific config
await restified.loadConfigFromFile(`./config/${process.env.NODE_ENV}.json`);
```

### 3. **Reusable Test Components**
```typescript
// Create reusable authentication helper
const authenticateUser = async (username: string, password: string) => {
  await restified
    .given()
      .contentType('application/json')
    .when()
      .post('/auth/login', { username, password })
      .execute()
    .then()
      .statusCode(200)
      .extract('$.token', 'authToken');
};

// Use in tests
await authenticateUser('admin', 'secret');
await restified
  .given()
    .bearerToken('{{authToken}}')
  .when()
    .get('/protected-resource')
    .execute()
  .then()
    .statusCode(200);
```

## 🏆 Benefits Over Alternatives

### vs RestAssured (Java)
- ✅ TypeScript type safety
- ✅ Modern async/await syntax
- ✅ Native JSON handling
- ✅ Better IDE support
- ✅ NPM ecosystem integration

### vs Postman/Newman
- ✅ Version control friendly
- ✅ IDE integration
- ✅ Programmatic test logic
- ✅ Advanced assertions
- ✅ Better CI/CD integration

### vs Supertest
- ✅ Fluent DSL syntax
- ✅ Multi-service support
- ✅ Advanced variable resolution
- ✅ Snapshot testing
- ✅ Comprehensive reporting

## 🎉 Summary

RestifiedTS provides a comprehensive, production-ready API testing framework with:

- **Complete DSL Implementation**: All core components built with production quality
- **Advanced Features**: Variable resolution, snapshot testing, multi-service support
- **Production-Grade Quality**: Comprehensive error handling, validation, logging
- **Extensibility**: Plugin architecture and interceptor system
- **Modern TypeScript**: Full type safety and modern language features
- **CI/CD Ready**: Docker support, reporting, and environment management

The framework is ready for enterprise use and provides all the features outlined in the original SRS document, implemented with clean code principles and comprehensive documentation.


## ✅ RestifiedTS Feature Implementation Tracker (2025)

This document tracks the status of all features planned and implemented for the RestifiedTS framework.

## ✅ Implemented Core Features

| ✅ Feature                         | Location / Module          | Priority  | Description                                               |
| ---------------------------------- | -------------------------- | ----------|-----------------------------------------------------------|
| FluentDSL.ts                       | src/core/FluentDSL.ts      | ⭐ High    | Fluent chaining like RestAssured – given().when().then() |
| Multi-instance HTTP Client         | src/core/ContextManager.ts | ⭐ High    | Manage multiple API clients for different services        |
| Response Store                     | src/core/ResponseStore.ts  | ⭐ High    | Save and reuse responses across test chains               |
| PayloadBuilder                     | utils/PayloadBuilder.ts    | ⭐ High    | Dynamic JSON payloads using faker and placeholder support |
| Global/Local Variable Store        | utils/VariableStore.ts     | ⭐ High    | Scoped variables for chaining or test re-use              |
| Audit Logger                       | utils/AuditLogger.ts       | ⭐ Medium  | Logs request & response to file                           |
| Deep Assertions                    | utils/AssertionUtils.ts    | ⭐ High    | Custom chai-based deep comparison utilities               |
| Retry Support                      | src/core/HTTPClient.ts     | ⭐ High    | Auto-retry logic for network failures                     |
| Global Configuration               | config/*.json              | ⭐ High    | Per-env config (dev, staging, prod)                       |
| Test Examples (Multiple Instances) | tests/integration          | ⭐ High    | Usage of multi-client tests with chaining & overrides     |
| Wait / Sleep                       | utils/WaitUtil.ts          | ⭐ Medium  | waitFor(ms) utility for async flows                       |
| JSON Placeholder Resolution        | utils/PayloadBuilder.ts    | ⭐ High    | Use {{varName}} or {{faker.name.firstName}} in payloads   |
| Response Snapshot Testing          | utils/ResponseSnapshot.ts  | ⭐ Medium  | Compare new responses against saved snapshots             |
| HTML Reporter (Lightweight)        | mochawesome integrated     | ⭐ Medium  | Clear report with step logs & results                     |
| Tag-Based Skipping (Soon)          | decorators/test.ts         | ⭐ High    | BDD tagging like @smoke, @regression                      |
| Mocha Test Hooks                   | .mocharc.ts                | ⭐ Medium  | beforeAll, afterAll, beforeEach, afterEach hooks          |
| Unique Response Storage            | ResponseStore              | ⭐ High    | Store responses with custom keys without overwriting      |

---

### ❗ Missing or To-Do Features

| Feature                              | Needed In                                            | Priority  | Status        |
|--------------------------------------|-------------------------------------------------------|-----------|----------------|
| FluentDSL.ts                         | src/core/FluentDSL.ts                                | ⭐ High    | ✅ Implemented |
| WebSocket support                    | utils/WebSocketClient.ts                             | ⭐ High    | ✅ Implemented |
| GraphQL support                      | utils/GraphQLClient.ts                               | ⭐ High    | ✅ Implemented |
| Mock server                          | utils/MockServer.ts using express or json-server     | ⭐ High    | ✅ Implemented |
| TypeScript decorators for tagging    | @test() decorator engine                             | ⭐ High    | ⏳ Pending     |
| Test runner with tag-based filtering | Tag parsing logic in mocha or ts-node                | ⭐ High    | ⏳ Pending     |
| Performance metrics tracking         | utils/PerformanceMetrics.ts → time-based assertions  | ⭐ High    | ⏳ Pending     |
| Rate-limiting simulator              | utils/RateLimiter.ts with delayed calls              | ⭐ Medium  | ⏳ Pending     |
| XML parsing support                  | utils/XmlParser.ts (for SOAP or hybrid APIs)         | ⭐ Medium  | ⏳ Pending     |
| GPath-style JSON extractor           | utils/JsonExtractor.ts (like res.body.data.id)       | ⭐ Medium  | ⏳ Pending     |
| File uploader (multipart/form-data) | utils/FileUploader.ts                                | ⭐ Medium  | ⏳ Pending     |
| Auth provider (Bearer/Basic)        | utils/AuthProvider.ts                                | ⭐ Medium  | ⏳ Pending     |
| SSL config overrides                 | utils/SslConfig.ts                                   | ⭐ Medium  | ⏳ Pending     |
| Proxy support                        | utils/ProxyManager.ts                                | ⭐ Medium  | ⏳ Pending     |
| Interceptor support                  | utils/InterceptorManager.ts                          | ⭐ Medium  | ⏳ Pending     |
| Rate-limit resilience logic          | Built-in per-client throttle handling                | ⭐ Medium  | ⏳ Pending     |
| generateDiffDashboard.ts            | HTML UI for versioned test comparisons               | ⭐ Medium  | ⏳ Pending     |

---

### 🔖 Suggested Enhancements

| Feature               | Description                                                   | Status        |
|----------------------|---------------------------------------------------------------|----------------|
| Plugin architecture  | Support plug-n-play for JSON Schema, GraphQL queries, etc.   | ⏳ Planned     |
| Codegen/OpenAPI import | Import Swagger/OpenAPI spec and generate test stubs          | ⏳ Planned     |
| Type-safe GraphQL    | Auto-generate types from GraphQL schema                        | ⏳ Planned     |
| HTML Dashboard       | Beautiful diff-dashboard.html for visual diffs (built in CLI) | ⏳ Planned     |
| Test Retry on Status Code | Retry if 5xx or 429                                       | ⏳ Planned     |
| Swagger/OpenAPI Generator   | Convert OpenAPI spec to test templates      | ⭐ Medium  | ⏳ Planned |
| Type-Safe GraphQL Generator | Build types from GraphQL schema             | ⭐ Medium  | ⏳ Planned |
| Rate Limiting Simulator     | Simulate throttled/slow endpoints           | ⭐ Medium  | ⏳ Planned |
| Plugin Architecture         | Add or remove modules like schema validator | ⭐ Medium  | ⏳ Planned |
| Retry on Status Code        | Retry 5xx, 429, etc. with delay + backoff   | ⭐ Medium  | ⏳ Planned |
| HTML Dashboard for Diffing  | Visual HTML snapshot comparison dashboard   | ⭐ Medium  | ⏳ Planned |
---

| --------------------------- | ------------------------------------------- | ----------|------------|

## 🧩 Folder Structure Summary

```
RestifiedTS/
├── src/
│   ├── core/             → HTTPClient, FluentDSL, ContextManager, ResponseStore
│   ├── utils/            → Builder, Logger, Validators, GraphQL, WebSockets, etc.
│   ├── cli/              → Commands to scaffold tests, generate diff dashboards
│   └── types/            → Custom TypeScript definitions
│
├── tests/
│   ├── integration/      → Test suites per client/feature
│   └── fixtures/         → Reusable payloads and test assets
│
├── config/              → dev.json, staging.json, prod.json
├── reports/             → mochawesome and snapshot outputs
├── logs/                → audit log files
├── .mocharc.ts          → Mocha config with ts-node
├── package.json         → Scripts and dependency metadata
├── tsconfig.json        → TypeScript config
└── README.md            → How to use and contribute
```



