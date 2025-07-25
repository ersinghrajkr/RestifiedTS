import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from '../setup/global-setup';
import { TestData, UserData, ApiResponses, Schemas } from '../fixtures/test-data';

/**
 * Fixtures and Test Data Examples
 * 
 * Demonstrates how to use JSON fixtures, test data generators,
 * and data-driven testing with RestifiedTS.
 */
describe('Fixtures and Test Data Examples @integration', function() {
  before(async function() {
    this.timeout(30000);
    await TestSetup.configure();
  });

  after(async function() {
    this.timeout(10000);
    await TestSetup.cleanup();
  });

  afterEach(async function() {
    // Small delay to prevent hanging
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('JSON Fixtures Usage', function() {
    it('should use predefined user data from fixtures', async function() {
      const userData = TestData.clone(UserData.validUser);
      
      console.log('Using fixture data:', userData.name);

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
        .jsonPath('$.address.city', userData.address.city)
        .jsonPath('$.company.name', userData.company.name)
        .execute();

      // Verify fixture data integrity
      expect(userData).to.have.property('address');
      expect(userData.address).to.have.property('geo');
      expect(userData.company).to.have.property('catchPhrase');
    });

    it('should test with invalid data from fixtures', async function() {
      const invalidData = TestData.clone(UserData.invalidUser);
      
      console.log('Testing with invalid data:', invalidData);

      // In a real API, this would return validation errors
      // JSONPlaceholder accepts any data, so we simulate the validation
      
      // Validate data against our business rules
      expect(invalidData.name).to.equal(''); // Invalid: empty name
      expect(invalidData.username).to.have.length(1); // Invalid: too short
      expect(invalidData.email).to.not.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Invalid format

      // Still test the API call (JSONPlaceholder will accept it)
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .contentType('application/json')
          .jsonBody(invalidData)
        .when()
          .post('/users')
          .execute();

      await response
        .statusCode(201) // JSONPlaceholder accepts any data
        .execute();

      console.log('API accepted invalid data (expected behavior for JSONPlaceholder)');
    });

    it('should test multiple scenarios from fixture data', async function() {
      const scenarios = [
        { name: 'Valid User', data: UserData.validUser, shouldPass: true },
        { name: 'Invalid User', data: UserData.invalidUser, shouldPass: false },
        { name: 'Update Data', data: UserData.updateUserData, shouldPass: true }
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
          .statusCode(201) // JSONPlaceholder always returns 201
          .execute();

        // In real tests, you'd validate based on shouldPass
        if (scenario.shouldPass) {
          expect(response.getData()).to.have.property('id');
        }

        console.log(`✅ Scenario "${scenario.name}" completed`);
      }
    });
  });

  describe('API Response Fixtures', function() {
    it('should compare actual response with expected fixture', async function() {
      const expectedPost = ApiResponses.posts.singlePost;

      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/posts/1')
          .execute();

      await response
        .statusCode(200)
        .jsonPath('$.id', expectedPost.id)
        .jsonPath('$.userId', expectedPost.userId)
        .jsonPath('$.title').exists()
        .jsonPath('$.body').exists()
        .execute();

      const actualPost = response.getData();

      // Compare structure (not exact content as JSONPlaceholder may differ)
      expect(actualPost).to.have.all.keys(Object.keys(expectedPost));
      expect(actualPost.id).to.equal(expectedPost.id);
      expect(actualPost.userId).to.equal(expectedPost.userId);
    });

    it('should test error response format against fixture', async function() {
      const expectedError = ApiResponses.errors.notFound;

      // JSONPlaceholder doesn't return proper errors, so we simulate
      console.log('Expected error format:', expectedError);

      // Validate error structure against schema
      expect(expectedError).to.have.property('error');
      expect(expectedError).to.have.property('message');
      expect(expectedError).to.have.property('statusCode');
      expect(expectedError.statusCode).to.equal(404);
    });

    it('should validate pagination response structure', async function() {
      const paginationData = UserData.paginationData;

      // Simulate paginated API call
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .queryParam('_page', paginationData.page)
          .queryParam('_limit', paginationData.limit)
        .when()
          .get('/posts')
          .execute();

      await response
        .statusCode(200)
        .jsonPath('$').isArray()
        .jsonPath('$.length').equals(paginationData.limit)
        .execute();

      const posts = response.getData();

      // Validate against pagination expectations
      expect(posts).to.have.length(paginationData.limit);
      expect(posts[0]).to.have.property('id');
      expect(posts[0]).to.have.property('title');
    });
  });

  describe('Data-Driven Testing', function() {
    it('should run tests for multiple users from fixture', async function() {
      const usersList = UserData.usersList;

      for (const user of usersList) {
        console.log(`Testing with user: ${user.name} (ID: ${user.id})`);

        const response = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get(`/users/${user.id}`)
            .execute();

        await response
          .statusCode(200)
          .jsonPath('$.id', user.id)
          .jsonPath('$.name').exists()
          .jsonPath('$.username').exists()
          .jsonPath('$.email').exists()
          .execute();

        const actualUser = response.getData();
        
        // Verify basic structure matches expected
        expect(actualUser.id).to.equal(user.id);
        expect(actualUser).to.have.property('name');
        expect(actualUser).to.have.property('email');

        console.log(`✅ User ${user.name} test passed`);
      }
    });

    it('should test CRUD operations with fixture data', async function() {
      const postData = TestData.clone(ApiResponses.posts.newPost);

      // CREATE
      console.log('Creating post...');
      const createResponse = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .contentType('application/json')
          .jsonBody(postData)
        .when()
          .post('/posts')
          .execute();

      await createResponse
        .statusCode(201)
        .jsonPath('$.title', postData.title)
        .jsonPath('$.body', postData.body)
        .jsonPath('$.userId', postData.userId)
        .extract('$.id', 'createdPostId')
        .execute();

      const createdId = restified.getVariable('createdPostId');
      console.log(`Created post with ID: ${createdId}`);

      // READ
      console.log('Reading created post...');
      const readResponse = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get(`/posts/${createdId}`)
          .execute();

      await readResponse
        .statusCode(200)
        .jsonPath('$.id', parseInt(createdId))
        .execute();

      // UPDATE
      console.log('Updating post...');
      const updateData = {
        id: parseInt(createdId),
        title: 'Updated Title',
        body: postData.body,
        userId: postData.userId
      };

      const updateResponse = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .contentType('application/json')
          .jsonBody(updateData)
        .when()
          .put(`/posts/${createdId}`)
          .execute();

      await updateResponse
        .statusCode(200)
        .jsonPath('$.title', updateData.title)
        .execute();

      // DELETE
      console.log('Deleting post...');
      const deleteResponse = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .delete(`/posts/${createdId}`)
          .execute();

      await deleteResponse
        .statusCode(200)
        .execute();

      console.log('✅ CRUD operations completed successfully');
    });
  });

  describe('Schema Validation with Fixtures', function() {
    it('should validate responses against JSON schemas from fixtures', async function() {
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/users/1')
          .execute();

      await response
        .statusCode(200)
        .jsonSchema(Schemas.userSchema)
        .execute();

      console.log('✅ Response validated against user schema');
    });

    it('should validate comment structure', async function() {
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/comments/1')
          .execute();

      await response
        .statusCode(200)
        .jsonSchema(Schemas.commentSchema)
        .execute();

      console.log('✅ Comment response validated against schema');
    });

    it('should validate todo item structure', async function() {
      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get('/todos/1')
          .execute();

      await response
        .statusCode(200)
        .jsonSchema(Schemas.todoSchema)
        .execute();

      console.log('✅ Todo response validated against schema');
    });
  });

  describe('Performance Testing with Fixtures', function() {
    it('should handle batch operations with fixture data', async function() {
      this.timeout(20000);

      const batchSize = 5;
      const basePostData = ApiResponses.posts.newPost;

      console.log(`Creating ${batchSize} posts in parallel...`);

      const promises = Array.from({ length: batchSize }, (_, index) => {
        const postData = {
          ...basePostData,
          title: `${basePostData.title} ${index + 1}`,
          userId: (index % 3) + 1 // Rotate between users 1, 2, 3
        };

        return restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .contentType('application/json')
            .jsonBody(postData)
          .when()
            .post('/posts')
            .execute();
      });

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Validate all responses
      for (const response of responses) {
        await response
          .statusCode(201)
          .jsonPath('$.id').exists()
          .execute();
      }

      const totalTime = endTime - startTime;
      const avgTime = totalTime / batchSize;

      console.log(`Batch completed in ${totalTime}ms (avg: ${avgTime.toFixed(2)}ms per request)`);

      expect(responses).to.have.length(batchSize);
      expect(avgTime).to.be.lessThan(3000); // Each request under 3 seconds
    });
  });
});