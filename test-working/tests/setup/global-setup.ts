import { restified } from 'restifiedts';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Global Test Setup and Teardown
 * 
 * This file automatically configures RestifiedTS for all tests.
 * No need to manually call setup/cleanup in individual test files.
 * 
 * Configuration is applied once before all tests run and
 * cleanup is performed once after all tests complete.
 * 
 * USAGE:
 * 1. Include this file in your Mocha configuration:
 *    - Add to .mocharc.json: "require": ["tests/setup/global-setup.ts"]
 *    - Or use --require flag: mocha --require tests/setup/global-setup.ts
 * 2. Your individual tests can focus on test logic without setup/teardown
 * 3. Use utility functions like getBaseURL(), getAuthToken() in your tests
 */

// ========================================
// GLOBAL SETUP - Runs once before all tests
// ========================================
before(async function() {
  this.timeout(30000); // Allow time for authentication
  
  console.log('🚀 Initializing RestifiedTS Global Test Environment...');
  
  // Set global variables from environment
  const baseURL = process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';
  const timeout = parseInt(process.env.API_TIMEOUT || '30000');
  
  // Set global variables that can be used in all tests
  restified.setGlobalVariable('baseURL', baseURL);
  restified.setGlobalVariable('timeout', timeout);
  restified.setGlobalVariable('userAgent', 'RestifiedTS-TestSuite/1.0');
  
  console.log(`📡 Base URL configured: ${baseURL}`);
  console.log(`⏱️  Default timeout: ${timeout}ms`);

  // Real-world authentication: Obtain token dynamically
  await authenticateAndSetTokens();
  
  console.log('✅ Global test environment initialized successfully');
});

// ========================================
// GLOBAL TEARDOWN - Runs once after all tests
// ========================================
after(async function() {
  this.timeout(10000);
  
  console.log('🧹 Cleaning up RestifiedTS Global Test Environment...');
  
  try {
    // Cleanup RestifiedTS resources
    await restified.cleanup();
    console.log('✅ Global test environment cleanup completed successfully');
  } catch (error: any) {
    console.error('❌ Global cleanup error:', error?.message || error);
  }
});

// ========================================
// BEFORE EACH TEST - Clear local variables
// ========================================
beforeEach(function() {
  // Clear local variables before each test to ensure test isolation
  restified.clearLocalVariables();
});

/**
 * Real-world authentication pattern:
 * 1. Call authentication endpoint with credentials
 * 2. Extract token from response
 * 3. Set as global variable for all subsequent tests
 */
async function authenticateAndSetTokens() {
  try {
    // Option 1: Use static token from environment (for development/testing)
    if (process.env.AUTH_TOKEN) {
      console.log('🔑 Using static AUTH_TOKEN from environment');
      restified.setGlobalVariable('authToken', process.env.AUTH_TOKEN);
      return;
    }

    // Option 2: Dynamic authentication (real-world pattern)
    if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) {
      console.log('🔐 Obtaining AUTH_TOKEN dynamically via API call...');
      
      const authURL = process.env.AUTH_SERVICE_URL || process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';
      
      const response = await restified
        .given()
          .baseURL(authURL)
          .contentType('application/json')
          .jsonBody({
            username: process.env.AUTH_USERNAME,
            password: process.env.AUTH_PASSWORD,
            grant_type: 'password'
          })
        .when()
          .post('/auth/login')
          .execute();

      await response
        .statusCode(200)
        .extract('$.access_token', 'authToken')
        .extract('$.refresh_token', 'refreshToken')
        .execute();

      console.log('✅ Dynamic authentication successful - token obtained and stored');
      return;
    }

    // Option 3: OAuth2 Client Credentials flow
    if (process.env.OAUTH2_CLIENT_ID && process.env.OAUTH2_CLIENT_SECRET) {
      console.log('🔒 Obtaining OAuth2 token via client credentials flow...');
      
      const oauthURL = process.env.OAUTH2_TOKEN_URL || `${process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com'}/oauth`;
      
      const oauthResponse = await restified
        .given()
          .baseURL(oauthURL)
          .contentType('application/x-www-form-urlencoded')
          .formBody({
            grant_type: 'client_credentials',
            client_id: process.env.OAUTH2_CLIENT_ID,
            client_secret: process.env.OAUTH2_CLIENT_SECRET,
            scope: process.env.OAUTH2_SCOPE || 'api:read api:write'
          })
        .when()
          .post('/token')
          .execute();

      await oauthResponse
        .statusCode(200)
        .extract('$.access_token', 'authToken')
        .execute();

      console.log('✅ OAuth2 authentication successful - token obtained');
      return;
    }

    // Option 4: API Key authentication
    if (process.env.API_KEY) {
      console.log('🗝️  Using API_KEY authentication');
      restified.setGlobalVariable('apiKey', process.env.API_KEY);
      return;
    }

    console.warn('⚠️  No authentication configured - tests may fail if API requires auth');
    
  } catch (error: any) {
    console.error('❌ Authentication failed:', error?.message || error);
    throw new Error(`Authentication setup failed: ${error?.message || error}`);
  }
}

// ========================================
// UTILITY FUNCTIONS FOR TESTS  
// ========================================

/**
 * Get the configured base URL for tests
 */
export function getBaseURL(): string {
  return restified.getGlobalVariable('baseURL') || process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';
}

/**
 * Get the configured auth token for tests
 */
export function getAuthToken(): string {
  return restified.getGlobalVariable('authToken') || process.env.AUTH_TOKEN || '';
}

/**
 * Get the configured API key for tests
 */
export function getApiKey(): string {
  return restified.getGlobalVariable('apiKey') || process.env.API_KEY || '';
}

/**
 * Check if authentication is configured
 */
export function isAuthConfigured(): boolean {
  return !!(getAuthToken() || getApiKey());
}
