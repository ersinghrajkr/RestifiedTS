import { expect } from 'chai';
import { restified } from 'restifiedts';

describe('Sample API Tests @integration @smoke', () => {
  
  it('should get user information', async function() {
    this.timeout(10000);

    const result = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
      .when()
        .get('/users/1')
      .then()
        .statusCode(200)
        .jsonPath('$.name', 'Leanne Graham')
        .jsonPath('$.email', 'Sincere@april.biz')
      .execute();

    expect(result.data).to.have.property('id', 1);
    expect(result.data).to.have.property('name');
    expect(result.data).to.have.property('email');
  });

  it('should create new user', async function() {
    this.timeout(10000);

    const newUser = {
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com'
    };

    const result = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
        .body(newUser)
      .when()
        .post('/users')
      .then()
        .statusCode(201)
        .jsonPath('$.name', 'John Doe')
      .execute();

    expect(result.data).to.have.property('id');
    expect(result.data.name).to.equal('John Doe');
  });
});
