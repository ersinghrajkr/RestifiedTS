import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from '../setup/manual-setup';

/**
 * Sample API Tests - Manual Setup Approach
 * 
 * This example demonstrates the manual setup approach where you explicitly
 * call TestSetup.configure() and TestSetup.cleanup() in each test file.
 * 
 * Alternative: Use '../setup/global-setup' for automatic setup without 
 * manual before/after hooks in each test file.
 */
describe('Sample API Tests @smoke', function() {
  before(async function() {
    await TestSetup.configure();
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  it('should get all posts', async function() {
    this.timeout(10000);

    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
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

  it('should get a specific post', async function() {
    this.timeout(10000);

    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
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

  it('should create a new post', async function() {
    this.timeout(10000);

    const newPost = {
      title: 'Test Post',
      body: 'This is a test post created by RestifiedTS',
      userId: 1
    };

    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
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
  });
});
