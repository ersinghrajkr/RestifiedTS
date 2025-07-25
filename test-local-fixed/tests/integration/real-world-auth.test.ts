import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from '../setup/global-setup';

/**
 * Real-world authentication patterns with RestifiedTS
 */
describe('Real-World Authentication @integration', function() {
  this.timeout(30000);

  before(async function() {
    await TestSetup.configure();
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  it('should use dynamically obtained bearer token', async function() {
    await restified
      .given()
        .baseURL(process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com')
        .bearerToken('{{authToken}}')
        .header('Content-Type', 'application/json')
      .when()
        .get('/posts/1')
        .execute()
      .then()
        .statusCode(200)
        .jsonPath('$.id', 1)
        .jsonPath('$.title').exists()
        .execute();
  });

  it('should handle protected endpoints with extracted token', async function() {
    await restified
      .given()
        .baseURL(process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com')
        .bearerToken('{{authToken}}')
        .jsonBody({
          title: 'Test Post',
          body: 'This is a test post created with dynamic authentication',
          userId: 1
        })
      .when()
        .post('/posts')
        .execute()
      .then()
        .statusCode(201)
        .jsonPath('$.title', 'Test Post')
        .execute();
  });
});
