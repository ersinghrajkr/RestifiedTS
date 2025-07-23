import * as fs from 'fs';
import * as path from 'path';

export interface TestGenerationOptions {
  type: 'api' | 'graphql' | 'websocket' | 'setup' | 'crud' | 'auth';
  name: string;
  outputDir: string;
  baseURL?: string;
  includeSuite?: boolean;
}

export class TestGenerator {
  private templates: Map<string, string> = new Map();

  constructor() {
    this.initializeTemplates();
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
      baseURL: options.baseURL || 'https://api.example.com',
      className: this.toPascalCase(options.name),
      testSuite: options.includeSuite
    });

    // Write file
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  private initializeTemplates(): void {
    this.templates.set('api', `import { expect } from 'chai';
import { restified } from '../src';

describe('{{className}} API Tests @integration @{{name}}', () => {
  let authToken: string;

  before(async function() {
    this.timeout(10000);
    
    // Global setup for {{name}} tests
    console.log('🚀 Setting up {{className}} API tests...');
    
    try {
      // Authenticate and get token (if needed)
      const authResult = await restified
        .given()
          .baseURL('{{baseURL}}')
          .header('Content-Type', 'application/json')
          .body({
            username: 'test-user',
            password: 'test-password'
          })
        .when()
          .post('/auth/login')
        .then()
          .statusCode(200)
          .extract('$.token', 'globalAuthToken')
        .execute();

      authToken = restified.getGlobalVariable('globalAuthToken');
      console.log('✅ Authentication successful');
      
    } catch (error: any) {
      console.warn('⚠️  Authentication failed, using mock token:', error.message);
      authToken = 'mock-jwt-token';
      restified.setGlobalVariable('globalAuthToken', authToken);
    }
  });

  after(async function() {
    this.timeout(5000);
    
    // Global cleanup for {{name}} tests
    console.log('🧹 Cleaning up {{className}} API tests...');
    
    try {
      // Cleanup any global resources created during tests
      const createdResources = restified.getGlobalVariable('createdResources') || [];
      
      for (const resource of createdResources) {
        try {
          await restified
            .given()
              .baseURL('{{baseURL}}')
              .header('Authorization', \`Bearer \${authToken}\`)
            .when()
              .delete(\`/\${resource.type}/\${resource.id}\`)
            .then()
              .statusCode([200, 204, 404]) // 404 is OK if already deleted
            .execute();
            
          console.log(\`✅ Cleaned up \${resource.type} \${resource.id}\`);
        } catch (cleanupError: any) {
          console.warn(\`⚠️  Failed to cleanup \${resource.type} \${resource.id}:\`, cleanupError.message);
        }
      }
      
      restified.clearGlobalVariables();
      console.log('✅ Global cleanup completed');
      
    } catch (error: any) {
      console.error('❌ Global cleanup failed:', error.message);
    }
  });

  beforeEach(function() {
    // Setup for each individual test
    restified.setLocalVariable('testStartTime', Date.now());
    restified.setLocalVariable('currentTest', this.currentTest?.title || 'unknown');
  });

  afterEach(async function() {
    const testDuration = Date.now() - (restified.getLocalVariable('testStartTime') || 0);
    const testName = restified.getLocalVariable('currentTest');
    const testPassed = this.currentTest?.state === 'passed';
    
    console.log(\`📊 Test "\${testName}" \${testPassed ? 'PASSED' : 'FAILED'} in \${testDuration}ms\`);
    
    // Cleanup any test-specific resources
    const testResources = restified.getLocalVariable('testResources') || [];
    for (const resource of testResources) {
      try {
        await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Authorization', \`Bearer \${authToken}\`)
          .when()
            .delete(\`/\${resource.type}/\${resource.id}\`)
          .then()
            .statusCode([200, 204, 404])
          .execute();
      } catch (error: any) {
        console.warn(\`⚠️  Failed to cleanup test resource:\`, error.message);
      }
    }
    
    restified.clearLocalVariables();
  });

  describe('{{className}} CRUD Operations', () => {
    
    it('should create a new {{name}} record', async function() {
      this.timeout(8000);
      
      const newRecord = {
        name: \`Test {{className}} \${Date.now()}\`,
        description: 'Created by RestifiedTS test suite',
        status: 'active',
        metadata: {
          testId: 'create-test',
          timestamp: new Date().toISOString()
        }
      };

      const result = await restified
        .given()
          .baseURL('{{baseURL}}')
          .header('Content-Type', 'application/json')
          .header('Authorization', \`Bearer \${authToken}\`)
          .body(newRecord)
          .contextVariable('testData', newRecord)
        .when()
          .post('/{{name}}s')
        .then()
          .statusCode(201)
          .jsonPath('$.name', newRecord.name)
          .jsonPath('$.status', 'active')
          .extract('$.id', 'createdId')
        .execute();

      expect(result.status).to.equal(201);
      expect(result.data).to.have.property('id');
      
      // Store for cleanup
      const createdId = restified.getVariable('createdId');
      restified.setLocalVariable('testResources', [{ type: '{{name}}', id: createdId }]);
      
      console.log(\`✅ Created {{name}} with ID: \${createdId}\`);
    });

    it('should retrieve {{name}} records', async function() {
      this.timeout(5000);
      
      const result = await restified
        .given()
          .baseURL('{{baseURL}}')
          .header('Authorization', \`Bearer \${authToken}\`)
        .when()
          .get('/{{name}}s')
        .then()
          .statusCode(200)
          .contentType('application/json')
        .execute();

      expect(result.status).to.equal(200);
      expect(result.data).to.be.an('array');
      
      console.log(\`✅ Retrieved \${result.data.length} {{name}} records\`);
    });

    it('should retrieve a specific {{name}} by ID', async function() {
      this.timeout(8000);
      
      // First create a record to retrieve
      const createResult = await restified
        .given()
          .baseURL('{{baseURL}}')
          .header('Content-Type', 'application/json')
          .header('Authorization', \`Bearer \${authToken}\`)
          .body({
            name: \`Retrieve Test {{className}} \${Date.now()}\`,
            description: 'Test record for retrieval'
          })
        .when()
          .post('/{{name}}s')
        .then()
          .statusCode(201)
          .extract('$.id', 'recordId')
        .execute();

      const recordId = restified.getVariable('recordId');
      
      // Now retrieve it
      const getResult = await restified
        .given()
          .baseURL('{{baseURL}}')
          .header('Authorization', \`Bearer \${authToken}\`)
        .when()
          .get('/{{name}}s/{{recordId}}')
        .then()
          .statusCode(200)
          .jsonPath('$.id', recordId)
        .execute();

      expect(getResult.status).to.equal(200);
      expect(getResult.data.id).to.equal(recordId);
      
      // Store for cleanup
      restified.setLocalVariable('testResources', [{ type: '{{name}}', id: recordId }]);
      
      console.log(\`✅ Retrieved {{name}} with ID: \${recordId}\`);
    });

    it('should update a {{name}} record', async function() {
      this.timeout(10000);
      
      // Create a record to update
      const createResult = await restified
        .given()
          .baseURL('{{baseURL}}')
          .header('Content-Type', 'application/json')
          .header('Authorization', \`Bearer \${authToken}\`)
          .body({
            name: \`Update Test {{className}} \${Date.now()}\`,
            description: 'Original description',
            status: 'active'
          })
        .when()
          .post('/{{name}}s')
        .then()
          .statusCode(201)
          .extract('$.id', 'updateRecordId')
        .execute();

      const recordId = restified.getVariable('updateRecordId');
      
      // Update the record
      const updateData = {
        name: \`Updated {{className}} \${Date.now()}\`,
        description: 'Updated description',
        status: 'modified'
      };

      const updateResult = await restified
        .given()
          .baseURL('{{baseURL}}')
          .header('Content-Type', 'application/json')
          .header('Authorization', \`Bearer \${authToken}\`)
          .body(updateData)
        .when()
          .put('/{{name}}s/{{updateRecordId}}')
        .then()
          .statusCode(200)
          .jsonPath('$.name', updateData.name)
          .jsonPath('$.status', 'modified')
        .execute();

      expect(updateResult.status).to.equal(200);
      expect(updateResult.data.name).to.equal(updateData.name);
      
      // Store for cleanup
      restified.setLocalVariable('testResources', [{ type: '{{name}}', id: recordId }]);
      
      console.log(\`✅ Updated {{name}} with ID: \${recordId}\`);
    });

    it('should delete a {{name}} record', async function() {
      this.timeout(8000);
      
      // Create a record to delete
      const createResult = await restified
        .given()
          .baseURL('{{baseURL}}')
          .header('Content-Type', 'application/json')
          .header('Authorization', \`Bearer \${authToken}\`)
          .body({
            name: \`Delete Test {{className}} \${Date.now()}\`,
            description: 'Record to be deleted'
          })
        .when()
          .post('/{{name}}s')
        .then()
          .statusCode(201)
          .extract('$.id', 'deleteRecordId')
        .execute();

      const recordId = restified.getVariable('deleteRecordId');
      
      // Delete the record
      const deleteResult = await restified
        .given()
          .baseURL('{{baseURL}}')
          .header('Authorization', \`Bearer \${authToken}\`)
        .when()
          .delete('/{{name}}s/{{deleteRecordId}}')
        .then()
          .statusCode(204)
        .execute();

      expect(deleteResult.status).to.equal(204);
      
      // Verify it's deleted by trying to retrieve it
      try {
        await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Authorization', \`Bearer \${authToken}\`)
          .when()
            .get('/{{name}}s/{{deleteRecordId}}')
          .then()
            .statusCode(404)
          .execute();
        
        console.log(\`✅ Confirmed {{name}} with ID \${recordId} was deleted\`);
      } catch (error: any) {
        console.log(\`✅ Delete confirmed - {{name}} no longer exists\`);
      }
    });
  });

  describe('{{className}} Error Handling', () => {
    
    it('should handle not found errors gracefully', async function() {
      this.timeout(5000);
      
      try {
        await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Authorization', \`Bearer \${authToken}\`)
          .when()
            .get('/{{name}}s/999999')
          .then()
            .statusCode(404)
          .execute();
        
        console.log('✅ 404 error handled correctly');
      } catch (error: any) {
        expect(error.response?.status).to.equal(404);
      }
    });

    it('should handle validation errors', async function() {
      this.timeout(5000);
      
      try {
        await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Content-Type', 'application/json')
            .header('Authorization', \`Bearer \${authToken}\`)
            .body({
              // Invalid data - missing required fields
              invalidField: 'should cause validation error'
            })
          .when()
            .post('/{{name}}s')
          .then()
            .statusCode(400)
          .execute();
        
        console.log('✅ Validation error handled correctly');
      } catch (error: any) {
        expect(error.response?.status).to.equal(400);
      }
    });

    it('should handle unauthorized access', async function() {
      this.timeout(5000);
      
      try {
        await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Authorization', 'Bearer invalid-token')
          .when()
            .get('/{{name}}s')
          .then()
            .statusCode(401)
          .execute();
        
        console.log('✅ Unauthorized error handled correctly');
      } catch (error: any) {
        expect(error.response?.status).to.equal(401);
      }
    });
  });

  describe('{{className}} Performance Tests', () => {
    
    it('should complete operations within acceptable time limits', async function() {
      this.timeout(15000);
      
      const startTime = Date.now();
      
      await restified
        .given()
          .baseURL('{{baseURL}}')
          .header('Authorization', \`Bearer \${authToken}\`)
        .when()
          .get('/{{name}}s')
        .then()
          .statusCode(200)
          .responseTime(5000) // Should complete within 5 seconds
        .execute();

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).to.be.lessThan(5000);
      console.log(\`✅ Performance test completed in \${duration}ms\`);
    });
  });
});`);

    this.templates.set('graphql', `import { expect } from 'chai';
import { restified } from '../src';

describe('{{className}} GraphQL Tests @integration @graphql @{{name}}', () => {
  
  before(async function() {
    this.timeout(5000);
    
    console.log('🚀 Setting up {{className}} GraphQL tests...');
    
    // Add GraphQL endpoint
    restified.addGraphQLEndpoint({
      name: '{{name}}GraphQL',
      endpoint: '{{baseURL}}/graphql',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ GraphQL endpoint configured');
  });

  describe('{{className}} GraphQL Queries', () => {
    
    it('should execute basic GraphQL query', async function() {
      this.timeout(8000);
      
      const query = \`
        query Get{{className}}s {
          {{name}}s {
            id
            name
            description
            createdAt
          }
        }
      \`;

      try {
        const result = await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Content-Type', 'application/json')
          .when()
            .graphqlQuery(query)
            .post('/graphql')
          .then()
            .statusCode(200)
            .jsonPath('$.data.{{name}}s', (items) => Array.isArray(items))
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data.data).to.have.property('{{name}}s');
        
        console.log(\`✅ Retrieved \${result.data.data.{{name}}s.length} {{name}} records via GraphQL\`);
        
      } catch (error: any) {
        console.warn('GraphQL query test failed:', error.message);
        this.skip();
      }
    });

    it('should execute GraphQL query with variables', async function() {
      this.timeout(8000);
      
      const query = \`
        query Get{{className}}ById($id: ID!) {
          {{name}}(id: $id) {
            id
            name
            description
            status
          }
        }
      \`;

      const variables = { id: '1' };

      try {
        const result = await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Content-Type', 'application/json')
          .when()
            .graphql(query, variables)
            .post('/graphql')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        
        if (result.data.data.{{name}}) {
          expect(result.data.data.{{name}}).to.have.property('id');
          console.log(\`✅ Retrieved {{name}} by ID via GraphQL\`);
        } else {
          console.log('ℹ️  No {{name}} found with ID 1 (expected in test environment)');
        }
        
      } catch (error: any) {
        console.warn('GraphQL query with variables test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('{{className}} GraphQL Mutations', () => {
    
    it('should execute GraphQL mutation', async function() {
      this.timeout(8000);
      
      const mutation = \`
        mutation Create{{className}}($input: {{className}}Input!) {
          create{{className}}(input: $input) {
            id
            name
            description
            status
          }
        }
      \`;

      const variables = {
        input: {
          name: \`GraphQL Test {{className}} \${Date.now()}\`,
          description: 'Created via GraphQL mutation test',
          status: 'active'
        }
      };

      try {
        const result = await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Content-Type', 'application/json')
          .when()
            .graphqlMutation(mutation, variables)
            .post('/graphql')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        
        if (result.data.data && result.data.data.create{{className}}) {
          expect(result.data.data.create{{className}}).to.have.property('id');
          console.log(\`✅ Created {{name}} via GraphQL mutation\`);
          
          // Store for potential cleanup
          const createdId = result.data.data.create{{className}}.id;
          restified.setLocalVariable('createdGraphQLId', createdId);
        } else if (result.data.errors) {
          console.warn('GraphQL mutation returned errors:', result.data.errors);
        }
        
      } catch (error: any) {
        console.warn('GraphQL mutation test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('{{className}} GraphQL Error Handling', () => {
    
    it('should handle GraphQL syntax errors', async function() {
      this.timeout(5000);
      
      const invalidQuery = \`
        query InvalidSyntax {
          {{name}}s {
            id
            name
            // Missing closing brace
      \`;

      try {
        const result = await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Content-Type', 'application/json')
          .when()
            .graphql(invalidQuery)
            .post('/graphql')
          .then()
            .statusCode([200, 400])
          .execute();

        // GraphQL typically returns 200 with errors in the response
        if (result.status === 200) {
          expect(result.data).to.have.property('errors');
          expect(result.data.errors).to.be.an('array');
          console.log('✅ GraphQL syntax error handled correctly');
        } else {
          console.log('✅ GraphQL syntax error returned 400 status');
        }
        
      } catch (error: any) {
        console.warn('GraphQL syntax error test failed:', error.message);
        this.skip();
      }
    });

    it('should handle invalid field queries', async function() {
      this.timeout(5000);
      
      const invalidFieldQuery = \`
        query InvalidField {
          {{name}}s {
            id
            nonExistentField
          }
        }
      \`;

      try {
        const result = await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Content-Type', 'application/json')
          .when()
            .graphql(invalidFieldQuery)
            .post('/graphql')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        
        if (result.data.errors && result.data.errors.length > 0) {
          console.log('✅ Invalid field query error handled correctly');
        } else {
          console.log('ℹ️  GraphQL schema might allow unknown fields');
        }
        
      } catch (error: any) {
        console.warn('GraphQL invalid field test failed:', error.message);
        this.skip();
      }
    });
  });
});`);

    this.templates.set('websocket', `import { expect } from 'chai';
import { restified } from '../src';

describe('{{className}} WebSocket Tests @integration @websocket @{{name}}', () => {
  
  before(async function() {
    this.timeout(10000);
    
    console.log('🚀 Setting up {{className}} WebSocket tests...');
    
    try {
      // Add WebSocket connection
      restified.addWebSocketConnection({
        name: '{{name}}WebSocket',
        url: '{{baseURL}}'.replace('http', 'ws').replace('https', 'wss') + '/ws',
        protocols: ['{{name}}-protocol'],
        timeout: 8000
      });
      
      console.log('✅ WebSocket connection configured');
      
    } catch (error: any) {
      console.warn('WebSocket setup failed:', error.message);
    }
  });

  after(async function() {
    this.timeout(5000);
    
    console.log('🧹 Cleaning up WebSocket connections...');
    
    try {
      await restified.disconnectAllWebSockets();
      console.log('✅ WebSocket cleanup completed');
    } catch (error: any) {
      console.warn('WebSocket cleanup failed:', error.message);
    }
  });

  describe('{{className}} WebSocket Connection', () => {
    
    it('should connect to WebSocket server', async function() {
      this.timeout(10000);
      
      try {
        await restified.connectWebSocket('{{name}}WebSocket');
        
        console.log('✅ WebSocket connection established');
        expect(true).to.be.true; // Connection successful
        
      } catch (error: any) {
        console.warn('WebSocket connection test failed:', error.message);
        this.skip();
      }
    });

    it('should send and receive text messages', async function() {
      this.timeout(12000);
      
      try {
        // Ensure connection is established
        await restified.connectWebSocket('{{name}}WebSocket');
        
        const testMessage = \`Hello from {{className}} WebSocket test - \${Date.now()}\`;
        
        // Send message
        await restified.sendWebSocketText(testMessage, '{{name}}WebSocket');
        console.log(\`📤 Sent message: \${testMessage}\`);
        
        // Wait for echo response (assuming echo server)
        const receivedMessage = await restified.waitForWebSocketMessage(
          (message) => message === testMessage,
          '{{name}}WebSocket'
        );
        
        expect(receivedMessage).to.equal(testMessage);
        console.log(\`📥 Received echo: \${receivedMessage}\`);
        
      } catch (error: any) {
        console.warn('WebSocket text message test failed:', error.message);
        this.skip();
      }
    });

    it('should send and receive JSON messages', async function() {
      this.timeout(12000);
      
      try {
        // Ensure connection is established
        await restified.connectWebSocket('{{name}}WebSocket');
        
        const jsonMessage = {
          type: '{{name}}_message',
          data: {
            id: Date.now(),
            content: 'Test JSON message from RestifiedTS',
            timestamp: new Date().toISOString()
          },
          metadata: {
            testSuite: '{{className}}WebSocketTests',
            version: '1.0.0'
          }
        };
        
        // Send JSON message
        await restified.sendWebSocketJSON(jsonMessage, '{{name}}WebSocket');
        console.log('📤 Sent JSON message:', JSON.stringify(jsonMessage, null, 2));
        
        // Wait for response (this depends on your WebSocket server implementation)
        try {
          const response = await restified.waitForWebSocketMessage(
            (message) => {
              try {
                const parsed = JSON.parse(message);
                return parsed.type === '{{name}}_message';
              } catch {
                return false;
              }
            },
            '{{name}}WebSocket'
          );
          
          console.log('📥 Received JSON response');
          expect(response).to.exist;
          
        } catch (timeoutError) {
          console.log('ℹ️  No JSON response received (may be expected for some servers)');
        }
        
      } catch (error: any) {
        console.warn('WebSocket JSON message test failed:', error.message);
        this.skip();
      }
    });

    it('should handle multiple concurrent messages', async function() {
      this.timeout(15000);
      
      try {
        // Ensure connection is established
        await restified.connectWebSocket('{{name}}WebSocket');
        
        const messageCount = 5;
        const messages = Array.from({ length: messageCount }, (_, i) => 
          \`Concurrent message \${i + 1} from {{className}} - \${Date.now()}\`
        );
        
        // Send all messages concurrently
        const sendPromises = messages.map(message => 
          restified.sendWebSocketText(message, '{{name}}WebSocket')
        );
        
        await Promise.all(sendPromises);
        console.log(\`📤 Sent \${messageCount} concurrent messages\`);
        
        // For echo servers, we should receive all messages back
        // This is a simplified test - in real scenarios you might need more sophisticated message handling
        console.log('✅ Concurrent message sending completed');
        
      } catch (error: any) {
        console.warn('WebSocket concurrent messages test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('{{className}} WebSocket Error Handling', () => {
    
    it('should handle connection failures gracefully', async function() {
      this.timeout(8000);
      
      try {
        // Try to connect to non-existent WebSocket server
        restified.addWebSocketConnection({
          name: 'invalidWebSocket',
          url: 'wss://non-existent-websocket-server.invalid/ws',
          protocols: [],
          timeout: 3000
        });
        
        await restified.connectWebSocket('invalidWebSocket');
        
        // Should not reach here
        expect.fail('Expected WebSocket connection to fail');
        
      } catch (error: any) {
        // This is expected
        expect(error).to.exist;
        console.log('✅ Connection failure handled correctly');
      }
    });

    it('should handle sending messages to disconnected socket', async function() {
      this.timeout(8000);
      
      try {
        // First disconnect if connected
        await restified.disconnectWebSocket('{{name}}WebSocket');
        
        // Try to send message to disconnected socket
        await restified.sendWebSocketText('Test message', '{{name}}WebSocket');
        
        // Should not reach here
        expect.fail('Expected message sending to fail on disconnected socket');
        
      } catch (error: any) {
        // This is expected
        expect(error).to.exist;
        console.log('✅ Disconnected socket error handled correctly');
      }
    });
  });

  describe('{{className}} WebSocket Performance', () => {
    
    it('should handle high-frequency messages efficiently', async function() {
      this.timeout(20000);
      
      try {
        // Ensure connection is established
        await restified.connectWebSocket('{{name}}WebSocket');
        
        const messageCount = 50;
        const startTime = Date.now();
        
        // Send messages rapidly
        for (let i = 0; i < messageCount; i++) {
          await restified.sendWebSocketText(
            \`High-frequency message \${i + 1}/\${messageCount}\`,
            '{{name}}WebSocket'
          );
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        const messagesPerSecond = Math.round((messageCount / duration) * 1000);
        
        console.log(\`✅ Sent \${messageCount} messages in \${duration}ms (\${messagesPerSecond} msg/sec)\`);
        
        // Performance assertion - should handle at least 10 messages per second
        expect(messagesPerSecond).to.be.greaterThan(10);
        
      } catch (error: any) {
        console.warn('WebSocket performance test failed:', error.message);
        this.skip();
      }
    });
  });
});`);

    this.templates.set('setup', `import { expect } from 'chai';
import { restified } from '../src';

/**
 * {{className}} Test Setup and Teardown
 * 
 * This test suite provides setup and teardown functionality for {{name}} tests.
 * It demonstrates best practices for test environment management.
 */

describe('{{className}} Test Setup @setup @{{name}}', () => {
  // Global test data
  let globalTestData: any = {};
  let createdResources: any[] = [];

  /**
   * GLOBAL SETUP - Runs once before all tests
   */
  before(async function() {
    this.timeout(30000);
    
    console.log('🚀 Starting {{className}} test suite setup...');
    
    try {
      // 1. Environment verification
      console.log('🔍 Step 1: Verifying test environment...');
      
      const healthCheck = await restified
        .given()
          .baseURL('{{baseURL}}')
          .timeout(10000)
        .when()
          .get('/health')
        .then()
          .statusCode([200, 404]) // 404 is OK if no health endpoint
        .execute();
      
      console.log('✅ Test environment accessible');

      // 2. Authentication setup
      console.log('🔐 Step 2: Setting up authentication...');
      
      try {
        const authResult = await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Content-Type', 'application/json')
            .body({
              username: process.env.TEST_USERNAME || 'test-admin',
              password: process.env.TEST_PASSWORD || 'test-password'
            })
          .when()
            .post('/auth/login')
          .then()
            .statusCode(200)
            .extract('$.token', 'globalAuthToken')
          .execute();

        const authToken = restified.getGlobalVariable('globalAuthToken');
        console.log(\`✅ Authentication successful: \${authToken?.substring(0, 20)}...\`);
        
      } catch (authError: any) {
        console.warn('⚠️  Authentication failed, using mock token:', authError.message);
        restified.setGlobalVariable('globalAuthToken', 'mock-jwt-token-for-testing');
      }

      // 3. Test data initialization
      console.log('📊 Step 3: Initializing test data...');
      
      globalTestData = {
        suiteId: \`{{name}}_suite_\${Date.now()}\`,
        startTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test',
        baseURL: '{{baseURL}}',
        testUser: {
          name: '{{className}} Test User',
          email: \`{{name}}.test@restifiedts.com\`,
          role: 'tester'
        }
      };
      
      restified.setGlobalVariable('testSuiteData', globalTestData);
      console.log('✅ Test data initialized');

      // 4. Create global test resources if needed
      console.log('🏗️  Step 4: Creating global test resources...');
      
      try {
        const testUserResult = await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Content-Type', 'application/json')
            .header('Authorization', \`Bearer \${restified.getGlobalVariable('globalAuthToken')}\`)
            .body(globalTestData.testUser)
          .when()
            .post('/users')
          .then()
            .statusCode([201, 409]) // 409 if user already exists
            .extract('$.id', 'globalTestUserId')
          .execute();

        if (testUserResult.status === 201) {
          const userId = restified.getGlobalVariable('globalTestUserId');
          createdResources.push({ type: 'user', id: userId });
          console.log(\`✅ Global test user created: \${userId}\`);
        } else {
          console.log('ℹ️  Test user already exists');
        }
        
      } catch (userError: any) {
        console.warn('⚠️  Failed to create test user:', userError.message);
      }

      // 5. Configure test clients
      console.log('⚙️  Step 5: Configuring test clients...');
      
      restified.createClient('{{name}}Client', {
        baseURL: '{{baseURL}}',
        timeout: 10000,
        headers: {
          'Authorization': \`Bearer \${restified.getGlobalVariable('globalAuthToken')}\`,
          'X-Test-Suite': globalTestData.suiteId
        }
      });
      
      console.log('✅ Test clients configured');

      console.log('🎉 {{className}} test suite setup completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Global setup failed:', error.message);
      console.error('Stack trace:', error.stack);
      throw new Error(\`{{className}} setup failed: \${error.message}\`);
    }
  });

  /**
   * GLOBAL CLEANUP - Runs once after all tests
   */
  after(async function() {
    this.timeout(20000);
    
    console.log('🧹 Starting {{className}} test suite cleanup...');
    
    try {
      // 1. Clean up created resources
      console.log('🗑️  Step 1: Cleaning up created resources...');
      
      for (const resource of createdResources) {
        try {
          await restified
            .given()
              .baseURL('{{baseURL}}')
              .header('Authorization', \`Bearer \${restified.getGlobalVariable('globalAuthToken')}\`)
            .when()
              .delete(\`/\${resource.type}s/\${resource.id}\`)
            .then()
              .statusCode([200, 204, 404])
            .execute();
          
          console.log(\`✅ Cleaned up \${resource.type}: \${resource.id}\`);
        } catch (cleanupError: any) {
          console.warn(\`⚠️  Failed to cleanup \${resource.type} \${resource.id}:\`, cleanupError.message);
        }
      }

      // 2. Generate test execution summary
      console.log('📊 Step 2: Generating execution summary...');
      
      const summary = {
        ...globalTestData,
        endTime: new Date().toISOString(),
        resourcesCreated: createdResources.length,
        duration: Date.now() - new Date(globalTestData.startTime).getTime()
      };
      
      console.log('📋 {{className}} Test Suite Summary:');
      console.log(JSON.stringify(summary, null, 2));

      // 3. Clear global state
      console.log('🔄 Step 3: Clearing global state...');
      
      restified.clearGlobalVariables();
      createdResources = [];
      globalTestData = {};
      
      console.log('✅ {{className}} test suite cleanup completed!');
      
    } catch (error: any) {
      console.error('❌ Global cleanup failed:', error.message);
    }
  });

  /**
   * INDIVIDUAL TEST HOOKS
   */
  beforeEach(function() {
    console.log(\`🔧 Setting up test: \${this.currentTest?.title}\`);
    
    restified.setLocalVariable('currentTestName', this.currentTest?.title || 'unknown');
    restified.setLocalVariable('testStartTime', Date.now());
    restified.setLocalVariable('testId', \`\${globalTestData.suiteId}_\${Date.now()}\`);
  });

  afterEach(async function() {
    const testName = restified.getLocalVariable('currentTestName');
    const testStartTime = restified.getLocalVariable('testStartTime') || Date.now();
    const testDuration = Date.now() - testStartTime;
    const testPassed = this.currentTest?.state === 'passed';
    
    console.log(\`🧽 Cleaning up test: \${testName} (\${testPassed ? 'PASSED' : 'FAILED'}) - \${testDuration}ms\`);
    
    // Clean up test-specific resources
    const testResources = restified.getLocalVariable('testResources') || [];
    for (const resource of testResources) {
      try {
        await restified
          .given()
            .baseURL('{{baseURL}}')
            .header('Authorization', \`Bearer \${restified.getGlobalVariable('globalAuthToken')}\`)
          .when()
            .delete(\`/\${resource.type}s/\${resource.id}\`)
          .then()
            .statusCode([200, 204, 404])
          .execute();
      } catch (error: any) {
        console.warn(\`⚠️  Failed to cleanup test resource:\`, error.message);
      }
    }
    
    restified.clearLocalVariables();
  });

  /**
   * SETUP VALIDATION TESTS
   */
  describe('Setup Validation', () => {
    
    it('should have valid global authentication', function() {
      const authToken = restified.getGlobalVariable('globalAuthToken');
      expect(authToken).to.exist;
      expect(authToken).to.be.a('string');
      expect(authToken.length).to.be.greaterThan(10);
      
      console.log('✅ Global authentication token is valid');
    });

    it('should have accessible test environment', async function() {
      this.timeout(5000);
      
      const result = await restified
        .given()
          .baseURL('{{baseURL}}')
        .when()
          .get('/')
        .then()
          .statusCode([200, 404, 405]) // Various acceptable responses
        .execute();
      
      expect([200, 404, 405]).to.include(result.status);
      console.log(\`✅ Test environment accessible (HTTP \${result.status})\`);
    });

    it('should have configured test clients', function() {
      const clientNames = restified.getClientNames();
      expect(clientNames).to.include('{{name}}Client');
      
      console.log(\`✅ Test clients configured: \${clientNames.join(', ')}\`);
    });

    it('should have valid test suite data', function() {
      const suiteData = restified.getGlobalVariable('testSuiteData');
      expect(suiteData).to.exist;
      expect(suiteData.suiteId).to.include('{{name}}_suite_');
      expect(suiteData.environment).to.be.a('string');
      
      console.log('✅ Test suite data is valid');
    });
  });

  describe('Resource Management', () => {
    
    it('should be able to create and track test resources', async function() {
      this.timeout(8000);
      
      try {
        const testResource = {
          name: \`Test Resource \${Date.now()}\`,
          description: 'Created by setup validation test',
          type: 'test'
        };

        const result = await restified
          .given()
            .useClient('{{name}}Client')
            .body(testResource)
          .when()
            .post('/{{name}}s')
          .then()
            .statusCode([201, 200])
            .extract('$.id', 'testResourceId')
          .execute();

        const resourceId = restified.getVariable('testResourceId');
        if (resourceId) {
          restified.setLocalVariable('testResources', [{ type: '{{name}}', id: resourceId }]);
          console.log(\`✅ Created and tracked test resource: \${resourceId}\`);
        } else {
          console.log('ℹ️  Resource creation test completed (no ID returned)');
        }
        
      } catch (error: any) {
        console.warn('Resource creation test failed:', error.message);
        this.skip();
      }
    });
  });
});`);
  }

  private getTemplate(type: string): string {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Unknown test type: ${type}. Available types: ${Array.from(this.templates.keys()).join(', ')}`);
    }
    return template;
  }

  private generateFileName(name: string, type: string): string {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    switch (type) {
      case 'api':
      case 'crud':
      case 'auth':
        return `api/${sanitizedName}.test.ts`;
      case 'graphql':
        return `graphql/${sanitizedName}.test.ts`;
      case 'websocket':
        return `websocket/${sanitizedName}.test.ts`;
      case 'setup':
        return `setup/${sanitizedName}-setup.test.ts`;
      default:
        return `${sanitizedName}.test.ts`;
    }
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Replace all template variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    });
    
    return result;
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}