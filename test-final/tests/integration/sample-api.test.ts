import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from '../setup/global-setup';

describe('Sample API Tests @smoke', function() {
  before(async function() {
    this.timeout(30000);
    await TestSetup.configure();
  });

  after(async function() {
    this.timeout(10000);
    await TestSetup.cleanup();
  });

  afterEach(async function() {
    // Ensure cleanup after each test
    await new Promise(resolve => setTimeout(resolve, 100));
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
      .jsonPath('$[0].id')
      .jsonPath('$[0].title')
      .execute();

    expect(response.data).to.be.an('array');
    expect(response.data.length).to.be.greaterThan(0);
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
      .jsonPath('$.title')
      .jsonPath('$.body')
      .execute();

    expect(response.data.id).to.equal(1);
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

    expect(response.data.id).to.be.a('number');
  });
});
