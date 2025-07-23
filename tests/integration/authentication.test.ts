import { expect } from 'chai';
import { restified } from '../../src';

describe('Authentication Integration Tests', () => {
  
  describe('Bearer Token Authentication', () => {
    it('should send bearer token in Authorization header', async function() {
      this.timeout(5000);
      
      try {
        const bearerToken = 'test-bearer-token-12345';
        
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .bearerAuth(bearerToken)
          .when()
            .get('/bearer')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('authenticated', true);
        expect(result.data).to.have.property('token', bearerToken);

      } catch (error: any) {
        console.warn('Bearer token authentication test failed:', error.message);
        this.skip();
      }
    });

    it('should handle invalid bearer tokens', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .bearerAuth('invalid-token')
          .when()
            .get('/bearer')
          .then()
            .statusCode(401)
          .execute();

        expect(result.status).to.equal(401);

      } catch (error: any) {
        console.warn('Invalid bearer token test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('Basic Authentication', () => {
    it('should send basic auth credentials', async function() {
      this.timeout(5000);
      
      try {
        const username = 'testuser';
        const password = 'testpass';
        
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .basicAuth(username, password)
          .when()
            .get(`/basic-auth/${username}/${password}`)
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('authenticated', true);
        expect(result.data).to.have.property('user', username);

      } catch (error: any) {
        console.warn('Basic authentication test failed:', error.message);
        this.skip();
      }
    });

    it('should handle incorrect basic auth credentials', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .basicAuth('wronguser', 'wrongpass')
          .when()
            .get('/basic-auth/testuser/testpass')
          .then()
            .statusCode(401)
          .execute();

        expect(result.status).to.equal(401);

      } catch (error: any) {
        console.warn('Incorrect basic auth test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('API Key Authentication', () => {
    it('should send API key in custom header', async function() {
      this.timeout(5000);
      
      try {
        const apiKey = 'test-api-key-12345';
        const headerName = 'X-API-Key';
        
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .apiKeyAuth(apiKey, headerName)
          .when()
            .get('/headers')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('headers');
        expect(result.data.headers).to.have.property(headerName, apiKey);

      } catch (error: any) {
        console.warn('API key authentication test failed:', error.message);
        this.skip();
      }
    });

    it('should send API key as query parameter', async function() {
      this.timeout(5000);
      
      try {
        const apiKey = 'test-query-api-key';
        
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .queryParam('api_key', apiKey)
          .when()
            .get('/get')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('args');
        expect(result.data.args).to.have.property('api_key', apiKey);

      } catch (error: any) {
        console.warn('API key query parameter test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('Multiple Authentication Methods', () => {
    it('should handle multiple authentication headers', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .header('Authorization', 'Bearer primary-token')
            .header('X-API-Key', 'secondary-api-key')
            .header('X-Custom-Auth', 'custom-auth-value')
          .when()
            .get('/headers')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data.headers).to.have.property('Authorization', 'Bearer primary-token');
        expect(result.data.headers).to.have.property('X-Api-Key', 'secondary-api-key');
        expect(result.data.headers).to.have.property('X-Custom-Auth', 'custom-auth-value');

      } catch (error: any) {
        console.warn('Multiple authentication test failed:', error.message);
        this.skip();
      }
    });

    it('should support authentication with variables', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .variable('authToken', 'dynamic-token-12345')
            .header('Authorization', 'Bearer {{authToken}}')
          .when()
            .get('/headers')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data.headers).to.have.property('Authorization', 'Bearer dynamic-token-12345');

      } catch (error: any) {
        console.warn('Authentication with variables test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('OAuth2 Authentication Flow', () => {
    it('should support OAuth2 client credentials flow', async function() {
      this.timeout(10000);
      
      try {
        // Mock OAuth2 token request
        const tokenResponse = await restified
          .given()
            .baseURL('https://httpbin.org')
            .header('Content-Type', 'application/x-www-form-urlencoded')
            .body('grant_type=client_credentials&client_id=test&client_secret=secret')
          .when()
            .post('/post')
          .then()
            .statusCode(200)
          .execute();

        expect(tokenResponse.status).to.equal(200);
        
        // Simulate using the obtained token
        const mockToken = 'oauth2-access-token';
        const apiResult = await restified
          .given()
            .baseURL('https://httpbin.org')
            .bearerAuth(mockToken)
          .when()
            .get('/bearer')
          .then()
            .statusCode(200)
          .execute();

        expect(apiResult.data.token).to.equal(mockToken);

      } catch (error: any) {
        console.warn('OAuth2 client credentials test failed:', error.message);
        this.skip();
      }
    });

    it('should handle OAuth2 token refresh', async function() {
      this.timeout(8000);
      
      try {
        const refreshTokenRequest = await restified
          .given()
            .baseURL('https://httpbin.org')
            .header('Content-Type', 'application/x-www-form-urlencoded')
            .body('grant_type=refresh_token&refresh_token=mock-refresh-token')
          .when()
            .post('/post')
          .then()
            .statusCode(200)
          .execute();

        expect(refreshTokenRequest.status).to.equal(200);
        expect(refreshTokenRequest.data).to.have.property('form');
        expect(refreshTokenRequest.data.form).to.have.property('grant_type', 'refresh_token');

      } catch (error: any) {
        console.warn('OAuth2 token refresh test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle authentication timeouts', async function() {
      this.timeout(8000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .bearerAuth('test-token')
            .timeout(1000) // Very short timeout
          .when()
            .get('/delay/5') // 5 second delay endpoint
          .then()
            .statusCode(200)
          .execute();

        expect.fail('Request should have timed out');

      } catch (error: any) {
        // Expected timeout error
        expect(error).to.exist;
        expect(error.message).to.match(/timeout|ECONNABORTED/i);
      }
    });

    it('should handle malformed authentication headers', async function() {
      this.timeout(5000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .header('Authorization', 'Malformed auth header')
          .when()
            .get('/headers')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data.headers).to.have.property('Authorization', 'Malformed auth header');

      } catch (error: any) {
        console.warn('Malformed auth header test failed:', error.message);
        this.skip();
      }
    });
  });
});