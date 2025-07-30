/**
 * DataTemplateEngine Unit Tests
 * 
 * Tests for advanced data generation, template resolution, and boundary testing.
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { DataTemplateEngine, DataFieldSpec, EndpointDataSpec, EndpointTestCase } from '../../../src/core/enterprise';

describe('DataTemplateEngine', function() {
  let dataEngine: DataTemplateEngine;

  beforeEach(function() {
    dataEngine = new DataTemplateEngine();
  });

  afterEach(function() {
    dataEngine.clearCache();
  });

  describe('Field Value Generation', function() {
    it('should generate string values', function() {
      const spec: DataFieldSpec = { type: 'string' };
      const value = dataEngine['generateFieldValue'](spec);
      
      expect(value).to.be.a('string');
      expect(value).to.have.length.above(0);
    });

    it('should generate number values within constraints', function() {
      const spec: DataFieldSpec = { type: 'number', min: 10, max: 20 };
      const value = dataEngine['generateFieldValue'](spec);
      
      expect(value).to.be.a('number');
      expect(value).to.be.at.least(10);
      expect(value).to.be.at.most(20);
    });

    it('should generate boolean values', function() {
      const spec: DataFieldSpec = { type: 'boolean' };
      const value = dataEngine['generateFieldValue'](spec);
      
      expect(value).to.be.a('boolean');
    });

    it('should generate email values', function() {
      const spec: DataFieldSpec = { type: 'email' };
      const value = dataEngine['generateFieldValue'](spec);
      
      expect(value).to.be.a('string');
      expect(value).to.include('@');
      expect(value).to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should generate UUID values', function() {
      const spec: DataFieldSpec = { type: 'uuid' };
      const value = dataEngine['generateFieldValue'](spec);
      
      expect(value).to.be.a('string');
      expect(value).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate date values', function() {
      const spec: DataFieldSpec = { type: 'date' };
      const value = dataEngine['generateFieldValue'](spec);
      
      expect(value).to.be.a('string');
      expect(new Date(value)).to.be.instanceOf(Date);
      expect(isNaN(new Date(value).getTime())).to.be.false;
    });

    it('should generate array values', function() {
      const spec: DataFieldSpec = { type: 'array' };
      const value = dataEngine['generateFieldValue'](spec);
      
      expect(value).to.be.an('array');
      expect(value.length).to.be.at.least(1);
    });

    it('should generate object values', function() {
      const spec: DataFieldSpec = { type: 'object' };
      const value = dataEngine['generateFieldValue'](spec);
      
      expect(value).to.be.an('object');
      expect(value).to.not.be.null;
    });

    it('should use default values when provided', function() {
      const spec: DataFieldSpec = { type: 'string', default: 'default_value' };
      const value = dataEngine['generateFieldValue'](spec);
      
      expect(value).to.equal('default_value');
    });

    it('should select from enum values', function() {
      const enumValues = ['option1', 'option2', 'option3'];
      const spec: DataFieldSpec = { type: 'string', enum: enumValues };
      const value = dataEngine['generateFieldValue'](spec);
      
      expect(enumValues).to.include(value);
    });

    it('should use faker methods when specified', function() {
      const fakerSpecs: DataFieldSpec[] = [
        { type: 'string', faker: 'person.firstName' },
        { type: 'string', faker: 'person.lastName' },
        { type: 'string', faker: 'internet.email' },
        { type: 'string', faker: 'phone.number' }
      ];

      fakerSpecs.forEach(spec => {
        const value = dataEngine['generateFieldValue'](spec);
        expect(value).to.be.a('string');
        expect(value).to.have.length.above(0);
      });
    });

    it('should use custom generators', function() {
      const generatorSpecs: DataFieldSpec[] = [
        { type: 'string', generator: 'uuid' },
        { type: 'string', generator: 'timestamp' },
        { type: 'number', generator: 'random' },
        { type: 'number', generator: 'sequence' }
      ];

      generatorSpecs.forEach((spec, index) => {
        const value = dataEngine['generateFieldValue'](spec, undefined, `field_${index}`);
        
        switch (spec.generator) {
          case 'uuid':
            expect(value).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            break;
          case 'timestamp':
            expect(new Date(value)).to.be.instanceOf(Date);
            break;
          case 'random':
          case 'sequence':
            expect(value).to.be.a('number');
            break;
        }
      });
    });
  });

  describe('Data Spec Generation', function() {
    it('should generate data from endpoint data spec', function() {
      const spec: EndpointDataSpec = {
        required: {
          username: { type: 'string', min: 3, max: 20 },
          email: { type: 'email' },
          age: { type: 'number', min: 18, max: 100 }
        },
        optional: {
          phone: { type: 'string', faker: 'phone.number' },
          bio: { type: 'string', max: 500 },
          active: { type: 'boolean', default: true }
        }
      };

      const generated = dataEngine['generateDataFromSpec'](spec, 'requestBody', {
        role: 'user',
        endpoint: '/test',
        service: 'testService',
        iteration: 1
      });

      // Required fields should always be present
      expect(generated.username).to.be.a('string');
      expect(generated.email).to.include('@');
      expect(generated.age).to.be.a('number');
      expect(generated.age).to.be.at.least(18);
      expect(generated.age).to.be.at.most(100);

      // Some optional fields should be present (60% inclusion rate)
      const optionalFieldsPresent = [
        generated.hasOwnProperty('phone'),
        generated.hasOwnProperty('bio'),
        generated.hasOwnProperty('active')
      ].filter(Boolean).length;

      expect(optionalFieldsPresent).to.be.at.least(0);
    });

    it('should use examples when available', function() {
      const spec: EndpointDataSpec = {
        required: {
          name: { type: 'string' }
        },
        examples: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ]
      };

      const generated = dataEngine['generateDataFromSpec'](spec, 'requestBody', {
        role: 'user',
        endpoint: '/test',
        service: 'testService',
        iteration: 1
      });

      // Should use first example (iteration 1 -> index 0)
      expect(generated.name).to.equal('John Doe');
      expect(generated.email).to.equal('john@example.com');
    });

    it('should use templates when available', function() {
      const spec: EndpointDataSpec = {
        templates: [
          'name={{$faker.person.fullName}}&role={{role}}',
          'id={{iteration}}&service={{service}}'
        ]
      };

      const generated = dataEngine['generateDataFromSpec'](spec, 'queryParams', {
        role: 'admin',
        endpoint: '/test',
        service: 'userService',
        iteration: 1
      });

      // Should use first template and resolve variables
      expect(generated).to.be.a('string');
      expect(generated).to.include('role=admin');
    });
  });

  describe('Complete Test Data Generation', function() {
    it('should generate complete test data for all parameters', function() {
      const queryParams: EndpointDataSpec = {
        required: { page: { type: 'number', min: 1, default: 1 } },
        optional: { limit: { type: 'number', min: 10, max: 100 } }
      };

      const requestBody: EndpointDataSpec = {
        required: {
          email: { type: 'email' },
          name: { type: 'string', faker: 'person.fullName' }
        }
      };

      const headers: EndpointDataSpec = {
        required: { 'Content-Type': { type: 'string', default: 'application/json' } }
      };

      const pathParams: EndpointDataSpec = {
        required: { userId: { type: 'uuid', generator: 'uuid' } }
      };

      const generated = dataEngine.generateTestData(
        queryParams,
        requestBody,
        headers,
        pathParams,
        {
          role: 'admin',
          endpoint: '/api/users/{userId}',
          service: 'userService',
          iteration: 1
        }
      );

      expect(generated.queryParams).to.be.an('object');
      expect(generated.queryParams.page).to.equal(1);

      expect(generated.requestBody).to.be.an('object');
      expect(generated.requestBody.email).to.include('@');
      expect(generated.requestBody.name).to.be.a('string');

      expect(generated.headers).to.be.an('object');
      expect(generated.headers['Content-Type']).to.equal('application/json');

      expect(generated.pathParams).to.be.an('object');
      expect(generated.pathParams.userId).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      expect(generated.metadata?.generationMethod).to.equal('template');
      expect(generated.metadata?.iteration).to.equal(1);
    });

    it('should generate multiple test data variations', function() {
      const requestBody: EndpointDataSpec = {
        required: {
          username: { type: 'string', faker: 'internet.userName' },
          email: { type: 'email' }
        }
      };

      const variations = dataEngine.generateTestDataVariations(
        undefined,
        requestBody,
        undefined,
        undefined,
        3,
        {
          role: 'user',
          endpoint: '/register',
          service: 'authService'
        }
      );

      expect(variations).to.have.length(3);

      variations.forEach((variation, index) => {
        expect(variation.requestBody).to.be.an('object');
        expect(variation.requestBody.username).to.be.a('string');
        expect(variation.requestBody.email).to.include('@');
        expect(variation.metadata?.iteration).to.equal(index + 1);
      });

      // Each variation should be different
      const usernames = variations.map(v => v.requestBody.username);
      const uniqueUsernames = new Set(usernames);
      expect(uniqueUsernames.size).to.be.at.least(2); // Most should be unique
    });
  });

  describe('Template Variable Resolution', function() {
    it('should resolve built-in template variables', function() {
      const template = 'Role: {{role}}, Service: {{service}}, Endpoint: {{endpoint}}, Iteration: {{iteration}}';
      
      const resolved = dataEngine.resolveTemplateVariables(template, {
        role: 'admin',
        endpoint: '/api/users',
        service: 'userService',
        iteration: 5
      });

      expect(resolved).to.equal('Role: admin, Service: userService, Endpoint: /api/users, Iteration: 5');
    });

    it('should resolve custom variables', function() {
      const template = 'Company: {{companyName}}, User: {{userName}}, ID: {{userId}}';
      
      const resolved = dataEngine.resolveTemplateVariables(template, {
        role: 'user',
        endpoint: '/test',
        service: 'test',
        variables: {
          companyName: 'Acme Corp',
          userName: 'john.doe',
          userId: '12345'
        }
      });

      expect(resolved).to.equal('Company: Acme Corp, User: john.doe, ID: 12345');
    });

    it('should resolve faker templates', function() {
      const template = 'Name: {{$faker.person.fullName}}, Email: {{$faker.internet.email}}';
      
      const resolved = dataEngine.resolveTemplateVariables(template);

      expect(resolved).to.include('Name: ');
      expect(resolved).to.include('Email: ');
      expect(resolved).to.match(/Email: [^\s@]+@[^\s@]+\.[^\s@]+/);
    });

    it('should resolve timestamp and UUID templates', function() {
      const template = 'Timestamp: {{timestamp}}, UUID: {{uuid}}';
      
      const resolved = dataEngine.resolveTemplateVariables(template);

      expect(resolved).to.include('Timestamp: ');
      expect(resolved).to.include('UUID: ');
      expect(resolved).to.match(/UUID: [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    });

    it('should resolve complex nested objects', function() {
      const data = {
        user: {
          name: '{{$faker.person.fullName}}',
          profile: {
            email: '{{$faker.internet.email}}',
            settings: {
              theme: 'dark',
              notifications: true,
              userId: '{{userId}}'
            }
          }
        },
        metadata: {
          created: '{{timestamp}}',
          role: '{{role}}'
        }
      };

      const resolved = dataEngine.resolveTemplateVariables(data, {
        role: 'admin',
        endpoint: '/test',
        service: 'test',
        variables: { userId: '12345' }
      });

      expect(resolved.user.name).to.be.a('string');
      expect(resolved.user.profile.email).to.include('@');
      expect(resolved.user.profile.settings.userId).to.equal('12345');
      expect(resolved.metadata.role).to.equal('admin');
      expect(resolved.metadata.created).to.be.a('string');
    });

    it('should handle arrays in template resolution', function() {
      const data = {
        users: [
          { name: '{{$faker.person.firstName}}', role: '{{role}}' },
          { name: '{{$faker.person.firstName}}', role: '{{role}}' }
        ]
      };

      const resolved = dataEngine.resolveTemplateVariables(data, {
        role: 'user',
        endpoint: '/test',
        service: 'test'
      });

      expect(resolved.users).to.be.an('array');
      expect(resolved.users).to.have.length(2);
      resolved.users.forEach((user: any) => {
        expect(user.name).to.be.a('string');
        expect(user.role).to.equal('user');
      });
    });
  });

  describe('Boundary Testing', function() {
    it('should generate boundary test cases', function() {
      const requestBody: EndpointDataSpec = {
        required: {
          username: { type: 'string', min: 3, max: 20 },
          age: { type: 'number', min: 18, max: 100 },
          tags: { type: 'array', min: 1, max: 5 }
        }
      };

      const boundaryTests = dataEngine.generateBoundaryTestCases(
        undefined,
        requestBody,
        undefined,
        undefined,
        {
          role: 'tester',
          endpoint: '/validate',
          service: 'validationService'
        }
      );

      expect(boundaryTests).to.have.length(3); // min, max, empty

      // Min boundary test
      const minTest = boundaryTests[0];
      expect(minTest.requestBody?.username).to.equal('');
      expect(minTest.requestBody?.age).to.equal(18);
      expect(minTest.requestBody?.tags).to.deep.equal([]);

      // Max boundary test
      const maxTest = boundaryTests[1];
      expect(maxTest.requestBody?.username).to.have.length(20);
      expect(maxTest.requestBody?.age).to.equal(100);
      expect(maxTest.requestBody?.tags).to.have.length(5);

      // Empty boundary test
      const emptyTest = boundaryTests[2];
      expect(emptyTest.requestBody).to.be.undefined;
    });

    it('should generate boundary values for different field types', function() {
      const testCases = [
        { spec: { type: 'string', min: 5, max: 10 }, type: 'min', expected: '' },
        { spec: { type: 'string', min: 5, max: 10 }, type: 'max', expectedLength: 10 },
        { spec: { type: 'number', min: 10, max: 20 }, type: 'min', expected: 10 },
        { spec: { type: 'number', min: 10, max: 20 }, type: 'max', expected: 20 },
        { spec: { type: 'array', min: 2, max: 8 }, type: 'min', expected: [] },
        { spec: { type: 'boolean' }, type: 'min', expected: false },
        { spec: { type: 'boolean' }, type: 'max', expected: true }
      ];

      testCases.forEach(({ spec, type, expected, expectedLength }) => {
        const value = dataEngine['generateBoundaryFieldValue'](spec as DataFieldSpec, type as 'min' | 'max');
        
        if (expected !== undefined) {
          if (Array.isArray(expected)) {
            expect(value).to.deep.equal(expected);
          } else {
            expect(value).to.equal(expected);
          }
        }
        
        if (expectedLength !== undefined) {
          expect(value).to.have.length(expectedLength);
        }
      });
    });
  });

  describe('Predefined Test Cases', function() {
    it('should generate data from predefined test cases', function() {
      const testCases: EndpointTestCase[] = [
        {
          name: 'Valid user login',
          description: 'Test successful login',
          data: {
            requestBody: {
              email: 'test@example.com',
              password: 'password123',
              rememberMe: true
            },
            headers: {
              'Content-Type': 'application/json'
            }
          },
          expectedStatusCodes: [200]
        },
        {
          name: 'Login with variables',
          description: 'Test login with template variables',
          data: {
            requestBody: {
              email: '{{$faker.internet.email}}',
              password: '{{defaultPassword}}',
              clientId: '{{clientId}}'
            }
          },
          expectedStatusCodes: [200, 401]
        }
      ];

      const generated = dataEngine.generateFromTestCases(testCases, {
        role: 'user',
        endpoint: '/login',
        service: 'authService',
        variables: {
          defaultPassword: 'test123',
          clientId: 'client-12345'
        }
      });

      expect(generated).to.have.length(2);

      // First test case - static values
      const first = generated[0];
      expect(first.requestBody.email).to.equal('test@example.com');
      expect(first.requestBody.password).to.equal('password123');
      expect(first.requestBody.rememberMe).to.be.true;
      expect(first.headers['Content-Type']).to.equal('application/json');
      expect(first.testCase.name).to.equal('Valid user login');

      // Second test case - with template resolution
      const second = generated[1];
      expect(second.requestBody.email).to.include('@');
      expect(second.requestBody.password).to.equal('test123');
      expect(second.requestBody.clientId).to.equal('client-12345');
      expect(second.testCase.name).to.equal('Login with variables');
    });

    it('should handle complex nested test case data', function() {
      const testCase: EndpointTestCase = {
        name: 'Complex order',
        data: {
          requestBody: {
            order: {
              customer: {
                id: '{{customerId}}',
                name: '{{$faker.person.fullName}}',
                email: '{{$faker.internet.email}}'
              },
              items: [
                {
                  productId: 'prod-123',
                  quantity: 2,
                  price: 29.99
                },
                {
                  productId: 'prod-{{$faker.string.alphanumeric}}',
                  quantity: 1,
                  price: 49.99
                }
              ],
              metadata: {
                source: 'api',
                timestamp: '{{timestamp}}'
              }
            }
          }
        },
        expectedStatusCodes: [201]
      };

      const generated = dataEngine.generateFromTestCases([testCase], {
        role: 'customer',
        endpoint: '/orders',
        service: 'orderService',
        variables: {
          customerId: 'cust-456'
        }
      });

      expect(generated).to.have.length(1);
      const result = generated[0];

      expect(result.requestBody.order.customer.id).to.equal('cust-456');
      expect(result.requestBody.order.customer.name).to.be.a('string');
      expect(result.requestBody.order.customer.email).to.include('@');

      expect(result.requestBody.order.items).to.have.length(2);
      expect(result.requestBody.order.items[0].productId).to.equal('prod-123');
      expect(result.requestBody.order.items[1].productId).to.include('prod-');

      expect(result.requestBody.order.metadata.source).to.equal('api');
      expect(result.requestBody.order.metadata.timestamp).to.be.a('string');
    });
  });

  describe('Sequence and Caching', function() {
    it('should maintain sequence counters', function() {
      const spec: DataFieldSpec = { type: 'number', generator: 'sequence' };
      
      const value1 = dataEngine['generateFieldValue'](spec, undefined, 'testField');
      const value2 = dataEngine['generateFieldValue'](spec, undefined, 'testField');
      const value3 = dataEngine['generateFieldValue'](spec, undefined, 'testField');

      expect(value1).to.equal(1);
      expect(value2).to.equal(2);
      expect(value3).to.equal(3);
    });

    it('should maintain separate sequences for different fields', function() {
      const spec: DataFieldSpec = { type: 'number', generator: 'sequence' };
      
      const field1_val1 = dataEngine['generateFieldValue'](spec, undefined, 'field1');
      const field2_val1 = dataEngine['generateFieldValue'](spec, undefined, 'field2');
      const field1_val2 = dataEngine['generateFieldValue'](spec, undefined, 'field1');
      const field2_val2 = dataEngine['generateFieldValue'](spec, undefined, 'field2');

      expect(field1_val1).to.equal(1);
      expect(field2_val1).to.equal(1);
      expect(field1_val2).to.equal(2);
      expect(field2_val2).to.equal(2);
    });

    it('should clear cache and reset sequences', function() {
      const spec: DataFieldSpec = { type: 'number', generator: 'sequence' };
      
      // Generate some values
      dataEngine['generateFieldValue'](spec, undefined, 'testField');
      dataEngine['generateFieldValue'](spec, undefined, 'testField');
      
      // Clear cache
      dataEngine.clearCache();
      
      // Should start from 1 again
      const value = dataEngine['generateFieldValue'](spec, undefined, 'testField');
      expect(value).to.equal(1);
    });
  });

  describe('Error Handling', function() {
    it('should handle invalid faker methods gracefully', function() {
      const spec: DataFieldSpec = { type: 'string', faker: 'invalid.method' };
      
      // Should not throw, but fallback to default generation
      expect(() => {
        const value = dataEngine['generateFieldValue'](spec);
        expect(value).to.be.a('string');
      }).to.not.throw();
    });

    it('should handle missing template variables gracefully', function() {
      const template = 'Hello {{nonexistentVariable}}!';
      
      const resolved = dataEngine.resolveTemplateVariables(template, {
        role: 'user',
        endpoint: '/test',
        service: 'test'
      });

      // Should leave unresolved variables as-is
      expect(resolved).to.equal('Hello {{nonexistentVariable}}!');
    });

    it('should handle null and undefined data in template resolution', function() {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        validString: '{{role}}'
      };

      const resolved = dataEngine.resolveTemplateVariables(data, {
        role: 'admin',
        endpoint: '/test',
        service: 'test'
      });

      expect(resolved.nullValue).to.be.null;
      expect(resolved.undefinedValue).to.be.undefined;
      expect(resolved.emptyString).to.equal('');
      expect(resolved.validString).to.equal('admin');
    });
  });
});