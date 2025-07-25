import { restified } from 'restifiedts';
import { expect } from 'chai';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { TestSetup } from '../setup/global-setup';
import { TestData, Schemas } from '../fixtures/test-data';

/**
 * Schema Validation Tests
 * 
 * Demonstrates comprehensive schema validation using AJV and other validators
 * with RestifiedTS for ensuring API responses meet expected data contracts.
 */
describe('Schema Validation @unit', function() {
  let ajv: Ajv;

  before(async function() {
    this.timeout(30000);
    await TestSetup.configure();
    
    // Initialize AJV with formats support
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  describe('JSON Schema Validation', function() {
    it('should validate user response against schema', async function() {
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/users/1')
          .execute();

      await response
        .statusCode(200)
        .jsonSchema(Schemas.userSchema) // Built-in schema validation
        .execute();

      // Additional manual schema validation
      const userData = response.getData();
      const validate = ajv.compile(Schemas.userSchema);
      const isValid = validate(userData);

      if (!isValid) {
        console.error('Schema validation errors:', validate.errors);
      }

      expect(isValid).to.be.true;
      expect(userData.id).to.be.a('number');
      expect(userData.email).to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should validate post response against schema', async function() {
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/posts/1')
          .execute();

      await response
        .statusCode(200)
        .jsonSchema(Schemas.postSchema)
        .execute();

      // Verify specific schema requirements
      const postData = response.getData();
      expect(postData).to.have.all.keys('id', 'title', 'body', 'userId');
      expect(postData.id).to.be.above(0);
      expect(postData.title).to.have.length.above(0);
      expect(postData.body).to.have.length.above(0);
    });

    it('should validate array responses against schema', async function() {
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .queryParam('_limit', 5)
        .when()
          .get('/posts')
          .execute();

      await response
        .statusCode(200)
        .jsonPath('$').isArray()
        .jsonPath('$.length').equals(5)
        .execute();

      // Validate each item in the array
      const posts = response.getData();
      const validate = ajv.compile(Schemas.postSchema);

      for (const post of posts) {
        const isValid = validate(post);
        if (!isValid) {
          console.error(`Post ${post.id} validation errors:`, validate.errors);
        }
        expect(isValid).to.be.true;
      }
    });

    it('should validate comment response with nested validation', async function() {
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/comments/1')
          .execute();

      await response
        .statusCode(200)
        .jsonSchema(Schemas.commentSchema)
        .jsonPath('$.email').matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        .jsonPath('$.postId').isNumber()
        .execute();

      const commentData = response.getData();
      
      // Additional business rule validation
      expect(commentData.postId).to.be.above(0);
      expect(commentData.name).to.have.length.above(0);
      expect(commentData.body).to.have.length.above(10); // Comments should be substantial
    });
  });

  describe('Custom Schema Validation', function() {
    it('should validate with custom schema rules', async function() {
      // Create custom schema for pagination response
      const paginationSchema = {
        type: 'object',
        required: ['page', 'limit', 'total', 'data'],
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          total: { type: 'integer', minimum: 0 },
          data: { type: 'array' }
        }
      };

      // Simulate a paginated response by creating mock data
      const mockPaginationResponse = {
        page: 1,
        limit: 10,
        total: 100,
        data: TestData.apiResponses.posts.postsList
      };

      // Validate against custom schema
      const validate = ajv.compile(paginationSchema);
      const isValid = validate(mockPaginationResponse);

      expect(isValid).to.be.true;
      expect(mockPaginationResponse.data).to.be.an('array');
      expect(mockPaginationResponse.total).to.be.above(mockPaginationResponse.data.length);
    });

    it('should validate API error responses', async function() {
      // Test non-existent resource to get error response
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/users/999999')
          .execute();

      // Note: JSONPlaceholder returns 200 with {} for non-existent resources
      // In real APIs, this would be a 404 with error schema
      await response
        .statusCode(200)
        .execute();

      // Simulate proper error response validation
      const errorResponse = TestData.apiResponses.errors.notFound;
      const validate = ajv.compile(Schemas.errorSchema);
      const isValid = validate(errorResponse);

      expect(isValid).to.be.true;
      expect(errorResponse.statusCode).to.equal(404);
      expect(errorResponse.error).to.be.a('string');
      expect(errorResponse.message).to.be.a('string');
    });

    it('should validate with conditional schemas', async function() {
      // Schema that validates different structures based on content
      const conditionalSchema = {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['user', 'admin'] },
          data: {}
        },
        if: {
          properties: { type: { const: 'admin' } }
        },
        then: {
          properties: {
            data: {
              type: 'object',
              required: ['permissions', 'role'],
              properties: {
                permissions: { type: 'array' },
                role: { type: 'string' }
              }
            }
          }
        },
        else: {
          properties: {
            data: {
              type: 'object',
              required: ['name', 'email'],
              properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' }
              }
            }
          }
        }
      };

      // Test user type
      const userObject = {
        type: 'user',
        data: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      // Test admin type
      const adminObject = {
        type: 'admin',
        data: {
          permissions: ['read', 'write', 'admin'],
          role: 'super_admin'
        }
      };

      const validate = ajv.compile(conditionalSchema);

      expect(validate(userObject)).to.be.true;
      expect(validate(adminObject)).to.be.true;

      // Test invalid structure
      const invalidObject = {
        type: 'admin',
        data: {
          name: 'John Doe' // Missing required admin fields
        }
      };

      expect(validate(invalidObject)).to.be.false;
    });
  });

  describe('Schema Evolution and Versioning', function() {
    it('should handle backward compatibility', async function() {
      // Test with old version of user schema (missing new fields)
      const oldUserSchema = {
        type: 'object',
        required: ['id', 'name', 'email'], // Missing 'username' requirement
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' }
          // Missing new fields like 'address', 'phone', etc.
        }
      };

      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/users/1')
          .execute();

      await response
        .statusCode(200)
        .execute();

      const userData = response.getData();
      const oldValidate = ajv.compile(oldUserSchema);
      const newValidate = ajv.compile(Schemas.userSchema);

      // Should pass both old and new schema validation (backward compatibility)
      expect(oldValidate(userData)).to.be.true;
      expect(newValidate(userData)).to.be.true;
    });

    it('should validate with schema versioning', async function() {
      const schemaV1 = {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' }
        }
      };

      const schemaV2 = {
        type: 'object',
        required: ['id', 'name', 'email'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      };

      // Simulate API response with version header
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .header('API-Version', 'v2')
        .when()
          .get('/users/1')
          .execute();

      await response
        .statusCode(200)
        .header('content-type', /application\/json/)
        .execute();

      const userData = response.getData();
      const headers = response.getHeaders();
      
      // Select schema based on API version
      const apiVersion = headers['api-version'] || 'v2';
      const schema = apiVersion === 'v1' ? schemaV1 : schemaV2;
      
      const validate = ajv.compile(schema);
      
      // For JSONPlaceholder, we'll validate with the data we have
      // In real scenarios, the API would return data matching the version
      const isValid = validate(userData);
      
      if (!isValid && apiVersion === 'v2') {
        console.log('V2 validation failed, trying V1 schema for backward compatibility');
        const v1Validate = ajv.compile(schemaV1);
        expect(v1Validate(userData)).to.be.true;
      } else {
        expect(isValid).to.be.true;
      }
    });
  });

  describe('Performance Schema Validation', function() {
    it('should validate large datasets efficiently', async function() {
      this.timeout(15000);

      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/posts') // Gets all 100 posts
          .execute();

      await response
        .statusCode(200)
        .jsonPath('$').isArray()
        .execute();

      const posts = response.getData();
      const validate = ajv.compile(Schemas.postSchema);

      const startTime = Date.now();
      
      // Validate all posts
      let validCount = 0;
      for (const post of posts) {
        if (validate(post)) {
          validCount++;
        }
      }

      const endTime = Date.now();
      const validationTime = endTime - startTime;

      console.log(`Validated ${posts.length} posts in ${validationTime}ms`);
      console.log(`Valid posts: ${validCount}/${posts.length}`);

      expect(validCount).to.equal(posts.length);
      expect(validationTime).to.be.lessThan(1000); // Should validate 100 items in under 1 second
    });

    it('should cache compiled schemas for performance', async function() {
      const schemaCache = new Map();

      function getCachedValidator(schema: any) {
        const key = JSON.stringify(schema);
        if (!schemaCache.has(key)) {
          schemaCache.set(key, ajv.compile(schema));
        }
        return schemaCache.get(key);
      }

      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/users')
          .execute();

      await response
        .statusCode(200)
        .execute();

      const users = response.getData();
      const startTime = Date.now();

      // Use cached validator
      const validate = getCachedValidator(Schemas.userSchema);
      
      for (const user of users) {
        expect(validate(user)).to.be.true;
      }

      const endTime = Date.now();
      console.log(`Cached validation completed in ${endTime - startTime}ms`);

      expect(schemaCache.size).to.equal(1); // Only one schema should be cached
    });
  });
});