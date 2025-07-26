import { restified } from 'restifiedts';
import { expect } from 'chai';
import { getBaseURL, getAuthToken, isAuthConfigured } from '../setup/global-setup';

/**
 * Sample API Tests - Global Setup Approach
 * 
 * This example demonstrates the global setup approach where setup/cleanup
 * happens automatically without manual before/after hooks in each test file.
 * 
 * Requirements:
 * 1. Include global-setup.ts in your Mocha configuration:
 *    - Add to .mocharc.json: "require": ["tests/setup/global-setup.ts"]
 *    - Or use --require flag: mocha --require tests/setup/global-setup.ts
 * 
 * Benefits:
 * - No repetitive setup/cleanup code in test files
 * - Cleaner test code focused on test logic
 * - Centralized configuration management
 * - Automatic authentication and resource cleanup
 */
describe('Sample API Tests - Global Setup @smoke', function() {
  // No manual before/after hooks needed!
  // Global setup handles everything automatically

  it('should get all posts using global configuration', async function() {
    this.timeout(10000);

    const response = await restified
      .given()
        .baseURL(getBaseURL()) // Uses globally configured URL
        .header('Content-Type', 'application/json')
        // Auth token is already configured globally if available
      .when()
        .get('/posts')
        .execute();

    await response
      .statusCode(200)
      .jsonPathExists('$[0].id')
      .jsonPathExists('$[0].title')
      .execute();

    expect(response.getData()).to.be.an('array');
    expect(response.getData().length).to.be.greaterThan(0);
  });

  it('should get a specific post with automatic auth', async function() {
    this.timeout(10000);
    
    // Skip this test if no auth is configured
    if (!isAuthConfigured()) {
      this.skip();
      return;
    }

    const response = await restified
      .given()
        .baseURL(getBaseURL())
        .header('Content-Type', 'application/json')
        .bearerToken(getAuthToken()) // Uses globally configured token
      .when()
        .get('/posts/1')
        .execute();

    await response
      .statusCode(200)
      .jsonPath('$.id', 1)
      .jsonPathExists('$.title')
      .jsonPathExists('$.body')
      .execute();

    expect(response.getData().id).to.equal(1);
  });

  it('should create a new post with global settings', async function() {
    this.timeout(10000);

    const newPost = {
      title: 'Test Post - Global Setup',
      body: 'This post was created using global setup configuration',
      userId: 1
    };

    const response = await restified
      .given()
        .baseURL(getBaseURL()) // Automatically uses configured base URL
        .header('Content-Type', 'application/json')
        .body(newPost)
      .when()
        .post('/posts')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.title', newPost.title)
      .jsonPath('$.body', newPost.body)
      .jsonPath('$.userId', newPost.userId)
      .execute();

    expect(response.getData().id).to.be.a('number');
    
    // Log success with configuration info
    console.log(`✅ Created post using base URL: ${getBaseURL()}`);
    console.log(`🔐 Authentication configured: ${isAuthConfigured() ? 'Yes' : 'No'}`);
  });
});
