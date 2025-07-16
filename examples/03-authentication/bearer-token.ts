/**
 * Bearer Token Authentication Example
 * 
 * This example demonstrates various ways to handle Bearer token authentication
 * including static tokens, dynamic tokens, and token refresh scenarios.
 */

import { RestifiedTS } from '../../src';

async function staticBearerToken() {
  console.log('🔐 Static Bearer Token Authentication Example...\n');

  try {
    // Static bearer token authentication
    const result = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .bearerToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.token')
        .header('Accept', 'application/json')
      .when()
        .get('/bearer')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .jsonPath('$.token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.token')
      .execute();

    console.log('✅ Static bearer token authentication successful!');
    console.log('🔑 Token validated:', result.response.body.authenticated);

  } catch (error) {
    console.error('❌ Static bearer token authentication failed:', error.message);
    throw error;
  }
}

async function dynamicBearerToken() {
  console.log('\n🔄 Dynamic Bearer Token Authentication Example...\n');

  try {
    // First, obtain a token (simulated login)
    const loginResult = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .header('Content-Type', 'application/json')
        .jsonBody({
          username: 'testuser',
          password: 'testpass'
        })
      .when()
        .post('/post') // Using /post as a mock login endpoint
      .then()
        .statusCode(200)
        .extract('$.json.username', 'username')
      .execute();

    // Generate a mock JWT token (in real scenario, this would come from the login response)
    const mockToken = generateMockJWT(loginResult.extractedVariables.username);

    // Use the obtained token for authenticated requests
    const authenticatedResult = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .bearerToken(mockToken)
      .when()
        .get('/bearer')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .jsonPath('$.token', mockToken)
      .execute();

    console.log('✅ Dynamic bearer token authentication successful!');
    console.log('👤 Username:', loginResult.extractedVariables.username);
    console.log('🔑 Generated token:', mockToken.substring(0, 20) + '...');

  } catch (error) {
    console.error('❌ Dynamic bearer token authentication failed:', error.message);
    throw error;
  }
}

async function tokenFromEnvironment() {
  console.log('\n🌍 Bearer Token from Environment Variables Example...\n');

  try {
    // Set environment variable for demonstration
    process.env.API_TOKEN = 'env-token-12345';

    const result = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .bearerToken('{{API_TOKEN}}') // Token from environment variable
        .header('Accept', 'application/json')
      .when()
        .get('/bearer')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .jsonPath('$.token', 'env-token-12345')
      .execute();

    console.log('✅ Environment token authentication successful!');
    console.log('🌍 Token from environment:', process.env.API_TOKEN);

  } catch (error) {
    console.error('❌ Environment token authentication failed:', error.message);
    throw error;
  }
}

async function tokenRefreshScenario() {
  console.log('\n🔄 Token Refresh Scenario Example...\n');

  try {
    // Simulate initial login to get access and refresh tokens
    const loginResult = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .header('Content-Type', 'application/json')
        .jsonBody({
          username: 'testuser',
          password: 'testpass'
        })
      .when()
        .post('/post')
      .then()
        .statusCode(200)
        .extract('$.json.username', 'username')
      .execute();

    // Generate mock tokens
    const accessToken = generateMockJWT(loginResult.extractedVariables.username);
    const refreshToken = generateMockRefreshToken();

    console.log('🔑 Initial tokens obtained');
    console.log('   Access token:', accessToken.substring(0, 20) + '...');
    console.log('   Refresh token:', refreshToken.substring(0, 20) + '...');

    // Use access token for API call
    const apiResult = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .bearerToken(accessToken)
      .when()
        .get('/bearer')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
      .execute();

    console.log('✅ API call with access token successful!');

    // Simulate token expiration and refresh
    console.log('\n🔄 Simulating token refresh...');
    
    const newAccessToken = generateMockJWT(loginResult.extractedVariables.username + '-refreshed');
    
    // Use refreshed token for subsequent API calls
    const refreshedApiResult = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .bearerToken(newAccessToken)
      .when()
        .get('/bearer')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .jsonPath('$.token', newAccessToken)
      .execute();

    console.log('✅ Token refresh scenario completed successfully!');
    console.log('🔑 New access token:', newAccessToken.substring(0, 20) + '...');

  } catch (error) {
    console.error('❌ Token refresh scenario failed:', error.message);
    throw error;
  }
}

async function tokenValidationScenario() {
  console.log('\n🔍 Token Validation Scenario Example...\n');

  try {
    const validToken = generateMockJWT('validuser');
    const invalidToken = 'invalid.token.here';

    // Test with valid token
    const validResult = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .bearerToken(validToken)
      .when()
        .get('/bearer')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .jsonPath('$.token', validToken)
      .execute();

    console.log('✅ Valid token test passed!');

    // Test with invalid token (should fail)
    try {
      await RestifiedTS
        .given()
          .baseUrl('https://httpbin.org')
          .bearerToken(invalidToken)
        .when()
          .get('/bearer')
        .then()
          .statusCode(401) // Expecting unauthorized
        .execute();

      console.log('❌ Invalid token test should have failed but didn\'t');
    } catch (error) {
      console.log('✅ Invalid token correctly rejected!');
    }

  } catch (error) {
    console.error('❌ Token validation scenario failed:', error.message);
    throw error;
  }
}

async function multiServiceTokens() {
  console.log('\n🏢 Multi-Service Token Authentication Example...\n');

  try {
    // Different tokens for different services
    const userServiceToken = generateMockJWT('user-service');
    const orderServiceToken = generateMockJWT('order-service');
    const paymentServiceToken = generateMockJWT('payment-service');

    // User service call
    const userResult = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .bearerToken(userServiceToken)
        .header('X-Service', 'user-service')
      .when()
        .get('/bearer')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .extract('$.token', 'userToken')
      .execute();

    // Order service call
    const orderResult = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .bearerToken(orderServiceToken)
        .header('X-Service', 'order-service')
      .when()
        .get('/bearer')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .extract('$.token', 'orderToken')
      .execute();

    // Payment service call
    const paymentResult = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .bearerToken(paymentServiceToken)
        .header('X-Service', 'payment-service')
      .when()
        .get('/bearer')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .extract('$.token', 'paymentToken')
      .execute();

    console.log('✅ Multi-service token authentication successful!');
    console.log('👤 User service token:', userResult.extractedVariables.userToken.substring(0, 20) + '...');
    console.log('📦 Order service token:', orderResult.extractedVariables.orderToken.substring(0, 20) + '...');
    console.log('💳 Payment service token:', paymentResult.extractedVariables.paymentToken.substring(0, 20) + '...');

  } catch (error) {
    console.error('❌ Multi-service token authentication failed:', error.message);
    throw error;
  }
}

async function tokenWithCustomHeaders() {
  console.log('\n📋 Bearer Token with Custom Headers Example...\n');

  try {
    const token = generateMockJWT('api-user');

    const result = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .bearerToken(token)
        .header('X-API-Version', 'v1')
        .header('X-Client-Id', 'restified-client')
        .header('X-Request-ID', generateRequestId())
        .header('Accept', 'application/json')
        .header('User-Agent', 'RestifiedTS/1.0')
      .when()
        .get('/bearer')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .jsonPath('$.token', token)
        .header('Content-Type', containsString('application/json'))
      .execute();

    console.log('✅ Token with custom headers successful!');
    console.log('🔑 Token authenticated:', result.response.body.authenticated);
    console.log('📋 Custom headers sent successfully');

  } catch (error) {
    console.error('❌ Token with custom headers failed:', error.message);
    throw error;
  }
}

// Helper functions
function generateMockJWT(subject: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    sub: subject,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    iss: 'restified-ts-example'
  })).toString('base64');
  const signature = Buffer.from('mock-signature-' + Date.now()).toString('base64');
  
  return `${header}.${payload}.${signature}`;
}

function generateMockRefreshToken(): string {
  return 'refresh_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateRequestId(): string {
  return 'req_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function containsString(substring: string) {
  return (actual: string) => actual.includes(substring);
}

// Run all examples
async function runAllExamples() {
  console.log('🎯 Running Bearer Token Authentication Examples\n');
  console.log('=' .repeat(50));

  try {
    await staticBearerToken();
    await dynamicBearerToken();
    await tokenFromEnvironment();
    await tokenRefreshScenario();
    await tokenValidationScenario();
    await multiServiceTokens();
    await tokenWithCustomHeaders();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 All Bearer Token Authentication Examples completed successfully!');

  } catch (error) {
    console.error('\n💥 Examples failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runAllExamples();
}

export {
  staticBearerToken,
  dynamicBearerToken,
  tokenFromEnvironment,
  tokenRefreshScenario,
  tokenValidationScenario,
  multiServiceTokens,
  tokenWithCustomHeaders
};