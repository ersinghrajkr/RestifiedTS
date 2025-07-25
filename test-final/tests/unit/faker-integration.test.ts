import { restified } from 'restifiedts';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { TestSetup } from '../setup/global-setup';
import { TestData } from '../fixtures/test-data';

/**
 * Faker.js Integration Tests
 * 
 * Demonstrates how to use Faker.js with RestifiedTS for generating
 * realistic test data and dynamic test scenarios.
 */
describe('Faker.js Integration @unit', function() {
  before(async function() {
    this.timeout(30000);
    await TestSetup.configure();
    
    // Set faker locale from environment or default to English
    faker.setLocale(process.env.FAKER_LOCALE || 'en');
    
    // Set seed for reproducible tests if provided
    if (process.env.MOCK_DATA_SEED) {
      faker.seed(parseInt(process.env.MOCK_DATA_SEED));
    }
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  describe('Dynamic Data Generation', function() {
    it('should create user with faker-generated data', async function() {
      // Generate random user data using Faker
      const userData = TestData.generateUser(faker);
      
      console.log('Generated user data:', JSON.stringify(userData, null, 2));

      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .contentType('application/json')
          .jsonBody(userData)
        .when()
          .post('/users')
          .execute();

      await response
        .statusCode(201)
        .jsonPath('$.name', userData.name)
        .jsonPath('$.username', userData.username)
        .jsonPath('$.email', userData.email)
        .jsonPath('$.phone', userData.phone)
        .jsonPath('$.website', userData.website)
        .execute();

      // Validate generated data meets expectations
      expect(userData.name).to.be.a('string').and.to.have.length.greaterThan(0);
      expect(userData.email).to.include('@');
      expect(userData.address.city).to.be.a('string');
    });

    it('should create multiple posts with faker data', async function() {
      // Generate multiple posts using faker
      const posts = TestData.generateMultiple(
        () => TestData.generatePost(faker, 1), 
        3
      );

      for (const postData of posts) {
        console.log('Creating post:', postData.title);

        const response = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .contentType('application/json')
            .jsonBody(postData)
          .when()
            .post('/posts')
            .execute();

        await response
          .statusCode(201)
          .jsonPath('$.title', postData.title)
          .jsonPath('$.body', postData.body)
          .jsonPath('$.userId', postData.userId)
          .execute();

        // Store created post ID for potential cleanup or further use
        const createdPost = response.getResponse();
        console.log(`Created post with ID: ${createdPost.data.id}`);
      }
    });

    it('should handle faker data in URL parameters', async function() {
      // Generate random search parameters
      const searchTerm = faker.lorem.word();
      const userId = faker.number.int({ min: 1, max: 10 });
      
      console.log(`Searching for: "${searchTerm}" by user ${userId}`);

      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .queryParam('q', searchTerm)
          .queryParam('userId', userId)
          .queryParam('_limit', 5)
        .when()
          .get('/posts')
          .execute();

      await response
        .statusCode(200)
        .jsonPath('$').isArray()
        .execute();

      // Verify query parameters were sent correctly
      const requestUrl = response.getResponse().config.url;
      expect(requestUrl).to.include(`q=${encodeURIComponent(searchTerm)}`);
      expect(requestUrl).to.include(`userId=${userId}`);
    });
  });

  describe('Variable Template Integration', function() {
    it('should use faker data in RestifiedTS variables', async function() {
      // Set faker-generated data as global variables
      restified.setGlobalVariable('randomName', faker.person.fullName());
      restified.setGlobalVariable('randomEmail', faker.internet.email());
      restified.setGlobalVariable('randomCompany', faker.company.name());
      restified.setGlobalVariable('randomId', faker.number.int({ min: 1000, max: 9999 }));

      const userData = {
        name: '{{randomName}}',
        email: '{{randomEmail}}',
        company: {
          name: '{{randomCompany}}'
        },
        externalId: '{{randomId}}'
      };

      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .contentType('application/json')
          .jsonBody(userData)
        .when()
          .post('/users')
          .execute();

      await response
        .statusCode(201)
        .jsonPath('$.name').exists()
        .jsonPath('$.email').exists()
        .jsonPath('$.company.name').exists()
        .execute();

      // Verify variables were resolved
      const resolvedBody = response.getResponse().config.data;
      const parsedBody = JSON.parse(resolvedBody);
      
      expect(parsedBody.name).to.not.include('{{');
      expect(parsedBody.email).to.include('@');
      expect(parsedBody.company.name).to.be.a('string');
    });

    it('should generate dynamic test scenarios', async function() {
      // Create multiple test scenarios with different faker data
      const scenarios = [
        {
          name: 'Standard User',
          data: TestData.generateUser(faker)
        },
        {
          name: 'Business User',
          data: {
            ...TestData.generateUser(faker),
            company: {
              name: faker.company.name(),
              type: 'Enterprise',
              employees: faker.number.int({ min: 100, max: 5000 })
            }
          }
        },
        {
          name: 'International User',
          data: {
            ...TestData.generateUser(faker),
            address: {
              ...TestData.generateUser(faker).address,
              country: faker.location.country(),
              currency: faker.finance.currencyCode()
            }
          }
        }
      ];

      for (const scenario of scenarios) {
        console.log(`Testing scenario: ${scenario.name}`);

        const response = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .contentType('application/json')
            .jsonBody(scenario.data)
            .header('X-Test-Scenario', scenario.name)
          .when()
            .post('/users')
            .execute();

        await response
          .statusCode(201)
          .jsonPath('$.name', scenario.data.name)
          .jsonPath('$.email', scenario.data.email)
          .execute();

        console.log(`✅ Scenario "${scenario.name}" completed successfully`);
      }
    });
  });

  describe('Data Validation with Faker', function() {
    it('should validate generated data meets business rules', async function() {
      const userData = TestData.generateUser(faker);

      // Ensure generated data meets our validation rules
      expect(userData.name).to.have.length.greaterThan(2);
      expect(userData.username).to.have.length.greaterThan(1);
      expect(userData.email).to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(userData.phone).to.be.a('string');

      // Test the API with validated data
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .contentType('application/json')
          .jsonBody(userData)
        .when()
          .post('/users')
          .execute();

      await response
        .statusCode(201)
        .jsonPath('$.name').isString()
        .jsonPath('$.email').matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        .execute();
    });

    it('should handle edge cases with faker data', async function() {
      // Generate edge case data
      const edgeCases = [
        {
          name: 'Very Long Name',
          data: {
            name: faker.lorem.words(10).substring(0, 100), // Truncate to reasonable length
            email: faker.internet.email(),
            username: faker.internet.userName()
          }
        },
        {
          name: 'Special Characters',
          data: {
            name: `${faker.person.firstName()} O'${faker.person.lastName()}`,
            email: faker.internet.email(),
            username: faker.internet.userName().replace(/[^a-zA-Z0-9]/g, '')
          }
        },
        {
          name: 'International Characters',
          data: {
            name: faker.person.fullName(),
            email: faker.internet.email(),
            username: faker.internet.userName(),
            address: {
              city: faker.location.city(),
              country: faker.location.country()
            }
          }
        }
      ];

      for (const testCase of edgeCases) {
        console.log(`Testing edge case: ${testCase.name}`);

        const response = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .contentType('application/json')
            .jsonBody(testCase.data)
          .when()
            .post('/users')
            .execute();

        await response
          .statusCode(201)
          .jsonPath('$.name').exists()
          .jsonPath('$.email').exists()
          .execute();
      }
    });
  });

  describe('Performance Testing with Faker', function() {
    it('should create load test data using faker', async function() {
      this.timeout(30000);

      // Generate batch of test data for load testing
      const batchSize = parseInt(process.env.LOAD_TEST_BATCH_SIZE || '5');
      const testData = TestData.generateMultiple(
        () => TestData.generatePost(faker),
        batchSize
      );

      console.log(`Creating ${batchSize} posts for load testing...`);

      const startTime = Date.now();
      const promises = testData.map(postData => 
        restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .contentType('application/json')
            .jsonBody(postData)
          .when()
            .post('/posts')
            .execute()
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Validate all requests succeeded
      for (const response of responses) {
        await response
          .statusCode(201)
          .jsonPath('$.id').exists()
          .execute();
      }

      const totalTime = endTime - startTime;
      const avgTime = totalTime / batchSize;

      console.log(`Batch completed in ${totalTime}ms (avg: ${avgTime.toFixed(2)}ms per request)`);
      
      // Performance assertions
      expect(avgTime).to.be.lessThan(5000); // Each request should take less than 5 seconds
      expect(responses).to.have.length(batchSize);
    });
  });
});