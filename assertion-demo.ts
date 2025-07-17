/**
 * Assertion and Validation Demo for RestifiedTS
 * 
 * This demo showcases the comprehensive assertion and validation utilities
 * including response assertions, schema validation, custom matchers, and plugins.
 */

import { 
  AssertionEngine, 
  ResponseAssertions, 
  SchemaValidator, 
  AssertionManager,
  AssertionType,
  AssertionSeverity
} from './src/assertions';
import { RestifiedResponse } from './src/types/RestifiedTypes';
import * as Joi from 'joi';

// Sample response data for demonstration
const sampleResponse: RestifiedResponse = {
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'x-rate-limit': '100',
    'set-cookie': 'session=abc123; HttpOnly; Secure',
    'cache-control': 'no-cache'
  },
  data: {
    id: 'user-123',
    name: 'John Doe',
    email: 'john.doe@example.com',
    age: 30,
    isActive: true,
    profile: {
      bio: 'Software developer',
      location: 'San Francisco'
    },
    tags: ['developer', 'javascript', 'typescript'],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-06-01T12:00:00Z'
  },
  responseTime: 245,
  request: {
    method: 'GET',
    url: 'https://api.example.com/users/123',
    headers: {}
  }
};

async function runAssertionDemo() {
  console.log('🔍 Starting RestifiedTS Assertion and Validation Demo\n');

  try {
    // 1. Basic Assertion Engine Demo
    console.log('1. Testing Basic Assertion Engine');
    
    const engine = new AssertionEngine({
      timeout: 5000,
      retryAttempts: 2,
      failFast: false,
      collectAllErrors: true
    });

    // Basic assertions
    let result = await engine.assert(AssertionType.EQUALS, 'hello', 'hello');
    console.log('✓ Equal assertion:', result.success ? 'PASSED' : 'FAILED');
    
    result = await engine.assert(AssertionType.CONTAINS, 'hello world', 'world');
    console.log('✓ Contains assertion:', result.success ? 'PASSED' : 'FAILED');
    
    result = await engine.assert(AssertionType.MATCHES, 'test123', /test\d+/);
    console.log('✓ Regex match assertion:', result.success ? 'PASSED' : 'FAILED');
    
    result = await engine.assert(AssertionType.IS_VALID_EMAIL, 'test@example.com');
    console.log('✓ Email validation:', result.success ? 'PASSED' : 'FAILED');
    
    result = await engine.assert(AssertionType.IS_VALID_UUID, '123e4567-e89b-12d3-a456-426614174000');
    console.log('✓ UUID validation:', result.success ? 'PASSED' : 'FAILED');
    
    // Batch assertions
    const batchResults = await engine.assertBatch([
      { type: AssertionType.IS_ARRAY, actual: [1, 2, 3] },
      { type: AssertionType.HAS_LENGTH, actual: 'hello', expected: 5 },
      { type: AssertionType.IS_NUMBER, actual: 42 },
      { type: AssertionType.IS_BOOLEAN, actual: true }
    ]);
    
    console.log('✓ Batch assertions:', batchResults.every(r => r.success) ? 'ALL PASSED' : 'SOME FAILED');
    console.log();

    // 2. Response Assertions Demo
    console.log('2. Testing Response Assertions');
    
    const responseAssertions = new ResponseAssertions(sampleResponse);
    
    // Status code assertions
    result = await responseAssertions.assertStatusCode(200);
    console.log('✓ Status code 200:', result.success ? 'PASSED' : 'FAILED');
    
    result = await responseAssertions.assertStatusCodeInRange(200, 299);
    console.log('✓ Status code in range 200-299:', result.success ? 'PASSED' : 'FAILED');
    
    // Header assertions
    result = await responseAssertions.assertHeader({
      name: 'Content-Type',
      type: AssertionType.CONTAINS,
      expected: 'application/json'
    });
    console.log('✓ Content-Type header:', result.success ? 'PASSED' : 'FAILED');
    
    // Response time assertion
    result = await responseAssertions.assertResponseTime({
      maxTime: 1000,
      unit: 'ms'
    });
    console.log('✓ Response time < 1000ms:', result.success ? 'PASSED' : 'FAILED');
    
    // JSON Path assertions
    result = await responseAssertions.assertJsonPath({
      path: '$.name',
      type: AssertionType.EQUALS,
      expected: 'John Doe'
    });
    console.log('✓ JSON path $.name:', result.success ? 'PASSED' : 'FAILED');
    
    result = await responseAssertions.assertJsonPath({
      path: '$.tags[*]',
      type: AssertionType.CONTAINS,
      expected: 'javascript'
    });
    console.log('✓ JSON path $.tags contains javascript:', result.success ? 'PASSED' : 'FAILED');
    
    result = await responseAssertions.assertJsonPath({
      path: '$.profile.location',
      type: AssertionType.EQUALS,
      expected: 'San Francisco'
    });
    console.log('✓ JSON path $.profile.location:', result.success ? 'PASSED' : 'FAILED');
    
    // Body content assertions
    result = await responseAssertions.assertBodyContains('john.doe@example.com');
    console.log('✓ Body contains email:', result.success ? 'PASSED' : 'FAILED');
    
    result = await responseAssertions.assertBodyIsValidJson();
    console.log('✓ Body is valid JSON:', result.success ? 'PASSED' : 'FAILED');
    
    // Cookie assertions
    result = await responseAssertions.assertCookie({
      name: 'session',
      value: 'abc123'
    });
    console.log('✓ Cookie assertion:', result.success ? 'PASSED' : 'FAILED');
    
    // Content type assertion
    result = await responseAssertions.assertContentType({
      type: 'application/json',
      charset: 'utf-8'
    });
    console.log('✓ Content type assertion:', result.success ? 'PASSED' : 'FAILED');
    console.log();

    // 3. Schema Validation Demo
    console.log('3. Testing Schema Validation');
    
    const schemaValidator = new SchemaValidator({
      strict: true,
      allowUnknownProperties: false,
      errorLimit: 10
    });

    // JSON Schema validation
    const jsonSchema = {
      type: 'object',
      properties: {
        id: { type: 'string', pattern: '^user-' },
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
        age: { type: 'number', minimum: 0, maximum: 150 },
        isActive: { type: 'boolean' },
        profile: {
          type: 'object',
          properties: {
            bio: { type: 'string' },
            location: { type: 'string' }
          },
          required: ['bio']
        },
        tags: {
          type: 'array',
          items: { type: 'string' }
        },
        createdAt: { type: 'string', format: 'date' },
        updatedAt: { type: 'string', format: 'date' }
      },
      required: ['id', 'name', 'email', 'age', 'isActive']
    };

    let validationResult = await schemaValidator.validateJsonSchema(sampleResponse.data, jsonSchema);
    console.log('✓ JSON Schema validation:', validationResult.valid ? 'PASSED' : 'FAILED');
    if (!validationResult.valid) {
      console.log('  Errors:', validationResult.errors.map(e => e.message).join(', '));
    }

    // Joi Schema validation
    const joiSchema = Joi.object({
      id: Joi.string().pattern(/^user-/).required(),
      name: Joi.string().min(1).max(100).required(),
      email: Joi.string().email().required(),
      age: Joi.number().integer().min(0).max(150).required(),
      isActive: Joi.boolean().required(),
      profile: Joi.object({
        bio: Joi.string().required(),
        location: Joi.string().optional()
      }).required(),
      tags: Joi.array().items(Joi.string()).optional(),
      createdAt: Joi.date().iso().required(),
      updatedAt: Joi.date().iso().required()
    });

    validationResult = await schemaValidator.validateJoiSchema(sampleResponse.data, joiSchema);
    console.log('✓ Joi Schema validation:', validationResult.valid ? 'PASSED' : 'FAILED');
    if (!validationResult.valid) {
      console.log('  Errors:', validationResult.errors.map(e => e.message).join(', '));
    }

    // Array validation
    const userArray = [sampleResponse.data, { ...sampleResponse.data, id: 'user-456', name: 'Jane Doe' }];
    validationResult = await schemaValidator.validateArray(userArray, joiSchema, 'joi');
    console.log('✓ Array validation:', validationResult.valid ? 'PASSED' : 'FAILED');

    // Common schemas
    const commonSchemas = SchemaValidator.createCommonSchemas();
    validationResult = await schemaValidator.validateJoiSchema(sampleResponse.data.email, commonSchemas.email);
    console.log('✓ Common email schema:', validationResult.valid ? 'PASSED' : 'FAILED');

    // Custom format validation
    schemaValidator.addCustomFormat('username', (value: string) => {
      return /^[a-zA-Z0-9_]+$/.test(value) && value.length >= 3;
    });
    console.log('✓ Custom format added successfully');
    console.log();

    // 4. Assertion Manager Demo
    console.log('4. Testing Assertion Manager');
    
    const assertionManager = new AssertionManager({
      timeout: 10000,
      retryAttempts: 3,
      failFast: false,
      collectAllErrors: true
    });

    // Response assertions through manager
    const responseAssertionsManager = assertionManager.forResponse(sampleResponse);
    
    // Batch assertions
    const batchAssertionResults = await assertionManager.batch('user-validation-batch')
      .statusCode(200)
      .header('Content-Type', AssertionType.CONTAINS, 'application/json')
      .jsonPath('$.name', AssertionType.EQUALS, 'John Doe')
      .jsonPath('$.email', AssertionType.MATCHES, /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      .jsonPath('$.age', AssertionType.GREATER_THAN, 18)
      .responseTime(1000, 'ms')
      .contentType('application/json')
      .execute(sampleResponse);
    
    console.log('✓ Batch assertions:', batchAssertionResults.every(r => r.success) ? 'ALL PASSED' : 'SOME FAILED');
    console.log(`  Total: ${batchAssertionResults.length}, Passed: ${batchAssertionResults.filter(r => r.success).length}`);

    // Fluent assertion API
    result = await assertionManager.expect('hello world').toContain('world');
    console.log('✓ Fluent assertion (contains):', result.success ? 'PASSED' : 'FAILED');
    
    result = await assertionManager.expect(42).toBeOfType('number');
    console.log('✓ Fluent assertion (type):', result.success ? 'PASSED' : 'FAILED');
    
    result = await assertionManager.expect([1, 2, 3]).toHaveLength(3);
    console.log('✓ Fluent assertion (length):', result.success ? 'PASSED' : 'FAILED');

    // Schema validation through manager
    validationResult = await assertionManager.validateSchema(sampleResponse.data, joiSchema, 'joi');
    console.log('✓ Schema validation via manager:', validationResult.valid ? 'PASSED' : 'FAILED');

    // Custom matcher
    assertionManager.addMatcher({
      name: 'isValidUserProfile',
      description: 'Validates user profile structure',
      match: (actual: any) => {
        const isValid = actual && 
          typeof actual === 'object' &&
          typeof actual.bio === 'string' &&
          actual.bio.length > 0;
        
        return {
          success: isValid,
          message: isValid ? 'Valid user profile' : 'Invalid user profile structure',
          actual,
          timestamp: new Date()
        };
      },
      supportedTypes: ['object'],
      examples: [
        { actual: { bio: 'test' }, expected: undefined, result: true },
        { actual: { bio: '' }, expected: undefined, result: false }
      ]
    });

    result = await assertionManager.getEngine().assert('isValidUserProfile', sampleResponse.data.profile);
    console.log('✓ Custom matcher:', result.success ? 'PASSED' : 'FAILED');

    // Statistics
    const stats = assertionManager.getStatistics();
    console.log('✓ Assertion statistics:', {
      total: stats.totalAssertions,
      successRate: `${stats.successRate.toFixed(1)}%`,
      plugins: stats.pluginCount,
      matchers: stats.matcherCount
    });

    // Generate report
    const report = assertionManager.generateReport();
    console.log('✓ Generated assertion report:', {
      totalAssertions: report.totalAssertions,
      passed: report.passedAssertions,
      failed: report.failedAssertions,
      executionTime: `${report.executionTime}ms`,
      successRate: `${report.summary.successRate.toFixed(1)}%`
    });
    console.log();

    // 5. Advanced Features Demo
    console.log('5. Testing Advanced Features');

    // Plugin simulation
    const customPlugin = {
      name: 'custom-test-plugin',
      version: '1.0.0',
      description: 'Custom test plugin for demonstration',
      matchers: [
        {
          name: 'isValidPassword',
          description: 'Validates password strength',
          match: (actual: any) => {
            const isValid = typeof actual === 'string' &&
              actual.length >= 8 &&
              /[A-Z]/.test(actual) &&
              /[a-z]/.test(actual) &&
              /\d/.test(actual) &&
              /[!@#$%^&*]/.test(actual);
            
            return {
              success: isValid,
              message: isValid ? 'Strong password' : 'Weak password',
              actual,
              timestamp: new Date()
            };
          },
          supportedTypes: ['string'],
          examples: [
            { actual: 'StrongPass123!', expected: undefined, result: true },
            { actual: 'weak', expected: undefined, result: false }
          ]
        }
      ],
      validators: []
    };

    assertionManager.registerPlugin(customPlugin);
    console.log('✓ Custom plugin registered');

    result = await assertionManager.getEngine().assert('isValidPassword', 'StrongPass123!');
    console.log('✓ Plugin matcher:', result.success ? 'PASSED' : 'FAILED');

    // Error handling demo
    try {
      await assertionManager.getEngine().assert('unknownAssertion', 'test');
    } catch (error) {
      console.log('✓ Error handling:', error instanceof Error ? 'CAUGHT' : 'UNEXPECTED');
    }

    // Performance test
    const startTime = Date.now();
    const performanceResults = await Promise.all([
      assertionManager.expect('test').toEqual('test'),
      assertionManager.expect(100).toBeGreaterThan(50),
      assertionManager.expect([1, 2, 3]).toHaveLength(3),
      assertionManager.expect({ key: 'value' }).toHaveProperty('key')
    ]);
    const endTime = Date.now();
    
    console.log('✓ Performance test:', {
      assertions: performanceResults.length,
      time: `${endTime - startTime}ms`,
      passed: performanceResults.filter(r => r.success).length
    });

    console.log();
    console.log('✅ Assertion and Validation Demo completed successfully!');
    console.log('');
    console.log('💡 Key Features Demonstrated:');
    console.log('1. Comprehensive assertion engine with 20+ built-in assertion types');
    console.log('2. Specialized response assertions for HTTP responses');
    console.log('3. JSON Schema and Joi schema validation');
    console.log('4. Custom matchers and plugins support');
    console.log('5. Fluent assertion API for readable tests');
    console.log('6. Batch assertions for complex validation scenarios');
    console.log('7. Detailed reporting and statistics');
    console.log('8. Performance optimization and error handling');

  } catch (error) {
    console.error('❌ Assertion Demo failed:', error);
  }
}

// Run the demo
runAssertionDemo();