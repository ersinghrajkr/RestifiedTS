import { restified } from 'restifiedts';
import { expect } from 'chai';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { TestSetup } from '../setup/global-setup';
import { TestData, Schemas } from '../fixtures/test-data';

/**
 * Schema Validation Tests
 */
describe('Schema Validation @unit', function() {
  let ajv: Ajv;

  before(async function() {
    this.timeout(30000);
    await TestSetup.configure();
    
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  it('should validate user response against schema', async function() {
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

    const postData = response.getData();
    expect(postData).to.have.all.keys('id', 'title', 'body', 'userId');
    expect(postData.id).to.be.above(0);
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

    const posts = response.getData();
    const validate = ajv.compile(Schemas.postSchema);

    for (const post of posts) {
      const isValid = validate(post);
      expect(isValid).to.be.true;
    }
  });
});
