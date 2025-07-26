import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from '../setup/manual-setup';
import { TestData, UserData, ApiResponses } from '../fixtures/test-data';

/**
 * Fixtures and Test Data Examples
 * 
 * Demonstrates how to use JSON fixtures and data-driven testing
 */
describe('Fixtures Examples @integration', function() {
  before(async function() {
    this.timeout(30000);
    await TestSetup.configure();
  });

  after(async function() {
    this.timeout(10000);
    await TestSetup.cleanup();
  });

  it('should use predefined user data from fixtures', async function() {
    const userData = TestData.clone(UserData.validUser);

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
  });

  it('should test with multiple scenarios from fixtures', async function() {
    const scenarios = [
      { name: 'Valid User', data: UserData.validUser, shouldPass: true },
      { name: 'Invalid User', data: UserData.invalidUser, shouldPass: false }
    ];

    for (const scenario of scenarios) {
      console.log(`Testing scenario: ${scenario.name}`);

      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .contentType('application/json')
          .jsonBody(scenario.data)
        .when()
          .post('/users')
          .execute();

      await response
        .statusCode(201)
        .execute();
    }
  });
});
