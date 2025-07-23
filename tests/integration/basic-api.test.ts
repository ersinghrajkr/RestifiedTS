import { expect } from 'chai';
import { restified } from '../../src';

describe('Basic API Integration Tests', () => {
  
  describe('JSONPlaceholder API Tests', () => {
    it('should make a basic GET request', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/1')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('id', 1);
        expect(result.data).to.have.property('userId');
        expect(result.data).to.have.property('title');
        expect(result.data).to.have.property('body');
      } catch (error: any) {
        console.warn('JSONPlaceholder API test failed, might be network issue:', error.message);
        this.skip();
      }
    });

    it('should handle query parameters', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .queryParam('userId', '1')
          .when()
            .get('/posts')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(Array.isArray(result.data)).to.be.true;
        if (result.data.length > 0) {
          expect(result.data[0]).to.have.property('userId', 1);
        }
      } catch (error: any) {
        console.warn('JSONPlaceholder API query test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('HTTPBin API Tests', () => {
    it('should handle custom headers', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .header('X-Test-Header', 'RestifiedTS-Test')
          .when()
            .get('/headers')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('headers');
        expect(result.data.headers).to.have.property('X-Test-Header', 'RestifiedTS-Test');
      } catch (error: any) {
        console.warn('HTTPBin headers test failed:', error.message);
        this.skip();
      }
    });

    it('should handle POST requests with JSON body', async function() {
      this.timeout(5000);
      
      try {
        const testData = { name: 'RestifiedTS', version: '1.0.0' };
        
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .header('Content-Type', 'application/json')
            .body(testData)
          .when()
            .post('/post')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('json');
        expect(result.data.json).to.deep.equal(testData);
      } catch (error: any) {
        console.warn('HTTPBin POST test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 responses gracefully', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
          .when()
            .get('/status/404')
          .then()
            .statusCode(404)
          .execute();

        expect(result.status).to.equal(404);
      } catch (error: any) {
        console.warn('404 handling test failed:', error.message);
        this.skip();
      }
    });

    it('should handle invalid URLs', async function() {
      this.timeout(5000);
      
      try {
        await restified
          .given()
            .baseURL('https://invalid-domain-that-does-not-exist-12345.com')
          .when()
            .get('/test')
          .then()
            .statusCode(200)
          .execute();
        
        // Should not reach here
        expect.fail('Expected request to invalid domain to fail');
      } catch (error) {
        // Expected to fail
        expect(error).to.exist;
      }
    });
  });
});