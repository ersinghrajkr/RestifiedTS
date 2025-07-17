/**
 * Bearer Token Authentication Example
 *
 * This example demonstrates various ways to handle Bearer token authentication
 * including static tokens, dynamic tokens, and token refresh scenarios.
 */

import { RestifiedTS } from '../../src';

async function staticBearerToken() {
  console.log('🔐 Running Static Bearer Token Example');
  
  try {
    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
        .header('Content-Type', 'application/json')
      .when()
        .get('/protected/user/profile')
      .then()
        .statusCode(200)
        .jsonPath('$.id', (id: string) => id.length > 0)
        .jsonPath('$.name', (name: string) => name.length > 0)
        .jsonPath('$.email', (email: string) => email.includes('@'))
      .execute();

    console.log('✅ Static bearer token authentication successful');
    console.log('User profile:', response.data);
    
  } catch (error) {
    console.error('❌ Static bearer token authentication failed:', error);
  }
}

async function dynamicBearerToken() {
  console.log('🔐 Running Dynamic Bearer Token Example');
  
  try {
    // Step 1: Authenticate to get a token
    const authResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .body({
          username: 'testuser',
          password: 'testpass123'
        })
      .when()
        .post('/auth/login')
      .then()
        .statusCode(200)
        .jsonPath('$.access_token', (token: string) => token.length > 0)
        .jsonPath('$.token_type', 'Bearer')
        .jsonPath('$.expires_in', (expires: number) => expires > 0)
        .extract('$.access_token', 'authToken')
        .extract('$.refresh_token', 'refreshToken')
      .execute();

    const token = authResponse.extractedData.authToken;
    console.log('✅ Authentication successful, token acquired');

    // Step 2: Use the token for protected resource access
    const protectedResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Authorization', `Bearer ${token}`)
        .header('Content-Type', 'application/json')
      .when()
        .get('/protected/dashboard')
      .then()
        .statusCode(200)
        .jsonPath('$.data', (data: any) => data !== null)
        .jsonPath('$.user.authenticated', true)
        .jsonPath('$.permissions', (perms: string[]) => perms.length > 0)
      .execute();

    console.log('✅ Protected resource access successful');
    console.log('Dashboard data retrieved');
    
  } catch (error) {
    console.error('❌ Dynamic bearer token authentication failed:', error);
  }
}

async function tokenRefreshExample() {
  console.log('🔐 Running Token Refresh Example');
  
  try {
    // Step 1: Initial authentication
    const authResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .body({
          username: 'testuser',
          password: 'testpass123'
        })
      .when()
        .post('/auth/login')
      .then()
        .statusCode(200)
        .extract('$.access_token', 'accessToken')
        .extract('$.refresh_token', 'refreshToken')
      .execute();

    const accessToken = authResponse.extractedData.accessToken;
    const refreshToken = authResponse.extractedData.refreshToken;

    // Step 2: Use token until it expires (simulated)
    console.log('Using access token for API calls...');
    
    // Simulate token expiry by using an invalid/expired token
    try {
      await RestifiedTS
        .given()
          .baseURL('https://api.example.com')
          .header('Authorization', `Bearer expired_token`)
        .when()
          .get('/protected/data')
        .then()
          .statusCode(401)
          .jsonPath('$.error', 'invalid_token')
        .execute();
      
      console.log('🔄 Token expired, attempting refresh...');
    } catch (error) {
      console.log('💡 Token expiry detected, refreshing...');
    }

    // Step 3: Refresh the token
    const refreshResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .body({
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      .when()
        .post('/auth/refresh')
      .then()
        .statusCode(200)
        .jsonPath('$.access_token', (token: string) => token.length > 0)
        .jsonPath('$.token_type', 'Bearer')
        .extract('$.access_token', 'newAccessToken')
      .execute();

    const newAccessToken = refreshResponse.extractedData.newAccessToken;
    console.log('✅ Token refresh successful');

    // Step 4: Use new token
    const dataResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Authorization', `Bearer ${newAccessToken}`)
      .when()
        .get('/protected/data')
      .then()
        .statusCode(200)
        .jsonPath('$.data', (data: any) => data !== null)
      .execute();

    console.log('✅ API call with refreshed token successful');
    
  } catch (error) {
    console.error('❌ Token refresh example failed:', error);
  }
}

async function jwtTokenValidation() {
  console.log('🔐 Running JWT Token Validation Example');
  
  try {
    // Step 1: Get JWT token
    const authResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .body({
          username: 'testuser',
          password: 'testpass123'
        })
      .when()
        .post('/auth/login')
      .then()
        .statusCode(200)
        .extract('$.access_token', 'jwtToken')
      .execute();

    const jwtToken = authResponse.extractedData.jwtToken;

    // Step 2: Validate token format and claims
    const tokenParts = jwtToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    // Decode payload (base64)
    const payload = JSON.parse(atob(tokenParts[1]));
    console.log('🔍 JWT payload:', payload);

    // Step 3: Use token with validation
    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Authorization', `Bearer ${jwtToken}`)
        .variable('userId', payload.sub)
        .variable('userRole', payload.role)
      .when()
        .get('/protected/user/{{userId}}')
      .then()
        .statusCode(200)
        .jsonPath('$.id', payload.sub)
        .jsonPath('$.role', payload.role)
        .jsonPath('$.tokenValid', true)
      .execute();

    console.log('✅ JWT token validation successful');
    
  } catch (error) {
    console.error('❌ JWT token validation failed:', error);
  }
}

async function multipleTokensExample() {
  console.log('🔐 Running Multiple Tokens Example');
  
  try {
    // Different services might require different tokens
    const tokens = {
      userService: '',
      paymentService: '',
      notificationService: ''
    };

    // Get token for user service
    const userAuthResponse = await RestifiedTS
      .given()
        .baseURL('https://user-service.example.com')
        .header('Content-Type', 'application/json')
        .body({
          client_id: 'user-client',
          client_secret: 'user-secret',
          grant_type: 'client_credentials'
        })
      .when()
        .post('/oauth/token')
      .then()
        .statusCode(200)
        .extract('$.access_token', 'userToken')
      .execute();

    tokens.userService = userAuthResponse.extractedData.userToken;

    // Get token for payment service
    const paymentAuthResponse = await RestifiedTS
      .given()
        .baseURL('https://payment-service.example.com')
        .header('Content-Type', 'application/json')
        .body({
          client_id: 'payment-client',
          client_secret: 'payment-secret',
          grant_type: 'client_credentials'
        })
      .when()
        .post('/oauth/token')
      .then()
        .statusCode(200)
        .extract('$.access_token', 'paymentToken')
      .execute();

    tokens.paymentService = paymentAuthResponse.extractedData.paymentToken;

    // Use different tokens for different services
    const userResponse = await RestifiedTS
      .given()
        .baseURL('https://user-service.example.com')
        .header('Authorization', `Bearer ${tokens.userService}`)
      .when()
        .get('/users/123')
      .then()
        .statusCode(200)
        .jsonPath('$.id', '123')
      .execute();

    const paymentResponse = await RestifiedTS
      .given()
        .baseURL('https://payment-service.example.com')
        .header('Authorization', `Bearer ${tokens.paymentService}`)
      .when()
        .get('/payments/456')
      .then()
        .statusCode(200)
        .jsonPath('$.id', '456')
      .execute();

    console.log('✅ Multiple tokens example successful');
    console.log('User service token used for user data');
    console.log('Payment service token used for payment data');
    
  } catch (error) {
    console.error('❌ Multiple tokens example failed:', error);
  }
}

async function tokenWithCustomHeaders() {
  console.log('🔐 Running Token with Custom Headers Example');
  
  try {
    // Some APIs require additional headers along with the token
    const authResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .header('X-API-Version', '2.0')
        .header('X-Client-ID', 'mobile-app')
        .body({
          username: 'testuser',
          password: 'testpass123'
        })
      .when()
        .post('/auth/login')
      .then()
        .statusCode(200)
        .extract('$.access_token', 'token')
        .extract('$.user.id', 'userId')
      .execute();

    const token = authResponse.extractedData.token;
    const userId = authResponse.extractedData.userId;

    // Use token with custom headers
    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Authorization', `Bearer ${token}`)
        .header('X-API-Version', '2.0')
        .header('X-Client-ID', 'mobile-app')
        .header('X-User-ID', userId)
        .header('X-Request-ID', `req-${Date.now()}`)
        .header('X-Correlation-ID', `corr-${Date.now()}`)
      .when()
        .get('/protected/premium-features')
      .then()
        .statusCode(200)
        .jsonPath('$.features', (features: any[]) => features.length > 0)
        .jsonPath('$.userId', userId)
        .jsonPath('$.clientId', 'mobile-app')
      .execute();

    console.log('✅ Token with custom headers successful');
    console.log('Premium features accessed');
    
  } catch (error) {
    console.error('❌ Token with custom headers failed:', error);
  }
}

async function tokenExpiredHandling() {
  console.log('🔐 Running Token Expired Handling Example');
  
  try {
    // Simulate using an expired token
    const expiredToken = 'expired_jwt_token_here';
    
    try {
      await RestifiedTS
        .given()
          .baseURL('https://api.example.com')
          .header('Authorization', `Bearer ${expiredToken}`)
        .when()
          .get('/protected/data')
        .then()
          .statusCode(401)
          .jsonPath('$.error', 'token_expired')
          .jsonPath('$.message', (msg: string) => msg.includes('expired'))
        .execute();
      
      console.log('✅ Token expiry correctly detected');
    } catch (error) {
      console.log('🔄 Token expired, implementing refresh logic...');
    }

    // Implement automatic token refresh
    const refreshResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .body({
          refresh_token: 'valid_refresh_token',
          grant_type: 'refresh_token'
        })
      .when()
        .post('/auth/refresh')
      .then()
        .statusCode(200)
        .extract('$.access_token', 'newToken')
      .execute();

    const newToken = refreshResponse.extractedData.newToken;

    // Retry original request with new token
    const retryResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Authorization', `Bearer ${newToken}`)
      .when()
        .get('/protected/data')
      .then()
        .statusCode(200)
        .jsonPath('$.data', (data: any) => data !== null)
      .execute();

    console.log('✅ Token refresh and retry successful');
    
  } catch (error) {
    console.error('❌ Token expired handling failed:', error);
  }
}

// Run all examples
async function runAllExamples() {
  console.log('🎯 Starting Bearer Token Authentication Examples\n');
  
  await staticBearerToken();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await dynamicBearerToken();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await tokenRefreshExample();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await jwtTokenValidation();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await multipleTokensExample();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await tokenWithCustomHeaders();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await tokenExpiredHandling();
  
  console.log('\n🎉 All Bearer Token Authentication Examples Completed!');
}

// Execute if run directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  staticBearerToken,
  dynamicBearerToken,
  tokenRefreshExample,
  jwtTokenValidation,
  multipleTokensExample,
  tokenWithCustomHeaders,
  tokenExpiredHandling,
  runAllExamples
};