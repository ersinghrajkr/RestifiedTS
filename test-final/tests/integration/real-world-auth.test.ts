import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from '../setup/global-setup';

/**
 * Real-world authentication patterns with RestifiedTS
 * 
 * This test demonstrates how to handle dynamic authentication
 * where tokens are obtained via API calls rather than static environment variables.
 */
describe('Real-World Authentication Patterns', function() {
  this.timeout(30000); // Increase timeout for authentication calls

  before(async function() {
    // Configure RestifiedTS and obtain authentication tokens
    await TestSetup.configure();
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  describe('Dynamic Token Authentication', function() {
    beforeEach(async function() {
      // Refresh token if needed before each test
      await TestSetup.refreshTokenIfNeeded();
    });

    it('should use dynamically obtained bearer token', async function() {
      // The authToken variable was set during TestSetup.configure()
      // by making an API call to the authentication endpoint
      
      await restified
        .given()
          .baseURL(process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com')
          .bearerToken('{{authToken}}') // Use the dynamically obtained token
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
      // Example of using the token for a protected endpoint
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
          .jsonPath('$.id').exists()
          .jsonPath('$.title', 'Test Post')
          .extract('$.id', 'createdPostId') // Extract for cleanup or further use
          .execute();
    });

    it('should handle token refresh scenario', async function() {
      // Simulate a scenario where token might be expired
      // The refreshTokenIfNeeded() method would have been called in beforeEach
      
      await restified
        .given()
          .baseURL(process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com')
          .bearerToken('{{authToken}}') // This should be a fresh token
          .contentType('application/json')
        .when()
          .get('/users/1')
          .execute()
        .then()
          .statusCode(200)
          .jsonPath('$.id', 1)
          .jsonPath('$.name').exists()
          .jsonPath('$.email').exists()
          .execute();
    });
  });

  describe('OAuth2 Client Credentials Flow', function() {
    it('should obtain and use OAuth2 token for service-to-service calls', async function() {
      // If OAuth2 credentials are provided, TestSetup would have obtained a token
      // This pattern is common for microservices authentication
      
      const hasOAuth2Token = restified.getVariable('authToken') && 
                           process.env.OAUTH2_CLIENT_ID;
      
      if (!hasOAuth2Token) {
        this.skip('OAuth2 credentials not configured');
      }

      await restified
        .given()
          .baseURL(process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com')
          .bearerToken('{{authToken}}') // OAuth2 access token
          .header('X-Token-Type', '{{tokenType}}') // Usually 'Bearer'
        .when()
          .get('/posts')
          .execute()
        .then()
          .statusCode(200)
          .jsonPath('$').isArray()
          .jsonPath('$.length').greaterThan(0)
          .execute();
    });
  });

  describe('API Key Authentication', function() {
    it('should use API key for authentication', async function() {
      const hasApiKey = restified.getVariable('apiKey') || process.env.API_KEY;
      
      if (!hasApiKey) {
        this.skip('API Key not configured');
      }

      await restified
        .given()
          .baseURL(process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com')
          .header('X-API-Key', '{{apiKey}}')
        .when()
          .get('/albums')
          .execute()
        .then()
          .statusCode(200)
          .jsonPath('$').isArray()
          .execute();
    });
  });

  describe('Multi-Step Authentication Workflows', function() {
    it('should handle complex authentication flow', async function() {
      // Example: Get initial auth token, then use it to get a service-specific token
      
      // Step 1: Use main auth token to get a service-specific token
      await restified
        .given()
          .baseURL(process.env.AUTH_SERVICE_URL || process.env.API_BASE_URL)
          .bearerToken('{{authToken}}')
          .jsonBody({
            service: 'payments',
            scope: 'payment:create payment:read'
          })
        .when()
          .post('/auth/service-token')
          .execute()
        .then()
          .statusCode(200)
          .extract('$.service_token', 'paymentServiceToken')
          .extract('$.expires_at', 'paymentTokenExpiry')
          .execute();

      // Step 2: Use the service-specific token for actual API calls
      await restified
        .given()
          .baseURL(process.env.PAYMENT_SERVICE_URL || process.env.API_BASE_URL)
          .bearerToken('{{paymentServiceToken}}')
          .jsonBody({
            amount: 100.00,
            currency: 'USD',
            description: 'Test payment'
          })
        .when()
          .post('/payments')
          .execute()
        .then()
          .statusCode(201)
          .jsonPath('$.payment_id').exists()
          .jsonPath('$.status', 'pending')
          .execute();
    });
  });
});