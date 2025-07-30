/**
 * Enterprise Data Generation Integration Tests
 * 
 * This test suite validates the advanced data generation capabilities
 * including Faker.js integration, boundary testing, and template variables.
 */

import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { RestifiedTS } from '../../src/index';
import { 
  DataTemplateEngine,
  EndpointDefinition,
  EndpointDataSpec,
  DataFieldSpec,
  EndpointTestCase
} from '../../src/core/enterprise';

describe('Enterprise Data Generation', function() {
  this.timeout(30000);

  let restified: RestifiedTS;
  let dataEngine: DataTemplateEngine;

  before(function() {
    restified = new RestifiedTS();
    dataEngine = new DataTemplateEngine();
  });

  after(async function() {
    await restified.cleanup();
  });

  describe('Advanced Data Field Generation', function() {
    it('should generate data for all supported field types', function() {
      const fieldSpecs: Record<string, DataFieldSpec> = {
        stringField: { type: 'string' },
        numberField: { type: 'number', min: 1, max: 100 },
        booleanField: { type: 'boolean' },
        emailField: { type: 'email' },
        dateField: { type: 'date' },
        uuidField: { type: 'uuid' },
        arrayField: { type: 'array' },
        objectField: { type: 'object' }
      };

      Object.entries(fieldSpecs).forEach(([fieldName, spec]) => {
        const value = dataEngine['generateFieldValue'](spec, {
          role: 'admin',
          endpoint: '/test',
          service: 'testService',
          iteration: 1
        }, fieldName);

        switch (spec.type) {
          case 'string':
            expect(value).to.be.a('string');
            break;
          case 'number':
            expect(value).to.be.a('number');
            expect(value).to.be.at.least(1);
            expect(value).to.be.at.most(100);
            break;
          case 'boolean':
            expect(value).to.be.a('boolean');
            break;
          case 'email':
            expect(value).to.be.a('string');
            expect(value).to.include('@');
            break;
          case 'date':
            expect(value).to.be.a('string');
            expect(new Date(value)).to.be.instanceOf(Date);
            break;
          case 'uuid':
            expect(value).to.be.a('string');
            expect(value).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            break;
          case 'array':
            expect(value).to.be.an('array');
            break;
          case 'object':
            expect(value).to.be.an('object');
            break;
        }
      });
    });

    it('should respect field constraints and enums', function() {
      const constrainedSpecs: DataFieldSpec[] = [
        {
          type: 'string',
          enum: ['option1', 'option2', 'option3']
        },
        {
          type: 'number',
          min: 50,
          max: 60
        },
        {
          type: 'string',
          default: 'default_value'
        }
      ];

      constrainedSpecs.forEach(spec => {
        const value = dataEngine['generateFieldValue'](spec);

        if (spec.enum) {
          expect(spec.enum).to.include(value);
        }

        if (spec.default !== undefined) {
          expect(value).to.equal(spec.default);
        }

        if (spec.type === 'number' && spec.min && spec.max) {
          expect(value).to.be.at.least(spec.min);
          expect(value).to.be.at.most(spec.max);
        }
      });
    });

    it('should generate data using Faker.js methods', function() {
      const fakerSpecs: DataFieldSpec[] = [
        { type: 'string', faker: 'person.firstName' },
        { type: 'string', faker: 'person.lastName' },
        { type: 'string', faker: 'internet.email' },
        { type: 'string', faker: 'phone.number' },
        { type: 'string', faker: 'location.city' },
        { type: 'string', faker: 'company.name' }
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

  describe('Complex Endpoint Data Generation', function() {
    it('should generate comprehensive test data for e-commerce endpoint', function() {
      const ecommerceEndpoint: EndpointDefinition = {
        service: 'ecommerceService',
        path: '/api/v1/orders',
        method: 'POST',
        description: 'Create order with complex data requirements',
        queryParams: {
          optional: {
            calculateTax: { type: 'boolean', default: true },
            applyDiscounts: { type: 'boolean', default: false },
            currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'], default: 'USD' }
          }
        },
        headers: {
          required: {
            'Content-Type': { type: 'string', default: 'application/json' },
            'X-Client-ID': { type: 'uuid', generator: 'uuid' }
          },
          optional: {
            'X-Correlation-ID': { type: 'uuid', generator: 'uuid' },
            'X-User-Agent': { type: 'string', default: 'RestifiedTS/2.1.0' }
          }
        },
        requestBody: {
          required: {
            customerId: { type: 'uuid', generator: 'uuid' },
            items: {
              type: 'array',
              min: 1,
              max: 10,
              description: 'Order items'
            },
            shippingAddress: {
              type: 'object',
              description: 'Shipping address details'
            }
          },
          optional: {
            billingAddress: { type: 'object' },
            paymentMethod: { type: 'string', enum: ['credit_card', 'paypal', 'bank_transfer'] },
            discountCode: { type: 'string', faker: 'string.alphanumeric' },
            notes: { type: 'string', faker: 'lorem.sentence', max: 500 },
            metadata: { type: 'object' }
          },
          examples: [{
            customerId: '550e8400-e29b-41d4-a716-446655440000',
            items: [
              { productId: 'prod_123', quantity: 2, price: 29.99 },
              { productId: 'prod_456', quantity: 1, price: 49.99 }
            ],
            shippingAddress: {
              street: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'US'
            },
            paymentMethod: 'credit_card',
            notes: 'Please deliver during business hours'
          }]
        },
        pathParams: undefined,
        requiredPermissions: ['orders.create'],
        tags: ['orders', 'ecommerce', 'complex-data']
      };

      const generatedData = dataEngine.generateTestData(
        ecommerceEndpoint.queryParams,
        ecommerceEndpoint.requestBody,
        ecommerceEndpoint.headers,
        undefined,
        {
          role: 'customer',
          endpoint: ecommerceEndpoint.path,
          service: ecommerceEndpoint.service,
          iteration: 1,
          variables: {
            customerTier: 'premium',
            region: 'US-West'
          }
        }
      );

      // Validate query parameters
      expect(generatedData.queryParams).to.be.an('object');
      expect(generatedData.queryParams.calculateTax).to.be.a('boolean');
      expect(['USD', 'EUR', 'GBP']).to.include(generatedData.queryParams.currency);

      // Validate headers
      expect(generatedData.headers).to.be.an('object');
      expect(generatedData.headers['Content-Type']).to.equal('application/json');
      expect(generatedData.headers['X-Client-ID']).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate request body
      expect(generatedData.requestBody).to.be.an('object');
      expect(generatedData.requestBody.customerId).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(generatedData.requestBody.items).to.be.an('array');
      expect(generatedData.requestBody.shippingAddress).to.be.an('object');

      if (generatedData.requestBody.paymentMethod) {
        expect(['credit_card', 'paypal', 'bank_transfer']).to.include(generatedData.requestBody.paymentMethod);
      }

      expect(generatedData.metadata?.generationMethod).to.equal('template');
    });

    it('should generate multiple data variations for comprehensive testing', function() {
      const userRegistrationEndpoint: EndpointDefinition = {
        service: 'authService',
        path: '/api/v1/register',
        method: 'POST',
        requestBody: {
          required: {
            email: { type: 'email', faker: 'internet.email' },
            password: { type: 'string', min: 8, max: 128 },
            firstName: { type: 'string', faker: 'person.firstName' },
            lastName: { type: 'string', faker: 'person.lastName' }
          },
          optional: {
            phoneNumber: { type: 'string', faker: 'phone.number' },
            dateOfBirth: { type: 'date' },
            preferences: { type: 'object' },
            marketingOptIn: { type: 'boolean', default: false }
          }
        },
        tags: ['auth', 'registration']
      };

      const variations = dataEngine.generateTestDataVariations(
        undefined,
        userRegistrationEndpoint.requestBody,
        undefined,
        undefined,
        5,
        {
          role: 'anonymous',
          endpoint: userRegistrationEndpoint.path,
          service: userRegistrationEndpoint.service
        }
      );

      expect(variations).to.have.length(5);

      variations.forEach((variation, index) => {
        expect(variation.requestBody).to.be.an('object');
        expect(variation.requestBody.email).to.include('@');
        expect(variation.requestBody.password).to.have.length.at.least(8);
        expect(variation.requestBody.firstName).to.be.a('string');
        expect(variation.requestBody.lastName).to.be.a('string');
        expect(variation.metadata?.iteration).to.equal(index + 1);
      });
    });

    it('should handle template variable resolution', function() {
      const templateData = {
        userId: '{{userId}}',
        email: '{{$faker.internet.email}}',
        fullName: '{{firstName}} {{lastName}}',
        welcomeMessage: 'Welcome {{firstName}} to {{companyName}}!',
        timestamp: '{{timestamp}}',
        uuid: '{{uuid}}',
        iteration: 'Test run {{iteration}}'
      };

      const context = {
        role: 'user',
        endpoint: '/test',
        service: 'testService',
        iteration: 3,
        variables: {
          userId: 'user_12345',
          firstName: 'John',
          lastName: 'Doe',
          companyName: 'Acme Corp'
        }
      };

      const resolved = dataEngine.resolveTemplateVariables(templateData, context);

      expect(resolved.userId).to.equal('user_12345');
      expect(resolved.email).to.include('@');
      expect(resolved.fullName).to.equal('John Doe');
      expect(resolved.welcomeMessage).to.equal('Welcome John to Acme Corp!');
      expect(resolved.timestamp).to.be.a('string');
      expect(resolved.uuid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(resolved.iteration).to.equal('Test run 3');
    });
  });

  describe('Boundary Testing', function() {
    it('should generate boundary test cases for validation testing', function() {
      const validationEndpoint: EndpointDefinition = {
        service: 'validationService',
        path: '/api/v1/validate',
        method: 'POST',
        requestBody: {
          required: {
            username: { type: 'string', min: 3, max: 20 },
            age: { type: 'number', min: 0, max: 150 },
            tags: { type: 'array', min: 1, max: 5 }
          },
          optional: {
            bio: { type: 'string', max: 1000 },
            score: { type: 'number', min: 0, max: 100 }
          }
        },
        tags: ['validation', 'boundary']
      };

      const boundaryTests = dataEngine.generateBoundaryTestCases(
        undefined,
        validationEndpoint.requestBody,
        undefined,
        undefined,
        {
          role: 'tester',
          endpoint: validationEndpoint.path,
          service: validationEndpoint.service
        }
      );

      expect(boundaryTests).to.have.length(3); // min, max, empty

      // Test minimum boundary
      const minTest = boundaryTests[0];
      expect(minTest.requestBody?.username).to.equal('');
      expect(minTest.requestBody?.age).to.equal(0);
      expect(minTest.requestBody?.tags).to.deep.equal([]);

      // Test maximum boundary
      const maxTest = boundaryTests[1];
      expect(minTest.requestBody?.username).to.be.a('string');
      expect(minTest.requestBody?.age).to.be.a('number');

      // Test empty boundary
      const emptyTest = boundaryTests[2];
      expect(emptyTest.requestBody).to.be.undefined;
    });

    it('should generate boundary cases for different field types', function() {
      const fieldSpecs: DataFieldSpec[] = [
        { type: 'string', min: 5, max: 50 },
        { type: 'number', min: 10, max: 100 },
        { type: 'array', min: 2, max: 8 }
      ];

      fieldSpecs.forEach(spec => {
        // Test minimum boundary
        const minValue = dataEngine['generateBoundaryFieldValue'](spec, 'min');
        
        switch (spec.type) {
          case 'string':
            expect(minValue).to.equal('');
            break;
          case 'number':
            expect(minValue).to.equal(spec.min);
            break;
          case 'array':
            expect(minValue).to.deep.equal([]);
            break;
        }

        // Test maximum boundary
        const maxValue = dataEngine['generateBoundaryFieldValue'](spec, 'max');
        
        switch (spec.type) {
          case 'string':
            expect(maxValue).to.be.a('string');
            expect(maxValue).to.have.length(spec.max);
            break;
          case 'number':
            expect(maxValue).to.equal(spec.max);
            break;
          case 'array':
            expect(maxValue).to.be.an('array');
            expect(maxValue).to.have.length(spec.max);
            break;
        }
      });
    });
  });

  describe('Predefined Test Cases', function() {
    it('should process predefined test cases with template resolution', function() {
      const testCases: EndpointTestCase[] = [
        {
          name: 'Valid login',
          description: 'Test successful user login',
          data: {
            requestBody: {
              email: '{{$faker.internet.email}}',
              password: 'TestPassword123!',
              rememberMe: true
            },
            headers: {
              'User-Agent': 'RestifiedTS Test Suite {{version}}'
            }
          },
          expectedStatusCodes: [200],
          roleOverrides: {
            'user': [200],
            'admin': [200]
          }
        },
        {
          name: 'Invalid credentials',
          description: 'Test login with wrong password',
          data: {
            requestBody: {
              email: 'test@example.com',
              password: 'wrongpassword'
            }
          },
          expectedStatusCodes: [401]
        }
      ];

      const generatedTestCases = dataEngine.generateFromTestCases(
        testCases,
        {
          role: 'user',
          endpoint: '/api/v1/login',
          service: 'authService',
          variables: {
            version: '2.1.0'
          }
        }
      );

      expect(generatedTestCases).to.have.length(2);

      // Validate first test case
      const firstCase = generatedTestCases[0];
      expect(firstCase.testCase.name).to.equal('Valid login');
      expect(firstCase.requestBody.email).to.include('@');
      expect(firstCase.requestBody.password).to.equal('TestPassword123!');
      expect(firstCase.requestBody.rememberMe).to.be.true;
      expect(firstCase.headers['User-Agent']).to.equal('RestifiedTS Test Suite 2.1.0');
      expect(firstCase.metadata?.generationMethod).to.equal('example');

      // Validate second test case
      const secondCase = generatedTestCases[1];
      expect(secondCase.testCase.name).to.equal('Invalid credentials');
      expect(secondCase.requestBody.email).to.equal('test@example.com');
      expect(secondCase.requestBody.password).to.equal('wrongpassword');
    });

    it('should handle complex nested data in test cases', function() {
      const complexTestCase: EndpointTestCase = {
        name: 'Complex order creation',
        description: 'Create order with nested data structures',
        data: {
          requestBody: {
            customer: {
              id: '{{customerId}}',
              profile: {
                name: '{{$faker.person.fullName}}',
                email: '{{$faker.internet.email}}',
                preferences: {
                  currency: 'USD',
                  language: 'en-US',
                  notifications: {
                    email: true,
                    sms: false,
                    push: true
                  }
                }
              }
            },
            order: {
              items: [
                {
                  productId: 'prod_{{$faker.string.alphanumeric}}',
                  name: '{{$faker.commerce.productName}}',
                  price: 29.99,
                  quantity: 2
                }
              ],
              shipping: {
                method: 'standard',
                address: {
                  street: '{{$faker.location.streetAddress}}',
                  city: '{{$faker.location.city}}',
                  country: 'US'
                }
              },
              metadata: {
                source: 'api',
                timestamp: '{{timestamp}}',
                testRun: '{{iteration}}'
              }
            }
          }
        },
        expectedStatusCodes: [201]
      };

      const generated = dataEngine.generateFromTestCases(
        [complexTestCase],
        {
          role: 'customer',
          endpoint: '/api/v1/orders',
          service: 'orderService',
          iteration: 5,
          variables: {
            customerId: 'cust_12345'
          }
        }
      );

      expect(generated).to.have.length(1);
      const result = generated[0];

      // Validate nested structure resolution
      expect(result.requestBody.customer.id).to.equal('cust_12345');
      expect(result.requestBody.customer.profile.name).to.be.a('string');
      expect(result.requestBody.customer.profile.email).to.include('@');
      expect(result.requestBody.customer.profile.preferences.currency).to.equal('USD');
      expect(result.requestBody.customer.profile.preferences.notifications.email).to.be.true;

      expect(result.requestBody.order.items).to.be.an('array');
      expect(result.requestBody.order.items[0].productId).to.include('prod_');
      expect(result.requestBody.order.items[0].name).to.be.a('string');
      expect(result.requestBody.order.items[0].price).to.equal(29.99);

      expect(result.requestBody.order.shipping.address.street).to.be.a('string');
      expect(result.requestBody.order.shipping.address.city).to.be.a('string');
      expect(result.requestBody.order.shipping.address.country).to.equal('US');

      expect(result.requestBody.order.metadata.source).to.equal('api');
      expect(result.requestBody.order.metadata.timestamp).to.be.a('string');
      expect(result.requestBody.order.metadata.testRun).to.equal('5');
    });
  });

  describe('Data Caching and Performance', function() {
    it('should clear cache and reset sequence counters', function() {
      // Generate some data to populate cache
      dataEngine.generateTestData(
        { required: { page: { type: 'number', generator: 'sequence' } } },
        undefined,
        undefined,
        undefined,
        { role: 'test', endpoint: '/test', service: 'test' }
      );

      // Clear cache
      dataEngine.clearCache();

      // Generate again - should reset sequences
      const data1 = dataEngine.generateTestData(
        { required: { page: { type: 'number', generator: 'sequence' } } },
        undefined,
        undefined,
        undefined,
        { role: 'test', endpoint: '/test', service: 'test' }
      );

      const data2 = dataEngine.generateTestData(
        { required: { page: { type: 'number', generator: 'sequence' } } },
        undefined,
        undefined,
        undefined,
        { role: 'test', endpoint: '/test', service: 'test' }
      );

      // Sequences should increment from the beginning
      expect(data1.queryParams.page).to.equal(1);
      expect(data2.queryParams.page).to.equal(2);
    });

    it('should maintain sequence counters across calls', function() {
      const spec = { required: { id: { type: 'number', generator: 'sequence' } } };
      const context = { role: 'test', endpoint: '/test', service: 'test' };

      const data1 = dataEngine.generateTestData(spec, undefined, undefined, undefined, context);
      const data2 = dataEngine.generateTestData(spec, undefined, undefined, undefined, context);
      const data3 = dataEngine.generateTestData(spec, undefined, undefined, undefined, context);

      expect(data1.queryParams.id).to.equal(1);
      expect(data2.queryParams.id).to.equal(2);
      expect(data3.queryParams.id).to.equal(3);
    });
  });
});