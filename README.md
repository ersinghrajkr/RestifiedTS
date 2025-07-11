# 🚀 RestifiedTS – A Modern API Automation Framework in TypeScript

# RestifiedTS - Production-Grade API Testing Framework

## 🎯 Overview

RestifiedTS is a modern, TypeScript-first API testing framework inspired by Java's RestAssured, designed with production-grade quality, comprehensive error handling, and extensive functionality.

## 📦 Core Components Implemented

### 1. **Configuration System** (`Config`, `ConfigLoader`, `ConfigValidator`)

* ✅ Environment-based configuration loading
* ✅ JSON file configuration support
* ✅ Comprehensive validation with detailed error messages
* ✅ Hierarchical configuration merging (defaults → file → env → user)
* ✅ Type-safe configuration access

### 2. **Storage Systems**

* ✅  **VariableStore** : Global/local variable management with scope resolution
* ✅  **ResponseStore** : HTTP response storage with capacity management
* ✅  **SnapshotStore** : Response snapshot storage with diff capabilities

### 3. **HTTP Client System**

* ✅  **HttpClient** : Production-grade HTTP client with retry logic
* ✅  **ClientManager** : Multi-service client management
* ✅  **RetryManager** : Exponential backoff with configurable strategies
* ✅  **PerformanceTracker** : Response time and metrics tracking
* ✅  **InterceptorManager** : Request/response interception

### 4. **Authentication System**

* ✅  **AuthProvider** : Base authentication interface
* ✅  **BearerAuth** : Bearer token authentication
* ✅  **BasicAuth** : Basic authentication with credential encoding

### 5. **DSL Components**

* ✅  **GivenStep** : Fluent test setup with comprehensive validation
* ✅  **WhenStep** : HTTP request execution with variable resolution
* ✅  **ThenStep** : Response assertions and data extraction

### 6. **Utility Systems**

* ✅  **JsonPlaceholderResolver** : Advanced template resolution with Faker.js
* ✅  **JsonPathExtractor** : JSONPath implementation with filtering support
* ✅  **AuditLogger** : Comprehensive logging with file output and console colors

### 7. **Main Framework**

* ✅  **RestifiedTS** : Main orchestrator tying all components together

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

* Custom error types (`RestifiedError`, `AssertionError`, `TimeoutError`, `RetryError`)
* Detailed error messages with context
* Graceful failure handling
* Error transformation and enrichment

### 2. **Extensive Validation**

* Input validation for all DSL methods
* Configuration validation with detailed messages
* JSONPath expression validation
* URL and header validation

### 3. **Performance Optimization**

* Connection pooling
* Response caching
* Lazy loading of heavy dependencies
* Efficient memory management

### 4. **Comprehensive Logging**

* Multiple log levels (debug, info, warn, error)
* File-based audit trails
* Console output with colors
* Performance metrics logging
* Request/response logging with sanitization

### 5. **Extensibility**

* Plugin architecture
* Interceptor system
* Custom matcher support
* Configuration extensibility

### 6. **Security Features**

* Credential sanitization in logs
* Secure token handling
* SSL/TLS configuration
* Proxy support

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

* ✅ TypeScript type safety
* ✅ Modern async/await syntax
* ✅ Native JSON handling
* ✅ Better IDE support
* ✅ NPM ecosystem integration

### vs Postman/Newman

* ✅ Version control friendly
* ✅ IDE integration
* ✅ Programmatic test logic
* ✅ Advanced assertions
* ✅ Better CI/CD integration

### vs Supertest

* ✅ Fluent DSL syntax
* ✅ Multi-service support
* ✅ Advanced variable resolution
* ✅ Snapshot testing
* ✅ Comprehensive reporting

## 🎉 Summary

RestifiedTS provides a comprehensive, production-ready API testing framework with:

* **Complete DSL Implementation** : All core components built with production quality
* **Advanced Features** : Variable resolution, snapshot testing, multi-service support
* **Production-Grade Quality** : Comprehensive error handling, validation, logging
* **Extensibility** : Plugin architecture and interceptor system
* **Modern TypeScript** : Full type safety and modern language features
* **CI/CD Ready** : Docker support, reporting, and environment management

The framework is ready for enterprise use and provides all the features outlined in the original SRS document, implemented with clean code principles and comprehensive documentation.

> **Battle-ready alternative to Java’s RestAssured, fully written in TypeScript**

RestifiedTS is a powerful, expressive, and extensible API automation framework designed for end-to-end testing of **REST APIs**, **GraphQL**, and **WebSocket** endpoints. It supports features like fluent chaining, multi-client architecture, snapshot testing, dynamic payloads, schema validation, and more — all built on top of Mocha, Chai, and TypeScript.

---

## ✨ Key Features

✅ Fluent DSL like `given().when().then()`
✅ Multi-client request support with dynamic overrides
✅ Supports REST, GraphQL, WebSocket
✅ Dynamic payloads with Faker + placeholders
✅ Retry logic, waiting, hooks, snapshot testing
✅ Deep JSON assertion utils with schema validation
✅ Lightweight HTML reporting
✅ Tag-based test filtering (@smoke, @regression)
✅ Auto logging of request/response for debugging
✅ Docker + CI-friendly structure

---

## 📦 Quick Start

```bash
npx degit codershub-ai/restifiedts my-api-tests
cd my-api-tests
npm install
npm test
```

**🧪 Sample Test**

```
import { given } from '@core/FluentDSL';
import { expectStatus } from '@utils/AssertionUtils';
import { mainAppClient } from '@core/ContextManager';
test('@smoke Create user and validate ID', async () => {
  const response = await given(mainAppClient)
    .withHeaders({ Authorization: Bearer ${global.token} })
    .withBody({ name: 'Raj', age: 28 })
    .post('/users');  expectStatus(response, 201);
  const userId = await response.json('id');
  expect(userId).to.be.a('string');
});
```


# RestifiedTS Architecture Design

## 🏗️ Core Architecture Overview

RestifiedTS follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        DSL Layer                            │
│  (given().when().then() - User-facing fluent interface)    │
├─────────────────────────────────────────────────────────────┤
│                     Service Layer                          │
│     (HTTP Client, GraphQL, WebSocket, Auth, Retry)         │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                            │
│   (Response Store, Variable Store, Config, Snapshots)      │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                     │
│    (Logger, Reporter, CLI, Decorators, Interceptors)       │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Detailed Folder Structure

```
RestifiedTS/
├── src/
│   ├── core/
│   │   ├── dsl/
│   │   │   ├── RestifiedTS.ts           # Main DSL entry point
│   │   │   ├── GivenStep.ts             # given() implementation
│   │   │   ├── WhenStep.ts              # when() implementation
│   │   │   └── ThenStep.ts              # then() implementation
│   │   ├── clients/
│   │   │   ├── HttpClient.ts            # Axios-based HTTP client
│   │   │   ├── GraphQLClient.ts         # GraphQL client
│   │   │   ├── WebSocketClient.ts       # WebSocket client
│   │   │   └── ClientManager.ts         # Multi-instance management
│   │   ├── stores/
│   │   │   ├── ResponseStore.ts         # Response storage
│   │   │   ├── VariableStore.ts         # Global/local variables
│   │   │   └── SnapshotStore.ts         # Response snapshots
│   │   ├── auth/
│   │   │   ├── AuthProvider.ts          # Base auth interface
│   │   │   ├── BearerAuth.ts            # Bearer token auth
│   │   │   └── BasicAuth.ts             # Basic auth
│   │   └── config/
│   │       ├── Config.ts                # Configuration management
│   │       └── ConfigLoader.ts          # Load from JSON/env
│   ├── utils/
│   │   ├── JsonPlaceholderResolver.ts   # {{var}} replacement
│   │   ├── FakerIntegration.ts          # Faker.js integration
│   │   ├── RetryManager.ts              # Retry logic
│   │   ├── WaitUtils.ts                 # Sleep/wait utilities
│   │   ├── ValidationUtils.ts           # JSON/XML validation
│   │   └── PerformanceMetrics.ts        # Response time tracking
│   ├── assertions/
│   │   ├── ChaiExtensions.ts            # Custom Chai matchers
│   │   ├── JsonAssertions.ts            # Deep JSON assertions
│   │   └── ResponseAssertions.ts        # HTTP response assertions
│   ├── decorators/
│   │   ├── TestTags.ts                  # @smoke, @regression tags
│   │   ├── TestMetadata.ts              # Test metadata storage
│   │   └── TagFilter.ts                 # Tag-based filtering
│   ├── logging/
│   │   ├── AuditLogger.ts               # Request/response logging
│   │   ├── TestLogger.ts                # Test execution logging
│   │   └── LoggerFactory.ts             # Logger configuration
│   ├── reporting/
│   │   ├── HtmlReporter.ts              # HTML report generation
│   │   ├── DiffReporter.ts              # Snapshot diff reporting
│   │   └── ReportGenerator.ts           # Report orchestration
│   ├── interceptors/
│   │   ├── RequestInterceptor.ts        # Request modification
│   │   ├── ResponseInterceptor.ts       # Response modification
│   │   └── InterceptorManager.ts        # Interceptor orchestration
│   ├── cli/
│   │   ├── RestifiedCLI.ts              # Main CLI entry
│   │   ├── TestGenerator.ts             # genTest command
│   │   ├── TagRunner.ts                 # --tags filtering
│   │   └── ConfigValidator.ts           # Config validation
│   └── types/
│       ├── RestifiedTypes.ts            # Core type definitions
│       ├── ConfigTypes.ts               # Configuration types
│       ├── ClientTypes.ts               # Client-related types
│       └── ReportTypes.ts               # Reporting types
├── tests/
│   ├── integration/
│   │   ├── api/
│   │   ├── graphql/
│   │   └── websocket/
│   ├── unit/
│   │   ├── core/
│   │   ├── utils/
│   │   └── assertions/
│   └── fixtures/
│       ├── responses/
│       ├── payloads/
│       └── config/
├── config/
│   ├── default.json                     # Default configuration
│   ├── development.json                 # Dev environment
│   ├── staging.json                     # Staging environment
│   └── production.json                  # Production environment
├── reports/                             # Generated reports
├── logs/                                # Audit and test logs
├── snapshots/                           # Response snapshots
├── .github/
│   └── workflows/
│       └── ci.yml                       # GitHub Actions CI
├── docker/
│   ├── Dockerfile                       # Docker setup
│   └── docker-compose.yml               # Docker compose for testing
├── package.json
├── tsconfig.json
├── mocha.opts
└── README.md
```

## 🔧 Core Components Design

### 1. DSL Layer - Fluent Interface

```typescript
// RestifiedTS.ts - Main entry point
export class RestifiedTS {
  private clientManager: ClientManager;
  private responseStore: ResponseStore;
  private variableStore: VariableStore;
  private config: Config;

  constructor(config?: Partial<RestifiedConfig>) {
    this.config = new Config(config);
    this.clientManager = new ClientManager(this.config);
    this.responseStore = new ResponseStore();
    this.variableStore = new VariableStore();
  }

  // Entry point for fluent DSL
  given(): GivenStep {
    return new GivenStep(this.clientManager, this.variableStore, this.config);
  }

  // Utility methods
  setGlobalVariable(key: string, value: any): void {
    this.variableStore.setGlobal(key, value);
  }

  getStoredResponse(key: string): any {
    return this.responseStore.get(key);
  }
}
```

### 2. Service Layer - HTTP Client

```typescript
// HttpClient.ts
export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  retryConfig: RetryConfig;
  authProvider?: AuthProvider;
  interceptors?: InterceptorConfig;
}

export class HttpClient {
  private axios: AxiosInstance;
  private retryManager: RetryManager;
  private auditLogger: AuditLogger;

  constructor(config: HttpClientConfig) {
    this.axios = this.createAxiosInstance(config);
    this.retryManager = new RetryManager(config.retryConfig);
    this.auditLogger = new AuditLogger();
  }

  async request(config: RequestConfig): Promise<RestifiedResponse> {
    const startTime = Date.now();
  
    try {
      const response = await this.retryManager.execute(
        () => this.axios.request(config)
      );
    
      const restifiedResponse = this.createRestifiedResponse(response, startTime);
      await this.auditLogger.logRequest(config, restifiedResponse);
    
      return restifiedResponse;
    } catch (error) {
      await this.auditLogger.logError(config, error);
      throw error;
    }
  }
}
```

### 3. Data Layer - Stores

```typescript
// ResponseStore.ts
export class ResponseStore {
  private responses: Map<string, RestifiedResponse> = new Map();
  private snapshots: Map<string, any> = new Map();

  store(key: string, response: RestifiedResponse): void {
    this.responses.set(key, response);
  }

  get(key: string): RestifiedResponse | undefined {
    return this.responses.get(key);
  }

  saveSnapshot(key: string, data: any): void {
    this.snapshots.set(key, data);
  }

  compareSnapshot(key: string, current: any): SnapshotDiff {
    const previous = this.snapshots.get(key);
    return new SnapshotDiff(previous, current);
  }
}

// VariableStore.ts
export class VariableStore {
  private globalVars: Map<string, any> = new Map();
  private localVars: Map<string, any> = new Map();

  setGlobal(key: string, value: any): void {
    this.globalVars.set(key, value);
  }

  setLocal(key: string, value: any): void {
    this.localVars.set(key, value);
  }

  resolve(key: string): any {
    return this.localVars.get(key) ?? this.globalVars.get(key);
  }
}
```

### 4. Infrastructure Layer - Decorators

```typescript
// TestTags.ts
export function smoke(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  addTag(target, propertyKey, 'smoke');
}

export function regression(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  addTag(target, propertyKey, 'regression');
}

export function tag(tagName: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    addTag(target, propertyKey, tagName);
  };
}

function addTag(target: any, propertyKey: string, tagName: string) {
  const existingTags = Reflect.getMetadata('tags', target, propertyKey) || [];
  Reflect.defineMetadata('tags', [...existingTags, tagName], target, propertyKey);
}
```

## 🔄 Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Test Suite    │───▶│   RestifiedTS   │───▶│   GivenStep     │
│                 │    │   (Entry Point) │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ThenStep      │◀───│    WhenStep     │◀───│  Variable Store │
│  (Assertions)   │    │   (Execution)   │    │   Resolution    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Chai Extensions │    │   HTTP Client   │    │JSON Placeholder │
│   & Assertions  │    │   (Axios)       │    │   Resolver      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Report Generator│    │ Response Store  │    │  Audit Logger   │
│   (HTML/JSON)   │    │   & Snapshots   │    │   (Disk I/O)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Key Design Patterns

### 1. **Fluent Interface Pattern**

* Each DSL step returns the next step in the chain
* Immutable step objects to prevent side effects
* Method chaining for readable test syntax

### 2. **Strategy Pattern**

* AuthProvider interface with multiple implementations
* Client abstractions for HTTP/GraphQL/WebSocket
* Configurable retry strategies

### 3. **Observer Pattern**

* Interceptors for request/response modification
* Event-driven logging and reporting
* Plugin architecture for extensibility

### 4. **Factory Pattern**

* ClientManager creates appropriate client instances
* LoggerFactory for different logging strategies
* ReportGenerator for various report formats

### 5. **Command Pattern**

* Request objects encapsulate HTTP operations
* Retry manager executes commands with backoff
* Interceptor chain processes commands

## 🚀 Extension Points

### 1. **Plugin System**

```typescript
export interface RestifiedPlugin {
  name: string;
  initialize(restified: RestifiedTS): void;
  beforeRequest?(config: RequestConfig): void;
  afterResponse?(response: RestifiedResponse): void;
}
```

### 2. **Custom Assertions**

```typescript
export interface CustomMatcher {
  name: string;
  matcher: (actual: any, expected: any) => boolean;
  message: (actual: any, expected: any) => string;
}
```

### 3. **Auth Providers**

```typescript
export interface AuthProvider {
  authenticate(config: RequestConfig): Promise<RequestConfig>;
  refreshToken?(): Promise<void>;
}
```

## 📊 Performance Considerations

* **Lazy Loading** : Load heavy dependencies only when needed
* **Connection Pooling** : Reuse HTTP connections via Axios
* **Async/Await** : Non-blocking I/O operations
* **Streaming** : Large response handling with streams
* **Caching** : Cache parsed configurations and templates

## 🔐 Security Considerations

* **Token Management** : Secure storage and rotation
* **SSL/TLS** : Configurable certificate validation
* **Proxy Support** : Corporate proxy configurations
* **Secrets** : Environment-based secret injection
* **Audit Trail** : Complete request/response logging

This architecture provides a solid foundation for RestifiedTS that's both extensible and maintainable, following TypeScript best practices while delivering on all the SRS requirements.

# 🚀 Introducing RestifiedTS – A Modern TypeScript Alternative to RestAssured

> 💡 *Build scalable, maintainable, and expressive API automation suites using only TypeScript.*

---

### 🔥 What is RestifiedTS?

**RestifiedTS** is a powerful, lightweight, and fully extensible API automation framework built in  **TypeScript** , designed as a battle-ready alternative to Java’s **RestAssured** — but with modern capabilities tailored for JavaScript/Node.js ecosystems.

It supports testing  **REST APIs** ,  **GraphQL** ,  **WebSockets** , and even mocking & snapshotting your API responses — all in a readable, expressive, and fluent syntax:

<pre class="overflow-visible!" data-start="773" data-end="999"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="flex items-center text-token-text-secondary px-4 py-2 text-xs font-sans justify-between h-9 bg-token-sidebar-surface-primary select-none rounded-t-2xl">ts</div><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"><button class="flex gap-1 items-center select-none py-1" aria-label="Copy"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon-xs"><path d="M12.668 10.667C12.668 9.95614 12.668 9.46258 12.6367 9.0791C12.6137 8.79732 12.5758 8.60761 12.5244 8.46387L12.4688 8.33399C12.3148 8.03193 12.0803 7.77885 11.793 7.60254L11.666 7.53125C11.508 7.45087 11.2963 7.39395 10.9209 7.36328C10.5374 7.33197 10.0439 7.33203 9.33301 7.33203H6.5C5.78896 7.33203 5.29563 7.33195 4.91211 7.36328C4.63016 7.38632 4.44065 7.42413 4.29688 7.47559L4.16699 7.53125C3.86488 7.68518 3.61186 7.9196 3.43555 8.20703L3.36524 8.33399C3.28478 8.49198 3.22795 8.70352 3.19727 9.0791C3.16595 9.46259 3.16504 9.95611 3.16504 10.667V13.5C3.16504 14.211 3.16593 14.7044 3.19727 15.0879C3.22797 15.4636 3.28473 15.675 3.36524 15.833L3.43555 15.959C3.61186 16.2466 3.86474 16.4807 4.16699 16.6348L4.29688 16.6914C4.44063 16.7428 4.63025 16.7797 4.91211 16.8027C5.29563 16.8341 5.78896 16.835 6.5 16.835H9.33301C10.0439 16.835 10.5374 16.8341 10.9209 16.8027C11.2965 16.772 11.508 16.7152 11.666 16.6348L11.793 16.5645C12.0804 16.3881 12.3148 16.1351 12.4688 15.833L12.5244 15.7031C12.5759 15.5594 12.6137 15.3698 12.6367 15.0879C12.6681 14.7044 12.668 14.211 12.668 13.5V10.667ZM13.998 12.665C14.4528 12.6634 14.8011 12.6602 15.0879 12.6367C15.4635 12.606 15.675 12.5492 15.833 12.4688L15.959 12.3975C16.2466 12.2211 16.4808 11.9682 16.6348 11.666L16.6914 11.5361C16.7428 11.3924 16.7797 11.2026 16.8027 10.9209C16.8341 10.5374 16.835 10.0439 16.835 9.33301V6.5C16.835 5.78896 16.8341 5.29563 16.8027 4.91211C16.7797 4.63025 16.7428 4.44063 16.6914 4.29688L16.6348 4.16699C16.4807 3.86474 16.2466 3.61186 15.959 3.43555L15.833 3.36524C15.675 3.28473 15.4636 3.22797 15.0879 3.19727C14.7044 3.16593 14.211 3.16504 13.5 3.16504H10.667C9.9561 3.16504 9.46259 3.16595 9.0791 3.19727C8.79739 3.22028 8.6076 3.2572 8.46387 3.30859L8.33399 3.36524C8.03176 3.51923 7.77886 3.75343 7.60254 4.04102L7.53125 4.16699C7.4508 4.32498 7.39397 4.53655 7.36328 4.91211C7.33985 5.19893 7.33562 5.54719 7.33399 6.00195H9.33301C10.022 6.00195 10.5791 6.00131 11.0293 6.03809C11.4873 6.07551 11.8937 6.15471 12.2705 6.34668L12.4883 6.46875C12.984 6.7728 13.3878 7.20854 13.6533 7.72949L13.7197 7.87207C13.8642 8.20859 13.9292 8.56974 13.9619 8.9707C13.9987 9.42092 13.998 9.97799 13.998 10.667V12.665ZM18.165 9.33301C18.165 10.022 18.1657 10.5791 18.1289 11.0293C18.0961 11.4302 18.0311 11.7914 17.8867 12.1279L17.8203 12.2705C17.5549 12.7914 17.1509 13.2272 16.6553 13.5313L16.4365 13.6533C16.0599 13.8452 15.6541 13.9245 15.1963 13.9619C14.8593 13.9895 14.4624 13.9935 13.9951 13.9951C13.9935 14.4624 13.9895 14.8593 13.9619 15.1963C13.9292 15.597 13.864 15.9576 13.7197 16.2939L13.6533 16.4365C13.3878 16.9576 12.9841 17.3941 12.4883 17.6982L12.2705 17.8203C11.8937 18.0123 11.4873 18.0915 11.0293 18.1289C10.5791 18.1657 10.022 18.165 9.33301 18.165H6.5C5.81091 18.165 5.25395 18.1657 4.80371 18.1289C4.40306 18.0962 4.04235 18.031 3.70606 17.8867L3.56348 17.8203C3.04244 17.5548 2.60585 17.151 2.30176 16.6553L2.17969 16.4365C1.98788 16.0599 1.90851 15.6541 1.87109 15.1963C1.83431 14.746 1.83496 14.1891 1.83496 13.5V10.667C1.83496 9.978 1.83432 9.42091 1.87109 8.9707C1.90851 8.5127 1.98772 8.10625 2.17969 7.72949L2.30176 7.51172C2.60586 7.0159 3.04236 6.6122 3.56348 6.34668L3.70606 6.28027C4.04237 6.136 4.40303 6.07083 4.80371 6.03809C5.14051 6.01057 5.53708 6.00551 6.00391 6.00391C6.00551 5.53708 6.01057 5.14051 6.03809 4.80371C6.0755 4.34588 6.15483 3.94012 6.34668 3.56348L6.46875 3.34473C6.77282 2.84912 7.20856 2.44514 7.72949 2.17969L7.87207 2.11328C8.20855 1.96886 8.56979 1.90385 8.9707 1.87109C9.42091 1.83432 9.978 1.83496 10.667 1.83496H13.5C14.1891 1.83496 14.746 1.83431 15.1963 1.87109C15.6541 1.90851 16.0599 1.98788 16.4365 2.17969L16.6553 2.30176C17.151 2.60585 17.5548 3.04244 17.8203 3.56348L17.8867 3.70606C18.031 4.04235 18.0962 4.40306 18.1289 4.80371C18.1657 5.25395 18.165 5.81091 18.165 6.5V9.33301Z"></path></svg>Copy</button><span class="" data-state="closed"><button class="flex items-center gap-1 py-1 select-none"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon-xs"><path d="M12.0303 4.11328C13.4406 2.70317 15.7275 2.70305 17.1377 4.11328C18.5474 5.52355 18.5476 7.81057 17.1377 9.2207L10.8457 15.5117C10.522 15.8354 10.2868 16.0723 10.0547 16.2627L9.82031 16.4395C9.61539 16.5794 9.39783 16.7003 9.1709 16.7998L8.94141 16.8916C8.75976 16.9582 8.57206 17.0072 8.35547 17.0518L7.59082 17.1865L5.19727 17.5859C5.05455 17.6097 4.90286 17.6358 4.77441 17.6455C4.67576 17.653 4.54196 17.6555 4.39648 17.6201L4.24707 17.5703C4.02415 17.4746 3.84119 17.3068 3.72559 17.0957L3.67969 17.0029C3.59322 16.8013 3.59553 16.6073 3.60547 16.4756C3.61519 16.3473 3.6403 16.1963 3.66406 16.0537L4.06348 13.6602C4.1638 13.0582 4.22517 12.6732 4.3584 12.3096L4.45117 12.0791C4.55073 11.8521 4.67152 11.6346 4.81152 11.4297L4.9873 11.1953C5.17772 10.9632 5.4146 10.728 5.73828 10.4043L12.0303 4.11328ZM6.67871 11.3447C6.32926 11.6942 6.14542 11.8803 6.01953 12.0332L5.90918 12.1797C5.81574 12.3165 5.73539 12.4618 5.66895 12.6133L5.60742 12.7666C5.52668 12.9869 5.48332 13.229 5.375 13.8789L4.97656 16.2725L4.97559 16.2744H4.97852L7.37207 15.875L8.08887 15.749C8.25765 15.7147 8.37336 15.6839 8.4834 15.6436L8.63672 15.5811C8.78817 15.5146 8.93356 15.4342 9.07031 15.3408L9.2168 15.2305C9.36965 15.1046 9.55583 14.9207 9.90527 14.5713L14.8926 9.58301L11.666 6.35742L6.67871 11.3447ZM16.1963 5.05371C15.3054 4.16304 13.8616 4.16305 12.9707 5.05371L12.6074 5.41602L15.833 8.64258L16.1963 8.2793C17.0869 7.38845 17.0869 5.94456 16.1963 5.05371Z"></path><path d="M4.58301 1.7832C4.72589 1.7832 4.84877 1.88437 4.87695 2.02441C4.99384 2.60873 5.22432 3.11642 5.58398 3.50391C5.94115 3.88854 6.44253 4.172 7.13281 4.28711C7.27713 4.3114 7.38267 4.43665 7.38281 4.58301C7.38281 4.7295 7.27723 4.8546 7.13281 4.87891C6.44249 4.99401 5.94116 5.27746 5.58398 5.66211C5.26908 6.00126 5.05404 6.43267 4.92676 6.92676L4.87695 7.1416C4.84891 7.28183 4.72601 7.38281 4.58301 7.38281C4.44013 7.38267 4.31709 7.28173 4.28906 7.1416C4.17212 6.55728 3.94179 6.04956 3.58203 5.66211C3.22483 5.27757 2.72347 4.99395 2.0332 4.87891C1.88897 4.85446 1.7832 4.72938 1.7832 4.58301C1.78335 4.43673 1.88902 4.3115 2.0332 4.28711C2.72366 4.17203 3.22481 3.88861 3.58203 3.50391C3.94186 3.11638 4.17214 2.60888 4.28906 2.02441L4.30371 1.97363C4.34801 1.86052 4.45804 1.78333 4.58301 1.7832Z"></path></svg>Edit</button></span></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-ts"><span><span>const</span><span> response = </span><span>await</span><span></span><span>given</span><span>(mainAppClient)
  .</span><span>withHeaders</span><span>({ </span><span>Authorization</span><span>: </span><span>`Bearer ${token}</span><span>` })
  .</span><span>withBody</span><span>({ </span><span>name</span><span>: </span><span>'Raj'</span><span> })
  .</span><span>post</span><span>(</span><span>'/users'</span><span>);

response.</span><span>should</span><span>.</span><span>haveStatus</span><span>(</span><span>201</span><span>);
response.</span><span>body</span><span>().</span><span>should</span><span>.</span><span>haveKey</span><span>(</span><span>'id'</span><span>);
</span></span></code></div></div></pre>

---

### ⚙️ Why Use RestifiedTS?

✅ 100% written in **TypeScript**

✅ Follows **Fluent DSL** style: `given().when().then()`

✅ Works seamlessly with  **Mocha** ,  **BDD tags** , and **multiple environments**

✅ Logs **request & response** payloads automatically

✅ Supports  **dynamic payloads** ,  **Faker.js** , and **JSON placeholders**

✅ Comes with  **GraphQL** ,  **WebSocket** , and **Mock server** support

✅ Offers  **snapshot testing** ,  **OpenAPI validation** , and **custom assertion wrappers**

---

### ✨ Who is it for?

* QA Engineers migrating from **Java + RestAssured**
* TypeScript lovers who want more control over API testing
* Teams working in  **microservices** ,  **contract testing** , or **CI pipelines**
* Anyone tired of writing flaky Postman/Newman tests or complex Axios wrappers

---

### 🧩 Key Use Cases

| Feature                           | Use Case                                              |
| --------------------------------- | ----------------------------------------------------- |
| Multi-client testing              | Automate APIs across 2–3 services or tenants         |
| BDD tagging (@smoke, @regression) | Group tests and run based on CI filters               |
| Response chaining                 | Extract data from previous call to use in next        |
| Dynamic payload injection         | Insert random but valid data in JSONs                 |
| Retry logic                       | Auto-retry flaky calls or wait until server is up     |
| HTML reports                      | Lightweight dashboard view without heavy dependencies |
| Plugin-ready                      | Future: Plug in Swagger/OpenAPI spec, retry plugins   |

---

### 🚀 Quick Start

<pre class="overflow-visible!" data-start="2698" data-end="2794"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="flex items-center text-token-text-secondary px-4 py-2 text-xs font-sans justify-between h-9 bg-token-sidebar-surface-primary select-none rounded-t-2xl">bash</div><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"><button class="flex gap-1 items-center select-none py-1" aria-label="Copy"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon-xs"><path d="M12.668 10.667C12.668 9.95614 12.668 9.46258 12.6367 9.0791C12.6137 8.79732 12.5758 8.60761 12.5244 8.46387L12.4688 8.33399C12.3148 8.03193 12.0803 7.77885 11.793 7.60254L11.666 7.53125C11.508 7.45087 11.2963 7.39395 10.9209 7.36328C10.5374 7.33197 10.0439 7.33203 9.33301 7.33203H6.5C5.78896 7.33203 5.29563 7.33195 4.91211 7.36328C4.63016 7.38632 4.44065 7.42413 4.29688 7.47559L4.16699 7.53125C3.86488 7.68518 3.61186 7.9196 3.43555 8.20703L3.36524 8.33399C3.28478 8.49198 3.22795 8.70352 3.19727 9.0791C3.16595 9.46259 3.16504 9.95611 3.16504 10.667V13.5C3.16504 14.211 3.16593 14.7044 3.19727 15.0879C3.22797 15.4636 3.28473 15.675 3.36524 15.833L3.43555 15.959C3.61186 16.2466 3.86474 16.4807 4.16699 16.6348L4.29688 16.6914C4.44063 16.7428 4.63025 16.7797 4.91211 16.8027C5.29563 16.8341 5.78896 16.835 6.5 16.835H9.33301C10.0439 16.835 10.5374 16.8341 10.9209 16.8027C11.2965 16.772 11.508 16.7152 11.666 16.6348L11.793 16.5645C12.0804 16.3881 12.3148 16.1351 12.4688 15.833L12.5244 15.7031C12.5759 15.5594 12.6137 15.3698 12.6367 15.0879C12.6681 14.7044 12.668 14.211 12.668 13.5V10.667ZM13.998 12.665C14.4528 12.6634 14.8011 12.6602 15.0879 12.6367C15.4635 12.606 15.675 12.5492 15.833 12.4688L15.959 12.3975C16.2466 12.2211 16.4808 11.9682 16.6348 11.666L16.6914 11.5361C16.7428 11.3924 16.7797 11.2026 16.8027 10.9209C16.8341 10.5374 16.835 10.0439 16.835 9.33301V6.5C16.835 5.78896 16.8341 5.29563 16.8027 4.91211C16.7797 4.63025 16.7428 4.44063 16.6914 4.29688L16.6348 4.16699C16.4807 3.86474 16.2466 3.61186 15.959 3.43555L15.833 3.36524C15.675 3.28473 15.4636 3.22797 15.0879 3.19727C14.7044 3.16593 14.211 3.16504 13.5 3.16504H10.667C9.9561 3.16504 9.46259 3.16595 9.0791 3.19727C8.79739 3.22028 8.6076 3.2572 8.46387 3.30859L8.33399 3.36524C8.03176 3.51923 7.77886 3.75343 7.60254 4.04102L7.53125 4.16699C7.4508 4.32498 7.39397 4.53655 7.36328 4.91211C7.33985 5.19893 7.33562 5.54719 7.33399 6.00195H9.33301C10.022 6.00195 10.5791 6.00131 11.0293 6.03809C11.4873 6.07551 11.8937 6.15471 12.2705 6.34668L12.4883 6.46875C12.984 6.7728 13.3878 7.20854 13.6533 7.72949L13.7197 7.87207C13.8642 8.20859 13.9292 8.56974 13.9619 8.9707C13.9987 9.42092 13.998 9.97799 13.998 10.667V12.665ZM18.165 9.33301C18.165 10.022 18.1657 10.5791 18.1289 11.0293C18.0961 11.4302 18.0311 11.7914 17.8867 12.1279L17.8203 12.2705C17.5549 12.7914 17.1509 13.2272 16.6553 13.5313L16.4365 13.6533C16.0599 13.8452 15.6541 13.9245 15.1963 13.9619C14.8593 13.9895 14.4624 13.9935 13.9951 13.9951C13.9935 14.4624 13.9895 14.8593 13.9619 15.1963C13.9292 15.597 13.864 15.9576 13.7197 16.2939L13.6533 16.4365C13.3878 16.9576 12.9841 17.3941 12.4883 17.6982L12.2705 17.8203C11.8937 18.0123 11.4873 18.0915 11.0293 18.1289C10.5791 18.1657 10.022 18.165 9.33301 18.165H6.5C5.81091 18.165 5.25395 18.1657 4.80371 18.1289C4.40306 18.0962 4.04235 18.031 3.70606 17.8867L3.56348 17.8203C3.04244 17.5548 2.60585 17.151 2.30176 16.6553L2.17969 16.4365C1.98788 16.0599 1.90851 15.6541 1.87109 15.1963C1.83431 14.746 1.83496 14.1891 1.83496 13.5V10.667C1.83496 9.978 1.83432 9.42091 1.87109 8.9707C1.90851 8.5127 1.98772 8.10625 2.17969 7.72949L2.30176 7.51172C2.60586 7.0159 3.04236 6.6122 3.56348 6.34668L3.70606 6.28027C4.04237 6.136 4.40303 6.07083 4.80371 6.03809C5.14051 6.01057 5.53708 6.00551 6.00391 6.00391C6.00551 5.53708 6.01057 5.14051 6.03809 4.80371C6.0755 4.34588 6.15483 3.94012 6.34668 3.56348L6.46875 3.34473C6.77282 2.84912 7.20856 2.44514 7.72949 2.17969L7.87207 2.11328C8.20855 1.96886 8.56979 1.90385 8.9707 1.87109C9.42091 1.83432 9.978 1.83496 10.667 1.83496H13.5C14.1891 1.83496 14.746 1.83431 15.1963 1.87109C15.6541 1.90851 16.0599 1.98788 16.4365 2.17969L16.6553 2.30176C17.151 2.60585 17.5548 3.04244 17.8203 3.56348L17.8867 3.70606C18.031 4.04235 18.0962 4.40306 18.1289 4.80371C18.1657 5.25395 18.165 5.81091 18.165 6.5V9.33301Z"></path></svg>Copy</button><span class="" data-state="closed"><button class="flex items-center gap-1 py-1 select-none"><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon-xs"><path d="M12.0303 4.11328C13.4406 2.70317 15.7275 2.70305 17.1377 4.11328C18.5474 5.52355 18.5476 7.81057 17.1377 9.2207L10.8457 15.5117C10.522 15.8354 10.2868 16.0723 10.0547 16.2627L9.82031 16.4395C9.61539 16.5794 9.39783 16.7003 9.1709 16.7998L8.94141 16.8916C8.75976 16.9582 8.57206 17.0072 8.35547 17.0518L7.59082 17.1865L5.19727 17.5859C5.05455 17.6097 4.90286 17.6358 4.77441 17.6455C4.67576 17.653 4.54196 17.6555 4.39648 17.6201L4.24707 17.5703C4.02415 17.4746 3.84119 17.3068 3.72559 17.0957L3.67969 17.0029C3.59322 16.8013 3.59553 16.6073 3.60547 16.4756C3.61519 16.3473 3.6403 16.1963 3.66406 16.0537L4.06348 13.6602C4.1638 13.0582 4.22517 12.6732 4.3584 12.3096L4.45117 12.0791C4.55073 11.8521 4.67152 11.6346 4.81152 11.4297L4.9873 11.1953C5.17772 10.9632 5.4146 10.728 5.73828 10.4043L12.0303 4.11328ZM6.67871 11.3447C6.32926 11.6942 6.14542 11.8803 6.01953 12.0332L5.90918 12.1797C5.81574 12.3165 5.73539 12.4618 5.66895 12.6133L5.60742 12.7666C5.52668 12.9869 5.48332 13.229 5.375 13.8789L4.97656 16.2725L4.97559 16.2744H4.97852L7.37207 15.875L8.08887 15.749C8.25765 15.7147 8.37336 15.6839 8.4834 15.6436L8.63672 15.5811C8.78817 15.5146 8.93356 15.4342 9.07031 15.3408L9.2168 15.2305C9.36965 15.1046 9.55583 14.9207 9.90527 14.5713L14.8926 9.58301L11.666 6.35742L6.67871 11.3447ZM16.1963 5.05371C15.3054 4.16304 13.8616 4.16305 12.9707 5.05371L12.6074 5.41602L15.833 8.64258L16.1963 8.2793C17.0869 7.38845 17.0869 5.94456 16.1963 5.05371Z"></path><path d="M4.58301 1.7832C4.72589 1.7832 4.84877 1.88437 4.87695 2.02441C4.99384 2.60873 5.22432 3.11642 5.58398 3.50391C5.94115 3.88854 6.44253 4.172 7.13281 4.28711C7.27713 4.3114 7.38267 4.43665 7.38281 4.58301C7.38281 4.7295 7.27723 4.8546 7.13281 4.87891C6.44249 4.99401 5.94116 5.27746 5.58398 5.66211C5.26908 6.00126 5.05404 6.43267 4.92676 6.92676L4.87695 7.1416C4.84891 7.28183 4.72601 7.38281 4.58301 7.38281C4.44013 7.38267 4.31709 7.28173 4.28906 7.1416C4.17212 6.55728 3.94179 6.04956 3.58203 5.66211C3.22483 5.27757 2.72347 4.99395 2.0332 4.87891C1.88897 4.85446 1.7832 4.72938 1.7832 4.58301C1.78335 4.43673 1.88902 4.3115 2.0332 4.28711C2.72366 4.17203 3.22481 3.88861 3.58203 3.50391C3.94186 3.11638 4.17214 2.60888 4.28906 2.02441L4.30371 1.97363C4.34801 1.86052 4.45804 1.78333 4.58301 1.7832Z"></path></svg>Edit</button></span></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-bash"><span><span>npx degit codershub-ai/restifiedts my-api-tests
</span><span>cd</span><span> my-api-tests
npm install
npm </span><span>test</span><span>
</span></span></code></div></div></pre>

---

### 📊 Sample Report

* 📘 Mocha HTML Reports
* 📌 Request Logs (`logs/`)
* 📎 Response Snapshots (`snapshots/`)
* 📊 Diff Dashboards (soon)

---

### 🌐 Roadmap Preview

* [X] Fluent API chaining
* [X] GraphQL + WebSocket support
* [X] Dynamic JSON builder
* [X] Retry and wait utils
* [X] Tag-based test filtering
* [ ] Swagger test stub generator
* [ ] Plugin support for decorators + plugins
* [ ] CI templates with Docker, GitHub Actions

## ✅ RestifiedTS Feature Implementation Tracker (2025)

This document tracks the status of all features planned and implemented for the RestifiedTS framework.

## ✅ Implemented Core Features

| ✅ Feature                         | Location / Module          | Priority  | Description                                               |
| ---------------------------------- | -------------------------- | --------- | --------------------------------------------------------- |
| FluentDSL.ts                       | src/core/FluentDSL.ts      | ⭐ High   | Fluent chaining like RestAssured – given().when().then() |
| Multi-instance HTTP Client         | src/core/ContextManager.ts | ⭐ High   | Manage multiple API clients for different services        |
| Response Store                     | src/core/ResponseStore.ts  | ⭐ High   | Save and reuse responses across test chains               |
| PayloadBuilder                     | utils/PayloadBuilder.ts    | ⭐ High   | Dynamic JSON payloads using faker and placeholder support |
| Global/Local Variable Store        | utils/VariableStore.ts     | ⭐ High   | Scoped variables for chaining or test re-use              |
| Audit Logger                       | utils/AuditLogger.ts       | ⭐ Medium | Logs request & response to file                           |
| Deep Assertions                    | utils/AssertionUtils.ts    | ⭐ High   | Custom chai-based deep comparison utilities               |
| Retry Support                      | src/core/HTTPClient.ts     | ⭐ High   | Auto-retry logic for network failures                     |
| Global Configuration               | config/*.json              | ⭐ High   | Per-env config (dev, staging, prod)                       |
| Test Examples (Multiple Instances) | tests/integration          | ⭐ High   | Usage of multi-client tests with chaining & overrides     |
| Wait / Sleep                       | utils/WaitUtil.ts          | ⭐ Medium | waitFor(ms) utility for async flows                       |
| JSON Placeholder Resolution        | utils/PayloadBuilder.ts    | ⭐ High   | Use {{varName}} or {{faker.name.firstName}} in payloads   |
| Response Snapshot Testing          | utils/ResponseSnapshot.ts  | ⭐ Medium | Compare new responses against saved snapshots             |
| HTML Reporter (Lightweight)        | mochawesome integrated     | ⭐ Medium | Clear report with step logs & results                     |
| Tag-Based Skipping (Soon)          | decorators/test.ts         | ⭐ High   | BDD tagging like @smoke, @regression                      |
| Mocha Test Hooks                   | .mocharc.ts                | ⭐ Medium | beforeAll, afterAll, beforeEach, afterEach hooks          |
| Unique Response Storage            | ResponseStore              | ⭐ High   | Store responses with custom keys without overwriting      |

---

### ❗ Missing or To-Do Features

| Feature                              | Needed In                                            | Priority  | Status         |
| ------------------------------------ | ---------------------------------------------------- | --------- | -------------- |
| FluentDSL.ts                         | src/core/FluentDSL.ts                                | ⭐ High   | ✅ Implemented |
| WebSocket support                    | utils/WebSocketClient.ts                             | ⭐ High   | ✅ Implemented |
| GraphQL support                      | utils/GraphQLClient.ts                               | ⭐ High   | ✅ Implemented |
| Mock server                          | utils/MockServer.ts using express or json-server     | ⭐ High   | ✅ Implemented |
| TypeScript decorators for tagging    | @test() decorator engine                             | ⭐ High   | ⏳ Pending     |
| Test runner with tag-based filtering | Tag parsing logic in mocha or ts-node                | ⭐ High   | ⏳ Pending     |
| Performance metrics tracking         | utils/PerformanceMetrics.ts → time-based assertions | ⭐ High   | ⏳ Pending     |
| Rate-limiting simulator              | utils/RateLimiter.ts with delayed calls              | ⭐ Medium | ⏳ Pending     |
| XML parsing support                  | utils/XmlParser.ts (for SOAP or hybrid APIs)         | ⭐ Medium | ⏳ Pending     |
| GPath-style JSON extractor           | utils/JsonExtractor.ts (like res.body.data.id)       | ⭐ Medium | ⏳ Pending     |
| File uploader (multipart/form-data)  | utils/FileUploader.ts                                | ⭐ Medium | ⏳ Pending     |
| Auth provider (Bearer/Basic)         | utils/AuthProvider.ts                                | ⭐ Medium | ⏳ Pending     |
| SSL config overrides                 | utils/SslConfig.ts                                   | ⭐ Medium | ⏳ Pending     |
| Proxy support                        | utils/ProxyManager.ts                                | ⭐ Medium | ⏳ Pending     |
| Interceptor support                  | utils/InterceptorManager.ts                          | ⭐ Medium | ⏳ Pending     |
| Rate-limit resilience logic          | Built-in per-client throttle handling                | ⭐ Medium | ⏳ Pending     |
| generateDiffDashboard.ts             | HTML UI for versioned test comparisons               | ⭐ Medium | ⏳ Pending     |

---

### 🔖 Suggested Enhancements

| Feature                     | Description                                                   | Status     |
| --------------------------- | ------------------------------------------------------------- | ---------- |
| Plugin architecture         | Support plug-n-play for JSON Schema, GraphQL queries, etc.    | ⏳ Planned |
| Codegen/OpenAPI import      | Import Swagger/OpenAPI spec and generate test stubs           | ⏳ Planned |
| Type-safe GraphQL           | Auto-generate types from GraphQL schema                       | ⏳ Planned |
| HTML Dashboard              | Beautiful diff-dashboard.html for visual diffs (built in CLI) | ⏳ Planned |
| Test Retry on Status Code   | Retry if 5xx or 429                                           | ⏳ Planned |
| Swagger/OpenAPI Generator   | Convert OpenAPI spec to test templates                        | ⭐ Medium  |
| Type-Safe GraphQL Generator | Build types from GraphQL schema                               | ⭐ Medium  |
| Rate Limiting Simulator     | Simulate throttled/slow endpoints                             | ⭐ Medium  |
| Plugin Architecture         | Add or remove modules like schema validator                   | ⭐ Medium  |
| Retry on Status Code        | Retry 5xx, 429, etc. with delay + backoff                     | ⭐ Medium  |
| HTML Dashboard for Diffing  | Visual HTML snapshot comparison dashboard                     | ⭐ Medium  |

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
