# 🚀 RestifiedTS – Modern API Testing Framework

A production-grade API testing framework built in TypeScript, inspired by Java's RestAssured. Provides a fluent DSL for testing REST APIs, GraphQL endpoints, and WebSocket connections with comprehensive features including multi-client support, snapshot testing, variable resolution, and extensive reporting capabilities.

[![npm version](https://badge.fury.io/js/restifiedts.svg)](https://badge.fury.io/js/restifiedts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

## ✨ Key Features

✅ **Fluent DSL** - Clean `given().when().then()` syntax  
✅ **TypeScript First** - Full type safety and IntelliSense support  
✅ **Multi-Protocol** - REST, GraphQL, and WebSocket testing  
✅ **Multi-Client** - Test multiple services in a single suite  
✅ **Variable Resolution** - Dynamic payloads with Faker.js integration  
✅ **Snapshot Testing** - Compare responses against saved baselines  
✅ **Comprehensive Reporting** - HTML reports with diff visualization  
✅ **Retry Logic** - Built-in retry mechanisms with exponential backoff  
✅ **Authentication** - Bearer, Basic, and custom auth providers  
✅ **Performance Testing** - Response time assertions and metrics  

## 📦 Installation

```bash
npm install restifiedts
```

## 🚀 Quick Start

```typescript
import { restified } from 'restifiedts';

describe('API Tests', () => {
  it('should get user successfully', async () => {
    const result = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
      .when()
        .get('/users/1')
      .then()
        .statusCode(200)
        .jsonPath('$.name', 'Leanne Graham')
        .extract('$.id', 'userId')
      .execute();
      
    expect(result.status).to.equal(200);
  });
});
```

## 🎯 Core DSL Usage

### Basic HTTP Operations

```typescript
// GET Request
await restified
  .given()
    .baseURL('https://api.example.com')
    .header('Authorization', 'Bearer {{token}}')
  .when()
    .get('/users')
  .then()
    .statusCode(200)
    .contentType('application/json')
  .execute();

// POST Request with Body
await restified
  .given()
    .baseURL('https://api.example.com')
    .header('Content-Type', 'application/json')
    .body({
      name: 'John Doe',
      email: 'john@example.com'
    })
  .when()
    .post('/users')
  .then()
    .statusCode(201)
    .extract('$.id', 'newUserId')
  .execute();
```

### Advanced Variable Resolution

```typescript
// Using variables and Faker.js
await restified
  .given()
    .baseURL('https://api.example.com')
    .variable('userId', '12345')
    .body({
      id: '{{$random.uuid}}',
      name: '{{$faker.name.fullName}}',
      email: '{{$faker.internet.email}}',
      createdAt: '{{$date.now}}',
      environment: '{{$env.NODE_ENV}}'
    })
  .when()
    .put('/users/{{userId}}')
  .then()
    .statusCode(200)
  .execute();
```

### Multi-Client Architecture

```typescript
// Create multiple clients for different services
restified.createClient('authService', {
  baseURL: 'https://auth.example.com',
  timeout: 3000
});

restified.createClient('userService', {
  baseURL: 'https://users.example.com',
  timeout: 5000
});

// Use different clients in tests
await restified
  .given()
    .useClient('authService')
    .body({ username: 'admin', password: 'secret' })
  .when()
    .post('/login')
  .then()
    .statusCode(200)
    .extract('$.token', 'authToken')
  .execute();

await restified
  .given()
    .useClient('userService')
    .bearerToken('{{authToken}}')
  .when()
    .get('/profile')
  .then()
    .statusCode(200)
  .execute();
```

## 🔧 Authentication

### Bearer Token Authentication

```typescript
await restified
  .given()
    .baseURL('https://api.example.com')
    .bearerToken('your-jwt-token')
  .when()
    .get('/protected')
  .then()
    .statusCode(200)
  .execute();
```

### Basic Authentication

```typescript
await restified
  .given()
    .baseURL('https://api.example.com')
    .basicAuth('username', 'password')
  .when()
    .get('/protected')
  .then()
    .statusCode(200)
  .execute();
```

### API Key Authentication

```typescript
await restified
  .given()
    .baseURL('https://api.example.com')
    .apiKey('X-API-Key', 'your-api-key')
  .when()
    .get('/protected')
  .then()
    .statusCode(200)
  .execute();
```

## 🔍 GraphQL Testing

```typescript
// GraphQL Query
const query = `
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
      posts {
        title
      }
    }
  }
`;

await restified
  .given()
    .baseURL('https://api.example.com')
    .header('Content-Type', 'application/json')
  .when()
    .graphql(query, { id: '1' })
    .post('/graphql')
  .then()
    .statusCode(200)
    .jsonPath('$.data.user.name', 'John Doe')
  .execute();

// GraphQL Mutation
const mutation = `
  mutation CreateUser($input: UserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`;

await restified
  .given()
    .baseURL('https://api.example.com')
  .when()
    .graphqlMutation(mutation, {
      input: { name: 'Jane Doe', email: 'jane@example.com' }
    })
    .post('/graphql')
  .then()
    .statusCode(200)
    .extract('$.data.createUser.id', 'userId')
  .execute();
```

## 🌐 WebSocket Testing

```typescript
// Add WebSocket connection
restified.addWebSocketConnection({
  name: 'main-ws',
  url: 'wss://echo.websocket.org',
  protocols: ['echo-protocol'],
  timeout: 5000
});

// Connect and send messages
await restified.connectWebSocket('main-ws');
await restified.sendWebSocketText('Hello WebSocket!', 'main-ws');

// Wait for response
const response = await restified.waitForWebSocketMessage(
  (message) => message === 'Hello WebSocket!',
  'main-ws'
);

expect(response).to.equal('Hello WebSocket!');
```

## 📊 Snapshot Testing

```typescript
// Create baseline snapshot
await restified
  .given()
    .baseURL('https://api.example.com')
  .when()
    .get('/users')
  .then()
    .statusCode(200)
    .snapshot('users-baseline')
  .execute();

// Compare against snapshot in subsequent runs
await restified
  .given()
    .baseURL('https://api.example.com')
  .when()
    .get('/users')
  .then()
    .statusCode(200)
    .snapshot('users-current')
  .execute();
```

## 🏋️ Performance Testing

```typescript
// Response time assertions
await restified
  .given()
    .baseURL('https://api.example.com')
  .when()
    .get('/heavy-operation')
  .then()
    .statusCode(200)
    .responseTime(2000) // Assert response time < 2 seconds
  .execute();

// Load testing simulation
const promises = Array.from({ length: 10 }, (_, i) =>
  restified
    .given()
      .baseURL('https://api.example.com')
      .variable('requestId', i)
    .when()
      .get('/load-test/{{requestId}}')
    .then()
      .statusCode(200)
      .responseTime(5000)
    .execute()
);

await Promise.all(promises);
```

## 🔧 Configuration

Create configuration files for different environments:

```typescript
// config/default.json
{
  "baseURL": "https://api.example.com",
  "timeout": 30000,
  "retryConfig": {
    "maxRetries": 3,
    "backoffFactor": 2,
    "retryDelay": 1000,
    "retryStatusCodes": [408, 429, 500, 502, 503, 504]
  },
  "logging": {
    "level": "info",
    "auditEnabled": true,
    "auditPath": "./logs/audit.log",
    "console": true
  },
  "reporting": {
    "enabled": true,
    "format": "html",
    "outputPath": "./reports",
    "includeSnapshots": true
  }
}
```

```typescript
// Initialize with configuration
import { RestifiedTS } from 'restifiedts';

const restified = new RestifiedTS({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  logging: {
    level: 'debug',
    console: true
  }
});
```

## 📝 Test Organization

### Setup and Teardown

```typescript
describe('User API Tests', () => {
  let restified: RestifiedTS;

  beforeAll(async () => {
    restified = new RestifiedTS({
      baseURL: process.env.API_BASE_URL || 'https://api.example.com'
    });
    
    // Global setup - authenticate
    await restified
      .given()
        .body({ username: 'admin', password: 'secret' })
      .when()
        .post('/auth/login')
      .then()
        .statusCode(200)
        .extract('$.token', 'globalAuthToken')
      .execute();
  });

  beforeEach(() => {
    // Reset local variables before each test
    restified.clearLocalVariables();
  });

  afterEach(async () => {
    // Cleanup test data after each test
    if (restified.getVariable('createdUserId')) {
      await restified
        .given()
          .bearerToken('{{globalAuthToken}}')
        .when()
          .delete('/users/{{createdUserId}}')
        .then()
          .statusCode(204)
        .execute();
    }
  });

  afterAll(async () => {
    // Global cleanup
    await restified.cleanup();
  });

  it('should create user successfully', async () => {
    await restified
      .given()
        .bearerToken('{{globalAuthToken}}')
        .body({
          name: '{{$faker.name.fullName}}',
          email: '{{$faker.internet.email}}'
        })
      .when()
        .post('/users')
      .then()
        .statusCode(201)
        .extract('$.id', 'createdUserId')
      .execute();
  });
});
```

## 📋 Generate Sample Tests

Once installed as an npm package, generate sample test files in your project:

```bash
# Initialize RestifiedTS in your project
npx restifiedts init

# Generate sample test files
npx restifiedts generate --type api --name UserAPI
npx restifiedts generate --type graphql --name UserGraphQL
npx restifiedts generate --type websocket --name ChatWebSocket

# Generate complete test suite
npx restifiedts scaffold --service UserService
```

This will create:
- `tests/api/UserAPI.test.ts` - REST API test template
- `tests/graphql/UserGraphQL.test.ts` - GraphQL test template  
- `tests/websocket/ChatWebSocket.test.ts` - WebSocket test template
- `tests/setup/` - Setup and teardown utilities
- `config/` - Environment configuration files

## 🎯 Advanced Features

### Data-Driven Testing

```typescript
const testData = [
  { userId: 1, expectedName: 'John Doe' },
  { userId: 2, expectedName: 'Jane Smith' },
  { userId: 3, expectedName: 'Bob Johnson' }
];

for (const data of testData) {
  it(`should get user ${data.userId}`, async () => {
    await restified
      .given()
        .baseURL('https://api.example.com')
        .variable('userId', data.userId)
        .variable('expectedName', data.expectedName)
      .when()
        .get('/users/{{userId}}')
      .then()
        .statusCode(200)
        .jsonPath('$.name', '{{expectedName}}')
      .execute();
  });
}
```

### Contract Testing

```typescript
// Save API response as contract
await restified
  .given()
    .baseURL('https://api.example.com')
  .when()
    .get('/api/v1/schema')
  .then()
    .statusCode(200)
    .snapshot('api-v1-contract')
  .execute();

// Verify contract compliance in other tests
await restified
  .given()
    .baseURL('https://api.example.com')
  .when()
    .get('/api/v1/users')
  .then()
    .statusCode(200)
    .jsonPath('$.schema.version', '1.0')
  .execute();
```

## 📊 Reporting

RestifiedTS generates comprehensive HTML reports with:
- Request/response details
- Execution timeline
- Failure stacktraces
- Performance metrics
- Snapshot diffs
- Variable resolution logs

```bash
# Generate reports
npm run test
# View reports at ./reports/index.html
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Java's RestAssured framework
- Built with TypeScript, Axios, Mocha, and Chai
- Uses Faker.js for dynamic data generation
- Powered by the Node.js ecosystem

---

**RestifiedTS** - Modern API testing for the TypeScript era 🚀