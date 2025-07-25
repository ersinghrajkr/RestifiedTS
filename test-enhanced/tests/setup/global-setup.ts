import { restified } from 'restifiedts';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export class TestSetup {
  static async configure() {
    // Configure RestifiedTS with environment variables
    restified.configure({
      baseURL: process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com',
      timeout: parseInt(process.env.API_TIMEOUT || '30000'),
      headers: {
        'User-Agent': 'RestifiedTS-TestSuite/1.0'
      }
    });

    // Real-world authentication: Obtain token dynamically
    await this.authenticateAndSetTokens();
  }

  /**
   * Real-world authentication pattern:
   * 1. Call authentication endpoint with credentials
   * 2. Extract token from response
   * 3. Set as global variable for all subsequent tests
   */
  static async authenticateAndSetTokens() {
    try {
      // Option 1: Use static token from environment (for development/testing)
      if (process.env.AUTH_TOKEN) {
        console.log('Using static AUTH_TOKEN from environment');
        restified.setGlobalVariable('authToken', process.env.AUTH_TOKEN);
        return;
      }

      // Option 2: Dynamic authentication (real-world pattern)
      if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) {
        console.log('Obtaining AUTH_TOKEN dynamically via API call...');
        
        await restified
          .given()
            .baseURL(process.env.AUTH_SERVICE_URL || process.env.API_BASE_URL)
            .contentType('application/json')
            .jsonBody({
              username: process.env.AUTH_USERNAME,
              password: process.env.AUTH_PASSWORD,
              grant_type: 'password'
            })
          .when()
            .post('/auth/login')
            .execute()
          .then()
            .statusCode(200)
            .extract('$.access_token', 'authToken')
            .extract('$.refresh_token', 'refreshToken')
            .execute();

        console.log('✅ Authentication successful - token obtained and stored');
        return;
      }

      // Option 3: OAuth2 Client Credentials flow
      if (process.env.OAUTH2_CLIENT_ID && process.env.OAUTH2_CLIENT_SECRET) {
        console.log('Obtaining OAuth2 token via client credentials flow...');
        
        await restified
          .given()
            .baseURL(process.env.OAUTH2_TOKEN_URL || `${process.env.API_BASE_URL}/oauth`)
            .contentType('application/x-www-form-urlencoded')
            .formBody({
              grant_type: 'client_credentials',
              client_id: process.env.OAUTH2_CLIENT_ID,
              client_secret: process.env.OAUTH2_CLIENT_SECRET,
              scope: process.env.OAUTH2_SCOPE || 'api:read api:write'
            })
          .when()
            .post('/token')
            .execute()
          .then()
            .statusCode(200)
            .extract('$.access_token', 'authToken')
            .execute();

        console.log('✅ OAuth2 authentication successful - token obtained');
        return;
      }

      // Option 4: API Key authentication
      if (process.env.API_KEY) {
        console.log('Using API_KEY authentication');
        restified.setGlobalVariable('apiKey', process.env.API_KEY);
        return;
      }

      console.warn('⚠️  No authentication configured - tests may fail if API requires auth');
      
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw new Error(`Authentication setup failed: ${error.message}`);
    }
  }

  static async cleanup() {
    console.log('🧹 Cleaning up RestifiedTS resources...');
    try {
      await restified.cleanup();
      console.log('✅ Cleanup completed successfully');
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
    }
  }
}
