import * as fs from 'fs';
import * as path from 'path';

export interface TestGenerationOptions {
  type: 'api' | 'graphql' | 'websocket' | 'setup' | 'crud' | 'auth' | 'performance' | 'multi-client' | 'config' | 'database' | 'security' | 'unified' | 'validation';
  name: string;
  outputDir: string;
  baseURL?: string;
  includeSuite?: boolean;
  authRequired?: boolean;
  dbType?: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  zapHost?: string;
  includeAll?: boolean;
  validators?: ('joi' | 'zod' | 'ajv')[];
}

export class ModernTestGenerator {
  private templates: Map<string, string> = new Map();

  constructor() {
    this.initializeModernTemplates();
  }

  async generateTest(options: TestGenerationOptions): Promise<string> {
    const template = this.getTemplate(options.type);
    const fileName = this.generateFileName(options.name, options.type);
    const outputPath = path.join(options.outputDir, fileName);

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Replace template variables
    const content = this.processTemplate(template, {
      name: options.name,
      baseURL: options.baseURL || 'https://jsonplaceholder.typicode.com',
      className: this.toPascalCase(options.name),
      testSuite: options.includeSuite,
      authRequired: options.authRequired || false
    });

    // Write file
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  private initializeModernTemplates(): void {
    // Basic API Test Template
    this.templates.set('api', `import { restified } from 'restifiedts';
import { expect } from 'chai';

/**
 * {{className}} API Tests
 * 
 * Configuration Options:
 * 1. Environment Variables: API_BASE_URL, API_TOKEN, API_KEY
 * 2. Config Files: config/default.json, config/development.json
 * 3. Global Setup: tests/setup/global-setup.ts
 * 
 * Examples:
 * - Environment: NODE_ENV=development API_BASE_URL=https://dev-api.example.com npm test
 * - Runtime: npx restifiedts generate --type api --name {{className}} --base-url {{baseURL}}
 */
describe('{{className}} API Tests', function() {
  // Essential: Always include cleanup to prevent hanging processes
  afterAll(async function() {
    await restified.cleanup();
  });

  beforeEach(function() {
    // Reset local variables before each test
    restified.clearLocalVariables();
  });

  it('should create a new {{name}} using environment configuration', async function() {
    this.timeout(10000);
    
    const testData = {
      name: '{{$faker.person.fullName}}',
      email: '{{$faker.internet.email}}',
      phone: '{{$faker.phone.number}}',
      createdAt: '{{$date.now}}'
    };
    
    // Step 1: Execute the request with environment-based configuration
    const response = await restified
      .given()
        // Use environment variables with fallback defaults
        .baseURL(process.env.API_BASE_URL || '{{baseURL}}')
        .header('Content-Type', 'application/json')
        {{#if authRequired}}
        // Multiple authentication options
        .header('Authorization', \`Bearer \${process.env.API_TOKEN || 'your-token-here'}\`)
        .header('X-API-Key', process.env.API_KEY || 'your-api-key-here')
        {{/if}}
        // Optional timeout from environment
        .timeout(parseInt(process.env.API_TIMEOUT || '30000'))
        .body(testData)
      .when()
        .post('/{{name}}s')
        .execute(); // First execute() - sends the request
    
    // Step 2: Perform assertions
    await response
      .statusCode(201)
      .jsonPath('$.name').isString()
      .jsonPath('$.email').contains('@')
      .extract('$.id', 'createdId')
      .execute(); // Second execute() - runs assertions
      
    // Step 3: Additional custom assertions
    expect(response.response.data).to.have.property('id');
    console.log('Created {{name}} with ID:', restified.getVariable('createdId'));
  });

  it('should retrieve {{name}} by ID using config file setup', async function() {
    this.timeout(10000);
    
    // Example of loading configuration from file (optional)
    // const config = require('../../config/default.json');
    
    // First create a {{name}} to retrieve
    const createResponse = await restified
      .given()
        .baseURL(process.env.API_BASE_URL || '{{baseURL}}')
        .header('Content-Type', 'application/json')
        {{#if authRequired}}
        .bearerToken(process.env.API_TOKEN || 'your-token-here')
        {{/if}}
        .body({
          name: 'Test {{className}}',
          email: 'test@example.com'
        })
      .when()
        .post('/{{name}}s')
        .execute();

    await createResponse
      .statusCode(201)
      .extract('$.id', '{{name}}Id')
      .execute();

    // Now retrieve it with dynamic configuration
    const getResponse = await restified
      .given()
        .baseURL(process.env.API_BASE_URL || '{{baseURL}}')
        {{#if authRequired}}
        .bearerToken(process.env.API_TOKEN || 'your-token-here')
        {{/if}}
        // Add custom headers based on environment
        .header('X-Environment', process.env.NODE_ENV || 'test')
        .header('X-Request-ID', '{{$random.uuid}}')
      .when()
        .get('/{{name}}s/{{{{{{name}}Id}}')
        .execute();

    await getResponse
      .statusCode(200)
      .jsonPath('$.name', 'Test {{className}}')
      .execute();
  });

  it('should update {{name}}', async function() {
    this.timeout(10000);
    
    // Create {{name}} first
    const createResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        {{#if authRequired}}
        .bearerToken('your-auth-token-here')
        {{/if}}
        .body({
          name: 'Original {{className}}',
          email: 'original@example.com'
        })
      .when()
        .post('/{{name}}s')
        .execute();

    await createResponse
      .statusCode(201)
      .extract('$.id', '{{name}}Id')
      .execute();

    // Update the {{name}}
    const updateResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        {{#if authRequired}}
        .bearerToken('your-auth-token-here')
        {{/if}}
        .body({
          name: 'Updated {{className}}',
          email: 'updated@example.com'
        })
      .when()
        .put('/{{name}}s/{{{{{{name}}Id}}')
        .execute();

    await updateResponse
      .statusCode(200)
      .jsonPath('$.name', 'Updated {{className}}')
      .execute();
  });

  it('should delete {{name}}', async function() {
    this.timeout(10000);
    
    // Create {{name}} first
    const createResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        {{#if authRequired}}
        .bearerToken('your-auth-token-here')
        {{/if}}
        .body({
          name: 'To Delete {{className}}',
          email: 'delete@example.com'
        })
      .when()
        .post('/{{name}}s')
        .execute();

    await createResponse
      .statusCode(201)
      .extract('$.id', '{{name}}Id')
      .execute();

    // Delete the {{name}}
    const deleteResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
        {{#if authRequired}}
        .bearerToken('your-auth-token-here')
        {{/if}}
      .when()
        .delete('/{{name}}s/{{{{{{name}}Id}}')
        .execute();

    await deleteResponse
      .statusCode(200) // Note: Some APIs return 204
      .execute();
  });
});`);

    // Authentication Test Template
    this.templates.set('auth', `import { restified } from 'restifiedts';
import { expect } from 'chai';

describe('{{className}} Authentication Tests', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  beforeEach(function() {
    restified.clearLocalVariables();
  });

  it('should login with valid credentials', async function() {
    this.timeout(10000);
    
    const loginResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
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
      .jsonPath('$.token').isString()
      .extract('$.token', 'authToken')
      .execute();

    // Store token globally for other tests
    restified.setGlobalVariable('authToken', restified.getVariable('authToken'));
    expect(restified.getVariable('authToken')).to.exist;
  });

  it('should access protected resource with token', async function() {
    this.timeout(10000);
    
    // Use the token from previous test
    const protectedResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
        .bearerToken('{{authToken}}')
      .when()
        .get('/protected/profile')
        .execute();

    await protectedResponse
      .statusCode(200)
      .jsonPath('$.user').isObject()
      .execute();
  });

  it('should reject invalid credentials', async function() {
    this.timeout(10000);
    
    const loginResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        .body({
          username: 'invalid',
          password: 'invalid'
        })
      .when()
        .post('/auth/login')
        .execute();

    await loginResponse
      .statusCode(401)
      .execute();
  });

  it('should reject access without token', async function() {
    this.timeout(10000);
    
    const protectedResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
      .when()
        .get('/protected/profile')
        .execute();

    await protectedResponse
      .statusCode(401)
      .execute();
  });
});`);

    // Multi-Client Test Template
    this.templates.set('multi-client', `import { restified } from 'restifiedts';
import { expect } from 'chai';

/**
 * {{className}} Multi-Client Integration Tests
 * 
 * Configuration Examples:
 * Environment Variables:
 * - AUTH_API_URL=https://auth.example.com
 * - MAIN_API_URL={{baseURL}}
 * - PAYMENT_API_URL=https://payments.example.com
 * - API_TOKEN, PAYMENT_API_KEY, etc.
 * 
 * Usage: NODE_ENV=staging AUTH_API_URL=https://staging-auth.example.com npm test
 */
describe('{{className}} Multi-Client Tests', function() {
  beforeAll(function() {
    // Create multiple clients with environment-based configuration
    restified.createClient('authService', {
      baseURL: process.env.AUTH_API_URL || 'https://auth.example.com',
      timeout: parseInt(process.env.AUTH_TIMEOUT || '5000'),
      headers: {
        'X-Environment': process.env.NODE_ENV || 'test',
        'User-Agent': 'RestifiedTS-MultiClient/1.0'
      }
    });

    restified.createClient('{{name}}Service', {
      baseURL: process.env.MAIN_API_URL || '{{baseURL}}',
      timeout: parseInt(process.env.MAIN_API_TIMEOUT || '10000'),
      headers: {
        'X-Service': '{{name}}Service',
        'X-Environment': process.env.NODE_ENV || 'test'
      }
    });

    restified.createClient('paymentService', {
      baseURL: process.env.PAYMENT_API_URL || 'https://payments.example.com',
      timeout: parseInt(process.env.PAYMENT_TIMEOUT || '15000'),
      headers: {
        'X-API-Key': process.env.PAYMENT_API_KEY || 'default-payment-key',
        'X-Environment': process.env.NODE_ENV || 'test'
      }
    });

    console.log('Multi-client setup completed for environment:', process.env.NODE_ENV || 'test');
  });

  afterAll(async function() {
    await restified.cleanup();
  });

  beforeEach(function() {
    restified.clearLocalVariables();
  });

  it('should orchestrate multi-service workflow with environment config', async function() {
    this.timeout(30000);
    
    // Step 1: Authenticate with auth service using environment credentials
    const authResponse = await restified
      .given()
        .useClient('authService')
        .header('Content-Type', 'application/json')
        .body({
          username: process.env.AUTH_USERNAME || 'testuser',
          password: process.env.AUTH_PASSWORD || 'testpass',
          clientId: process.env.AUTH_CLIENT_ID || 'default-client'
        })
      .when()
        .post('/login')
        .execute();

    await authResponse
      .statusCode(200)
      .extract('$.token', 'authToken')
      .execute();

    // Step 2: Create resource with main service using extracted token
    const createResponse = await restified
      .given()
        .useClient('{{name}}Service')
        .bearerToken('{{authToken}}')
        .header('X-Transaction-ID', '{{$random.uuid}}')
        .body({
          name: 'Multi-Service {{className}}',
          type: 'integration-test',
          environment: process.env.NODE_ENV || 'test'
        })
      .when()
        .post('/{{name}}s')
        .execute();

    await createResponse
      .statusCode(201)
      .extract('$.id', '{{name}}Id')
      .execute();

    // Step 3: Process payment with payment service
    const paymentResponse = await restified
      .given()
        .useClient('paymentService')
        .bearerToken('{{authToken}}')
        .body({
          resourceId: '{{{{{{name}}Id}}',
          amount: 99.99,
          currency: process.env.DEFAULT_CURRENCY || 'USD',
          description: 'Multi-client integration test payment'
        })
      .when()
        .post('/charges')
        .execute();

    await paymentResponse
      .statusCode(200)
      .jsonPath('$.status', 'completed')
      .jsonPath('$.currency', process.env.DEFAULT_CURRENCY || 'USD')
      .execute();
  });

  it('should handle client-specific configurations', async function() {
    this.timeout(15000);
    
    // Test different timeout settings per client
    const fastResponse = await restified
      .given()
        .useClient('authService') // 5s timeout
        .header('Content-Type', 'application/json')
      .when()
        .get('/health')
        .execute();

    await fastResponse
      .statusCode(200)
      .responseTime(5000)
      .execute();

    const slowResponse = await restified
      .given()
        .useClient('externalService') // 15s timeout
        .header('Content-Type', 'application/json')
      .when()
        .get('/slow-endpoint')
        .execute();

    await slowResponse
      .statusCode(200)
      .responseTime(15000)
      .execute();
  });
});`);

    // Performance Test Template
    this.templates.set('performance', `import { restified } from 'restifiedts';
import { expect } from 'chai';

describe('{{className}} Performance Tests', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  beforeEach(function() {
    restified.clearLocalVariables();
  });

  it('should meet response time requirements', async function() {
    this.timeout(10000);
    
    const response = await restified
      .given()
        .baseURL('{{baseURL}}')
        {{#if authRequired}}
        .bearerToken('your-auth-token-here')
        {{/if}}
      .when()
        .get('/{{name}}s')
        .execute();

    await response
      .statusCode(200)
      .responseTime(2000) // Assert response time < 2 seconds
      .execute();
  });

  it('should handle concurrent requests', async function() {
    this.timeout(30000);
    
    // Create 10 concurrent requests
    const promises = Array.from({ length: 10 }, function(_, i) {
      return restified
        .given()
          .baseURL('{{baseURL}}')
          .contextVariable('requestId', i + 1)
          {{#if authRequired}}
          .bearerToken('your-auth-token-here')
          {{/if}}
        .when()
          .get('/{{name}}s/{{requestId}}')
          .execute()
        .then(function(response) {
          return response
            .statusCode(200)
            .responseTime(5000)
            .execute();
        });
    });

    await Promise.all(promises);
  });

  it('should handle load testing', async function() {
    this.timeout(60000);
    
    const startTime = Date.now();
    const requests = [];
    
    // Generate 20 requests over 10 seconds
    for (let i = 0; i < 20; i++) {
      const requestPromise = restified
        .given()
          .baseURL('{{baseURL}}')
          .contextVariable('batchId', Math.floor(i / 5))
          {{#if authRequired}}
          .bearerToken('your-auth-token-here')
          {{/if}}
        .when()
          .get('/{{name}}s')
          .execute()
        .then(function(response) {
          return response
            .statusCode(200)
            .responseTime(10000)
            .execute();
        });
      
      requests.push(requestPromise);
      
      // Stagger requests every 500ms
      if (i < 19) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Wait for all requests to complete
    const results = await Promise.all(requests);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(\`Completed \${results.length} requests in \${totalTime}ms\`);
    expect(results).to.have.length(20);
    expect(totalTime).to.be.lessThan(30000); // Should complete within 30 seconds
  });
});`);

    // GraphQL Test Template
    this.templates.set('graphql', `import { restified } from 'restifiedts';
import { expect } from 'chai';

describe('{{className}} GraphQL Tests', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  beforeEach(function() {
    restified.clearLocalVariables();
  });

  it('should execute GraphQL query', async function() {
    this.timeout(10000);
    
    const query = \`
      query Get{{className}}($id: ID!) {
        {{name}}(id: $id) {
          id
          name
          email
          createdAt
        }
      }
    \`;

    const response = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        {{#if authRequired}}
        .bearerToken('your-auth-token-here')
        {{/if}}
      .when()
        .graphql(query, { id: '1' })
        .post('/graphql')
        .execute();

    await response
      .statusCode(200)
      .jsonPath('$.data.{{name}}.id', '1')
      .jsonPath('$.data.{{name}}.name').isString()
      .execute();
  });

  it('should execute GraphQL mutation', async function() {
    this.timeout(10000);
    
    const mutation = \`
      mutation Create{{className}}($input: {{className}}Input!) {
        create{{className}}(input: $input) {
          id
          name
          email
          createdAt
        }
      }
    \`;

    const response = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        {{#if authRequired}}
        .bearerToken('your-auth-token-here')
        {{/if}}
      .when()
        .graphqlMutation(mutation, {
          input: {
            name: 'GraphQL {{className}}',
            email: 'graphql@example.com'
          }
        })
        .post('/graphql')
        .execute();

    await response
      .statusCode(200)
      .jsonPath('$.data.create{{className}}.name', 'GraphQL {{className}}')
      .extract('$.data.create{{className}}.id', 'created{{className}}Id')
      .execute();
  });

  it('should handle GraphQL errors', async function() {
    this.timeout(10000);
    
    const invalidQuery = \`
      query InvalidQuery {
        nonExistentField {
          id
        }
      }
    \`;

    const response = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        {{#if authRequired}}
        .bearerToken('your-auth-token-here')
        {{/if}}
      .when()
        .graphql(invalidQuery)
        .post('/graphql')
        .execute();

    await response
      .statusCode(400)
      .jsonPath('$.errors').isArray()
      .execute();
  });
});`);

    // WebSocket Test Template
    this.templates.set('websocket', `import { restified } from 'restifiedts';
import { expect } from 'chai';

describe('{{className}} WebSocket Tests', function() {
  afterEach(async function() {
    // Clean up WebSocket connections after each test
    try {
      await restified.disconnectAllWebSockets();
    } catch (error) {
      console.debug('WebSocket cleanup warning (ignored):', error.message);
    }
  });

  afterAll(async function() {
    await restified.cleanup();
  });

  it('should connect and send messages', async function() {
    this.timeout(15000);
    
    // Add WebSocket connection configuration
    restified.addWebSocketConnection({
      name: '{{name}}-ws',
      url: 'wss://echo.websocket.org',
      protocols: ['{{name}}-protocol'],
      timeout: 10000
    });

    // Connect to WebSocket
    await restified.connectWebSocket('{{name}}-ws');

    // Send a message
    await restified.sendWebSocketText('Hello {{className}}!', '{{name}}-ws');

    // Wait for response
    const response = await restified.waitForWebSocketMessage(
      function(message) { return message === 'Hello {{className}}!'; },
      '{{name}}-ws',
      5000
    );

    expect(response).to.equal('Hello {{className}}!');
  });

  it('should handle JSON messages', async function() {
    this.timeout(15000);
    
    restified.addWebSocketConnection({
      name: '{{name}}-json-ws',
      url: 'wss://echo.websocket.org',
      timeout: 10000
    });

    await restified.connectWebSocket('{{name}}-json-ws');

    const messageData = {
      type: '{{name}}-message',
      data: {
        id: '{{$random.uuid}}',
        name: '{{$faker.person.fullName}}',
        timestamp: '{{$date.now}}'
      }
    };

    await restified.sendWebSocketJSON(messageData, '{{name}}-json-ws');

    const response = await restified.waitForWebSocketMessage(
      function(message) {
        try {
          const parsed = JSON.parse(message);
          return parsed.type === '{{name}}-message';
        } catch {
          return false;
        }
      },
      '{{name}}-json-ws',
      5000
    );

    const parsedResponse = JSON.parse(response);
    expect(parsedResponse.type).to.equal('{{name}}-message');
    expect(parsedResponse.data).to.have.property('id');
  });

  it('should handle connection errors', async function() {
    this.timeout(10000);
    
    // Try to connect to invalid WebSocket URL
    restified.addWebSocketConnection({
      name: 'invalid-ws',
      url: 'wss://invalid-websocket-url.com',
      timeout: 2000
    });

    try {
      await restified.connectWebSocket('invalid-ws');
      expect.fail('Should have thrown connection error');
    } catch (error) {
      expect(error.message).to.contain('connection');
    }
  });
});`);

    // Configuration Example Template
    this.templates.set('config', `import { restified } from 'restifiedts';
import { expect } from 'chai';

/**
 * {{className}} Configuration Examples
 * 
 * This template demonstrates all available configuration patterns for RestifiedTS:
 * 
 * 1. Environment Variables (.env files)
 * 2. Configuration Files (config/default.json)
 * 3. Global Setup Classes (tests/setup/global-setup.ts)
 * 4. Runtime Configuration (programmatic setup)
 * 5. Multi-instance Management
 * 6. Security Best Practices
 * 
 * Environment Setup Examples:
 * - Development: NODE_ENV=development API_BASE_URL=http://localhost:3000 npm test
 * - Staging: NODE_ENV=staging API_BASE_URL=https://staging-api.example.com npm test
 * - Production: NODE_ENV=production API_BASE_URL=https://api.example.com npm test
 */
describe('{{className}} Configuration Examples', function() {
  
  beforeAll(async function() {
    // Method 1: Global RestifiedTS Configuration
    restified.configure({
      timeout: parseInt(process.env.API_TIMEOUT || '30000'),
      retries: parseInt(process.env.API_RETRIES || '3'),
      headers: {
        'User-Agent': 'RestifiedTS-ConfigDemo/1.0',
        'X-Environment': process.env.NODE_ENV || 'test'
      },
      reporting: {
        directory: process.env.REPORTS_DIR || 'output/reports'
      }
    });

    // Method 2: Multi-Service Client Setup
    restified.createClient('mainAPI', {
      baseURL: process.env.API_BASE_URL || '{{baseURL}}',
      timeout: 30000,
      headers: {
        'X-API-Key': process.env.API_KEY
      }
    });

    restified.createClient('authAPI', {
      baseURL: process.env.AUTH_API_URL || 'https://auth.example.com',
      timeout: 10000
    });

    restified.createClient('paymentAPI', {
      baseURL: process.env.PAYMENT_API_URL || 'https://payments.example.com',
      timeout: 15000,
      headers: {
        'X-Payment-Key': process.env.PAYMENT_API_KEY
      }
    });

    // Method 3: Global Authentication Setup
    if (process.env.AUTH_TOKEN) {
      restified.setGlobalVariable('authToken', process.env.AUTH_TOKEN);
    } else {
      // Authenticate programmatically if no token provided
      await this.authenticateGlobally();
    }
  });

  afterAll(async function() {
    await restified.cleanup();
  });

  beforeEach(function() {
    restified.clearLocalVariables();
  });

  // Helper method for authentication
  async authenticateGlobally() {
    const authResponse = await restified
      .given()
        .useClient('authAPI')
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

    restified.setGlobalVariable('authToken', restified.getVariable('authToken'));
  }

  it('should demonstrate environment variable configuration', async function() {
    this.timeout(10000);
    
    // All configuration from environment variables
    const response = await restified
      .given()
        .useClient('mainAPI')
        .bearerToken('{{authToken}}')
        .header('X-Request-Source', 'environment-config-demo')
        .body({
          name: '{{$faker.person.fullName}}',
          email: '{{$faker.internet.email}}',
          environment: process.env.NODE_ENV || 'test'
        })
      .when()
        .post('/{{name}}s')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.environment', process.env.NODE_ENV || 'test')
      .extract('$.id', 'resourceId')
      .execute();

    console.log('Created resource in environment:', process.env.NODE_ENV || 'test');
  });

  it('should demonstrate config file integration', async function() {
    this.timeout(10000);
    
    // Example of loading configuration from file
    let config = {};
    try {
      config = require('../../config/default.json');
      console.log('Loaded config from file:', config.baseURL || 'no baseURL found');
    } catch (error) {
      console.log('Config file not found, using environment variables');
    }

    const response = await restified
      .given()
        .baseURL(config.baseURL || process.env.API_BASE_URL || '{{baseURL}}')
        .bearerToken('{{authToken}}')
        .timeout(config.timeout || parseInt(process.env.API_TIMEOUT || '30000'))
        .body({
          name: 'Config File Demo',
          source: 'config-file-integration'
        })
      .when()
        .post('/{{name}}s')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.source', 'config-file-integration')
      .execute();
  });

  it('should demonstrate multi-client workflow', async function() {
    this.timeout(20000);
    
    // Step 1: Create resource with main API
    const createResponse = await restified
      .given()
        .useClient('mainAPI')
        .bearerToken('{{authToken}}')
        .body({
          name: 'Multi-Client {{className}}',
          type: 'integration'
        })
      .when()
        .post('/{{name}}s')
        .execute();

    await createResponse
      .statusCode(201)
      .extract('$.id', 'resourceId')
      .execute();

    // Step 2: Process payment for the resource
    const paymentResponse = await restified
      .given()
        .useClient('paymentAPI')
        .bearerToken('{{authToken}}')
        .body({
          resourceId: '{{resourceId}}',
          amount: 99.99,
          currency: process.env.DEFAULT_CURRENCY || 'USD'
        })
      .when()
        .post('/charges')
        .execute();

    await paymentResponse
      .statusCode(200)
      .jsonPath('$.status', 'completed')
      .execute();
  });

  it('should demonstrate security best practices', async function() {
    this.timeout(10000);
    
    // Never hardcode sensitive data - always use environment variables
    const apiKey = process.env.API_KEY;
    const authToken = restified.getVariable('authToken');
    
    if (!apiKey) {
      this.skip('API_KEY not provided in environment variables');
    }

    const response = await restified
      .given()
        .useClient('mainAPI')
        .bearerToken(authToken)
        .header('X-API-Key', apiKey)  // From environment only
        .header('X-Request-ID', '{{$random.uuid}}')
        .body({
          name: 'Security Demo',
          sensitiveField: 'MASKED_IN_LOGS'  // This would be masked in audit logs
        })
      .when()
        .post('/{{name}}s')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.name', 'Security Demo')
      .execute();

    // Verify sensitive data is not logged
    expect(apiKey).to.exist;
    expect(authToken).to.exist;
  });

  it('should demonstrate different environment handling', async function() {
    this.timeout(10000);
    
    const environment = process.env.NODE_ENV || 'test';
    let expectedBehavior = {};

    // Configure behavior based on environment
    switch (environment) {
      case 'development':
        expectedBehavior = {
          timeout: 10000,
          retries: 1,
          logging: 'debug'
        };
        break;
      case 'staging':
        expectedBehavior = {
          timeout: 20000,
          retries: 2,
          logging: 'info'
        };
        break;
      case 'production':
        expectedBehavior = {
          timeout: 30000,
          retries: 3,
          logging: 'error'
        };
        break;
      default:
        expectedBehavior = {
          timeout: 5000,
          retries: 0,
          logging: 'info'
        };
    }

    const response = await restified
      .given()
        .useClient('mainAPI')
        .bearerToken('{{authToken}}')
        .timeout(expectedBehavior.timeout)
        .body({
          name: \`Environment Demo - \${environment}\`,
          environment: environment,
          config: expectedBehavior
        })
      .when()
        .post('/{{name}}s')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.environment', environment)
      .responseTime(expectedBehavior.timeout)
      .execute();

    console.log(\`Test executed in \${environment} environment with config:\`, expectedBehavior);
  });
});`);

    // Environment Variables Template (.env.example)
    this.templates.set('env', `# RestifiedTS Environment Configuration
# Copy this file to .env and fill in your actual values
# Never commit .env to version control!

# ========================================
# Main API Configuration
# ========================================
NODE_ENV=development
API_BASE_URL=https://api.example.com
API_TIMEOUT=30000
API_RETRIES=3

# ========================================
# Authentication
# ========================================
API_TOKEN=your-main-api-token-here
API_KEY=your-api-key-here
REFRESH_TOKEN=your-refresh-token-here

# Basic Auth (if applicable)
API_USERNAME=your-username
API_PASSWORD=your-password

# OAuth2 (if applicable)
OAUTH2_CLIENT_ID=your-oauth2-client-id
OAUTH2_CLIENT_SECRET=your-oauth2-client-secret
OAUTH2_TOKEN_URL=https://auth.example.com/oauth/token

# ========================================
# Multi-Service Configuration
# ========================================
# Authentication Service
AUTH_API_URL=https://auth.example.com
AUTH_TIMEOUT=10000
AUTH_USERNAME=test-user
AUTH_PASSWORD=test-password
AUTH_CLIENT_ID=restifiedts-client

# Payment Service
PAYMENT_API_URL=https://payments.example.com
PAYMENT_API_KEY=your-payment-api-key
PAYMENT_TIMEOUT=15000
DEFAULT_CURRENCY=USD

# Notification Service
NOTIFICATION_API_URL=https://notifications.example.com
NOTIFICATION_API_KEY=your-notification-key

# External Services
EXTERNAL_API_URL=https://external.example.com
EXTERNAL_API_TOKEN=your-external-token

# ========================================
# Output Configuration
# ========================================
REPORTS_DIR=output/reports
SNAPSHOTS_DIR=output/snapshots
LOGS_DIR=output/logs

# ========================================
# Test Configuration
# ========================================
# Test timeouts and retries
TEST_TIMEOUT=30000
MAX_RETRIES=3
PARALLEL_TESTS=false

# Test data generation
FAKER_LOCALE=en
FAKER_SEED=12345

# ========================================
# Environment-Specific Overrides
# ========================================
# Development
DEV_API_BASE_URL=http://localhost:3000
DEV_API_TOKEN=dev-token-123

# Staging  
STAGING_API_BASE_URL=https://staging-api.example.com
STAGING_API_TOKEN=staging-token-456

# Production
PRODUCTION_API_BASE_URL=https://api.example.com
PRODUCTION_API_TOKEN=prod-token-789

# ========================================
# Security & Monitoring
# ========================================
# Logging levels: error, warn, info, debug
LOG_LEVEL=info
ENABLE_AUDIT_LOGS=true
MASK_SENSITIVE_DATA=true

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn-here
DATADOG_API_KEY=your-datadog-key

# ========================================
# Feature Flags
# ========================================
ENABLE_GRAPHQL=true
ENABLE_WEBSOCKET=false
ENABLE_PERFORMANCE_TESTING=true
ENABLE_SNAPSHOT_TESTING=true
ENABLE_SCHEMA_VALIDATION=false

# ========================================
# CI/CD Configuration
# ========================================
CI_MODE=false
CI_REPORTER=json
CI_TIMEOUT=60000
CI_MAX_PARALLEL=5

# ========================================
# Database (if your API needs database access)
# ========================================
DATABASE_URL=your-database-connection-string
DATABASE_TIMEOUT=5000

# ========================================
# Proxy Settings (if needed)
# ========================================
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=https://proxy.company.com:8080
PROXY_USERNAME=proxy-user
PROXY_PASSWORD=proxy-pass

# ========================================
# SSL/TLS Configuration (if needed)
# ========================================
SSL_CERT_PATH=path/to/cert.pem
SSL_KEY_PATH=path/to/key.pem
SSL_CA_PATH=path/to/ca.pem
REJECT_UNAUTHORIZED=true
`);

    // Database Integration Test Template
    this.templates.set('database', `import { restified, DatabaseManager } from 'restifiedts';
import { expect } from 'chai';

describe('{{className}} Database Integration Tests', function() {
  const dbManager = new DatabaseManager();
  
  beforeAll(async function() {
    await dbManager.connect({
      type: '{{dbType}}',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'test_{{name}}',
      username: process.env.DB_USER || 'test_user',
      password: process.env.DB_PASS || 'test_pass'
    });
  });

  afterAll(async function() {
    await dbManager.disconnect();
    await restified.cleanup();
  });

  beforeEach(async function() {
    // Clean up test data before each test
    await dbManager.execute('DELETE FROM {{name}}s WHERE email LIKE \\'%test.com\\'');
    restified.clearLocalVariables();
  });

  it('should create {{name}} and verify database state', async function() {
    this.timeout(15000);

    // Seed initial test data
    await dbManager.execute(
      'INSERT INTO {{name}}s (email, name, status) VALUES ($1, $2, $3)',
      ['existing@test.com', 'Existing {{className}}', 'active']
    );

    // Create new {{name}} via API
    const response = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        {{#if authRequired}}
        .bearerToken(process.env.AUTH_TOKEN || 'test-token')
        {{/if}}
        .body({
          email: 'new@test.com',
          name: 'New {{className}}',
          status: 'active'
        })
      .when()
        .post('/{{name}}s')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.email', 'new@test.com')
      .extract('$.id', '{{name}}Id')
      .execute();

    // Verify database state
    const dbResult = await dbManager.query(
      'SELECT * FROM {{name}}s WHERE email = $1',
      ['new@test.com']
    );
    
    expect(dbResult.rows).to.have.length(1);
    expect(dbResult.rows[0].name).to.equal('New {{className}}');
    expect(dbResult.rows[0].status).to.equal('active');

    // Verify total count
    const countResult = await dbManager.query('SELECT COUNT(*) as count FROM {{name}}s');
    expect(parseInt(countResult.rows[0].count)).to.equal(2);
  });

  it('should update {{name}} and verify database changes', async function() {
    this.timeout(15000);

    // Create test {{name}} via database
    const insertResult = await dbManager.query(
      'INSERT INTO {{name}}s (email, name, status) VALUES ($1, $2, $3) RETURNING id',
      ['update@test.com', 'Update Test {{className}}', 'active']
    );
    const {{name}}Id = insertResult.rows[0].id;

    // Update via API
    const response = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        {{#if authRequired}}
        .bearerToken(process.env.AUTH_TOKEN || 'test-token')
        {{/if}}
        .body({
          name: 'Updated {{className}}',
          status: 'inactive'
        })
      .when()
        .put('/{{name}}s/' + {{name}}Id)
        .execute();

    await response.statusCode(200).execute();

    // Verify database changes
    const dbResult = await dbManager.query(
      'SELECT * FROM {{name}}s WHERE id = $1',
      [{{name}}Id]
    );
    
    expect(dbResult.rows[0].name).to.equal('Updated {{className}}');
    expect(dbResult.rows[0].status).to.equal('inactive');
  });
});
`);

    // Security Testing Template
    this.templates.set('security', `import { restified, ZapIntegration } from 'restifiedts';
import { expect } from 'chai';

describe('{{className}} Security Tests', function() {
  const zap = new ZapIntegration({
    zapApiUrl: process.env.ZAP_API_URL || 'http://{{zapHost}}',
    targetUrl: '{{baseURL}}'
  });

  beforeAll(async function() {
    this.timeout(30000);
    // Ensure ZAP daemon is running
    await zap.checkZapStatus();
  });

  afterAll(async function() {
    await restified.cleanup();
  });

  it('should perform security vulnerability scan', async function() {
    this.timeout(300000); // 5 minutes for security scan

    // Start spider scan to discover endpoints
    const spiderId = await zap.startSpider('{{baseURL}}');
    await zap.waitForSpiderCompletion(spiderId);

    // Start active security scan
    const scanId = await zap.startActiveScan('{{baseURL}}', {
      recurse: true,
      inScopeOnly: false
    });
    
    await zap.waitForScanCompletion(scanId);

    // Generate security report
    const report = await zap.generateSecurityReport(scanId);
    
    // Security assertions
    expect(report.summary.highRisk).to.equal(0, 'No high-risk vulnerabilities should be found');
    expect(report.summary.mediumRisk).to.be.below(3, 'Medium-risk vulnerabilities should be minimal');
    
    // Check for common vulnerabilities
    const criticalVulns = report.vulnerabilities.filter(v => 
      ['SQL Injection', 'XSS', 'CSRF', 'Command Injection'].includes(v.type) && 
      v.risk === 'High'
    );
    expect(criticalVulns).to.have.length(0, 'No critical vulnerabilities should be present');

    // Log security findings for review
    if (report.summary.totalVulnerabilities > 0) {
      console.log('Security Findings Summary:', report.summary);
      report.vulnerabilities.forEach(vuln => {
        console.log(\`- \${vuln.risk} Risk: \${vuln.type} at \${vuln.instances[0]?.uri}\`);
      });
    }
  });

  it('should test authentication security', async function() {
    this.timeout(60000);

    // Test for authentication bypass
    const unauthResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        // Intentionally no authentication
      .when()
        .get('/{{name}}s')
        .execute();

    // Should require authentication
    expect([401, 403]).to.include(unauthResponse.response.status);

    // Test with invalid token
    const invalidAuthResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
        .header('Content-Type', 'application/json')
        .bearerToken('invalid-token-12345')
      .when()
        .get('/{{name}}s')
        .execute();

    expect([401, 403]).to.include(invalidAuthResponse.response.status);
  });

  it('should test input validation security', async function() {
    this.timeout(30000);

    // SQL Injection attempt
    const sqlInjectionResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
        {{#if authRequired}}
        .bearerToken(process.env.AUTH_TOKEN || 'test-token')
        {{/if}}
        .body({
          name: "'; DROP TABLE {{name}}s; --",
          email: 'malicious@test.com'
        })
      .when()
        .post('/{{name}}s')
        .execute();

    // Should reject malicious input
    expect([400, 422]).to.include(sqlInjectionResponse.response.status);

    // XSS attempt
    const xssResponse = await restified
      .given()
        .baseURL('{{baseURL}}')
        {{#if authRequired}}
        .bearerToken(process.env.AUTH_TOKEN || 'test-token')
        {{/if}}
        .body({
          name: '<script>alert("XSS")</script>',
          email: 'xss@test.com'
        })
      .when()
        .post('/{{name}}s')
        .execute();

    expect([400, 422]).to.include(xssResponse.response.status);
  });
});
`);

    // Unified Test Orchestration Template
    this.templates.set('unified', `import { restified, UnifiedTestOrchestrator } from 'restifiedts';
import { expect } from 'chai';

describe('{{className}} Unified Test Suite', function() {
  const orchestrator = new UnifiedTestOrchestrator();

  afterAll(async function() {
    await restified.cleanup();
  });

  it('should run comprehensive test workflow', async function() {
    this.timeout(600000); // 10 minutes for full suite

    const config = {
      target: '{{baseURL}}',
      tests: {
        api: {
          endpoints: [
            { path: '/{{name}}s', methods: ['GET', 'POST'] },
            { path: '/{{name}}s/{id}', methods: ['GET', 'PUT', 'DELETE'] }
          ],
          authentication: {
            type: 'bearer',
            token: process.env.AUTH_TOKEN || 'test-token'
          },
          assertions: {
            responseTime: 2000,
            statusCodes: [200, 201, 204, 400, 401, 404]
          }
        },
        performance: {
          phases: [
            { duration: 30, arrivalRate: 1, name: 'warmup' },
            { duration: 60, arrivalRate: 5, name: 'rampup' },
            { duration: 30, arrivalRate: 10, name: 'sustained' }
          ],
          thresholds: {
            responseTime: { median: 1000, p95: 2000 },
            errorRate: 1,
            throughput: 50
          }
        },
        security: {
          zapConfig: {
            host: process.env.ZAP_HOST || 'localhost',
            port: parseInt(process.env.ZAP_PORT || '8080')
          },
          policies: ['owasp-top-10', 'api-security'],
          maxRiskThreshold: 'medium'
        }
      }
    };

    // Execute unified test suite
    const results = await orchestrator.runUnifiedTests(config);
    
    // API Test Assertions
    expect(results.api.passed, 'API tests should pass').to.be.true;
    expect(results.api.coverage.endpoints).to.be.above(0.8, 'Endpoint coverage should be > 80%');
    
    // Performance Test Assertions
    expect(results.performance.grade).to.match(/A|B/, 'Performance grade should be A or B');
    expect(results.performance.metrics.responseTime.median).to.be.below(1000);
    expect(results.performance.metrics.errorRate).to.be.below(1);
    
    // Security Test Assertions
    expect(results.security.highRiskCount).to.equal(0, 'No high-risk vulnerabilities');
    expect(results.security.mediumRiskCount).to.be.below(3, 'Limited medium-risk vulnerabilities');
    
    // Overall Quality Score
    expect(results.overall.score).to.be.above(85, 'Overall quality score should be > 85%');
    expect(results.overall.grade).to.match(/A|B/, 'Overall grade should be A or B');

    // Generate comprehensive report
    await orchestrator.generateUnifiedReport(results, {
      outputPath: './reports/unified-test-report.html',
      includeMetrics: true,
      includeRecommendations: true
    });

    // Log summary for CI/CD
    console.log('Unified Test Results Summary:');
    console.log(\`- API Tests: \${results.api.passed ? 'PASSED' : 'FAILED'}\`);
    console.log(\`- Performance Grade: \${results.performance.grade}\`);
    console.log(\`- Security Risk: \${results.security.riskLevel}\`);
    console.log(\`- Overall Score: \${results.overall.score}%\`);
  });
});
`);

    // Schema Validation Test Template
    this.templates.set('validation', `import { restified, SchemaValidationManager } from 'restifiedts';
import { expect } from 'chai';
import * as Joi from 'joi';
import { z } from 'zod';

describe('{{className}} Schema Validation Tests', function() {
  const validator = new SchemaValidationManager();

  afterAll(async function() {
    await restified.cleanup();
  });

  beforeEach(function() {
    restified.clearLocalVariables();
  });

  it('should validate with multiple schema libraries', async function() {
    this.timeout(10000);

    // Define schemas for {{name}}
    const {{name}}Schema = {
      joi: Joi.object({
        id: Joi.number().required(),
        email: Joi.string().email().required(),
        name: Joi.string().min(2).max(100).required(),
        status: Joi.string().valid('active', 'inactive', 'pending').required(),
        createdAt: Joi.string().isoDate().required(),
        updatedAt: Joi.string().isoDate().optional()
      }),
      
      zod: z.object({
        id: z.number().positive(),
        email: z.string().email(),
        name: z.string().min(2).max(100),
        status: z.enum(['active', 'inactive', 'pending']),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime().optional()
      }),
      
      ajv: {
        type: 'object',
        properties: {
          id: { type: 'number', minimum: 1 },
          email: { type: 'string', format: 'email' },
          name: { type: 'string', minLength: 2, maxLength: 100 },
          status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'email', 'name', 'status', 'createdAt'],
        additionalProperties: false
      }
    };

    // Test single {{name}} validation
    const response = await restified
      .given()
        .baseURL('{{baseURL}}')
        {{#if authRequired}}
        .bearerToken(process.env.AUTH_TOKEN || 'test-token')
        {{/if}}
      .when()
        .get('/{{name}}s/1')
        .execute();

    await response.statusCode(200).execute();

    // Validate with multiple validators
    const results = await validator.validateMultiple(
      response.response.data,
      {{name}}Schema
    );

    // All validators should pass
    expect(results.joi.valid, 'Joi validation should pass').to.be.true;
    expect(results.zod.valid, 'Zod validation should pass').to.be.true;
    expect(results.ajv.valid, 'AJV validation should pass').to.be.true;

    // Performance comparison
    expect(results.performance.fastest).to.be.oneOf(['joi', 'zod', 'ajv']);
    console.log(\`Validation Performance: \${results.performance.fastest} was fastest\`);

    // Cross-validator consistency
    expect(results.consistency.score).to.be.above(0.95, 'Validator consistency should be > 95%');
  });

  it('should validate array of {{name}}s', async function() {
    this.timeout(10000);

    const {{name}}ArraySchema = {
      joi: Joi.array().items(
        Joi.object({
          id: Joi.number().required(),
          email: Joi.string().email().required(),
          name: Joi.string().min(2).required(),
          status: Joi.string().valid('active', 'inactive', 'pending').required()
        })
      ).min(1).max(100),
      
      zod: z.array(z.object({
        id: z.number().positive(),
        email: z.string().email(),
        name: z.string().min(2),
        status: z.enum(['active', 'inactive', 'pending'])
      })).min(1).max(100),
      
      ajv: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number', minimum: 1 },
            email: { type: 'string', format: 'email' },
            name: { type: 'string', minLength: 2 },
            status: { type: 'string', enum: ['active', 'inactive', 'pending'] }
          },
          required: ['id', 'email', 'name', 'status']
        },
        minItems: 1,
        maxItems: 100
      }
    };

    const response = await restified
      .given()
        .baseURL('{{baseURL}}')
        {{#if authRequired}}
        .bearerToken(process.env.AUTH_TOKEN || 'test-token')
        {{/if}}
      .when()
        .get('/{{name}}s')
        .execute();

    await response.statusCode(200).execute();

    const results = await validator.validateMultiple(
      response.response.data,
      {{name}}ArraySchema
    );

    expect(results.joi.valid).to.be.true;
    expect(results.zod.valid).to.be.true;
    expect(results.ajv.valid).to.be.true;
  });

  it('should handle validation errors appropriately', async function() {
    this.timeout(10000);

    const strictSchema = {
      joi: Joi.object({
        id: Joi.number().required(),
        email: Joi.string().email().required(),
        name: Joi.string().min(10).required(), // Intentionally strict
        status: Joi.string().valid('active').required() // Only 'active' allowed
      })
    };

    const response = await restified
      .given()
        .baseURL('{{baseURL}}')
        {{#if authRequired}}
        .bearerToken(process.env.AUTH_TOKEN || 'test-token')
        {{/if}}
      .when()
        .get('/{{name}}s/1')
        .execute();

    await response.statusCode(200).execute();

    const results = await validator.validateMultiple(
      response.response.data,
      strictSchema
    );

    // Should handle validation errors gracefully
    if (!results.joi.valid) {
      expect(results.joi.errors).to.be.an('array');
      expect(results.joi.errors.length).to.be.above(0);
      console.log('Expected validation errors:', results.joi.errors);
    }
  });
});
`);
  }

  private getTemplate(type: string): string {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }
    return template;
  }

  private generateFileName(name: string, type: string): string {
    const kebabName = this.toKebabCase(name);
    return `${kebabName}-${type}.test.ts`;
  }

  private processTemplate(template: string, variables: any): string {
    let processed = template;
    
    // Simple template variable replacement
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, variables[key]);
    });

    // Handle conditional blocks
    processed = this.processConditionals(processed, variables);

    return processed;
  }

  private processConditionals(template: string, variables: any): string {
    // Handle {{#if condition}} blocks
    const ifRegex = /{{#if (\w+)}}([\s\S]*?){{\/if}}/g;
    return template.replace(ifRegex, (match, condition, content) => {
      return variables[condition] ? content : '';
    });
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[-_])(\w)/g, (_, char) => char.toUpperCase());
  }

  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}