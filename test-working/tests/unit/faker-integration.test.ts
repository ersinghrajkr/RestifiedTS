import { restified } from 'restifiedts';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { TestSetup } from '../setup/manual-setup';
import { TestData } from '../fixtures/test-data';

/**
 * Faker.js Integration Tests
 */
describe('Faker.js Integration @unit', function() {
  before(async function() {
    this.timeout(30000);
    await TestSetup.configure();
    
    // Set faker locale from environment or default to English
    // Note: In newer versions of Faker, locale is handled differently
    // faker.locale = process.env.FAKER_LOCALE || 'en';
    
    // Set seed for reproducible tests if provided
    if (process.env.MOCK_DATA_SEED) {
      faker.seed(parseInt(process.env.MOCK_DATA_SEED));
    }
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  it('should create user with faker-generated data', async function() {
    const userData = TestData.generateUser(faker);
    
    console.log('Generated user data:', userData.name);

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
      .jsonPath('$.email', userData.email)
      .execute();

    expect(userData.name).to.be.a('string').and.to.have.length.greaterThan(0);
    expect(userData.email).to.include('@');
  });

  it('should use faker data in RestifiedTS variables', async function() {
    restified.setGlobalVariable('randomName', faker.person.fullName());
    restified.setGlobalVariable('randomEmail', faker.internet.email());

    const userData = {
      name: '{{randomName}}',
      email: '{{randomEmail}}'
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
      .jsonPathExists('$.name')
      .jsonPathExists('$.email')
      .execute();
  });
});
