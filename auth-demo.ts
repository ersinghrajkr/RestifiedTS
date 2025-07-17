/**
 * Authentication Demo for RestifiedTS
 */

import { AuthManager, BearerAuth, BasicAuth, ApiKeyAuth, OAuth2Auth } from './src/core/auth';
import { AxiosRequestConfig } from 'axios';

async function runAuthDemo() {
  console.log('🔐 Starting RestifiedTS Authentication Demo\n');
  
  try {
    // Create authentication manager
    const authManager = new AuthManager();
    
    // 1. Bearer Token Authentication
    console.log('1. Testing Bearer Token Authentication');
    const bearerAuth = AuthManager.createBearerAuth('my-secret-token', 'Authorization', 'Bearer');
    authManager.addProvider('bearer', bearerAuth);
    
    let config: AxiosRequestConfig = { headers: {} };
    config = await authManager.authenticateWith('bearer', config);
    console.log('Bearer Auth Result:', config.headers);
    console.log('Bearer Auth Valid:', authManager.isProviderValid('bearer'));
    console.log();
    
    // 2. Basic Authentication
    console.log('2. Testing Basic Authentication');
    const basicAuth = AuthManager.createBasicAuth('user123', 'password456');
    authManager.addProvider('basic', basicAuth);
    
    config = { headers: {} };
    config = await authManager.authenticateWith('basic', config);
    console.log('Basic Auth Result:', (config as any).auth);
    console.log('Basic Auth Valid:', authManager.isProviderValid('basic'));
    console.log();
    
    // 3. API Key Authentication (Header)
    console.log('3. Testing API Key Authentication (Header)');
    const apiKeyAuth = AuthManager.createApiKeyAuth('abc123def456', 'X-API-Key', 'header');
    authManager.addProvider('apikey-header', apiKeyAuth);
    
    config = { headers: {} };
    config = await authManager.authenticateWith('apikey-header', config);
    console.log('API Key (Header) Result:', config.headers);
    console.log();
    
    // 4. API Key Authentication (Query)
    console.log('4. Testing API Key Authentication (Query)');
    const apiKeyQueryAuth = new ApiKeyAuth({ 
      key: 'query-key-789', 
      location: 'query',
      queryParamName: 'api_key'
    });
    authManager.addProvider('apikey-query', apiKeyQueryAuth);
    
    config = { params: {}, headers: {} };
    config = await authManager.authenticateWith('apikey-query', config);
    console.log('API Key (Query) Result:', (config as any).params);
    console.log();
    
    // 5. OAuth2 Authentication (mock client credentials)
    console.log('5. Testing OAuth2 Authentication (Setup Only)');
    const oauth2Auth = AuthManager.createOAuth2Auth({
      clientId: 'my-client-id',
      clientSecret: 'my-client-secret',
      tokenUrl: 'https://example.com/oauth/token',
      scope: 'read write',
      grantType: 'client_credentials'
    });
    
    // Set a mock token for testing (normally this would be fetched)
    oauth2Auth.setAccessToken('mock-oauth2-access-token', 3600);
    authManager.addProvider('oauth2', oauth2Auth);
    
    config = { headers: {} };
    config = await authManager.authenticateWith('oauth2', config);
    console.log('OAuth2 Auth Result:', config.headers);
    console.log('OAuth2 Token Valid:', authManager.isProviderValid('oauth2'));
    console.log();
    
    // 6. Authentication Manager Summary
    console.log('6. Authentication Manager Summary');
    const summary = authManager.getSummary();
    console.log('Summary:', JSON.stringify(summary, null, 2));
    console.log();
    
    // 7. Test Active Provider
    console.log('7. Testing Active Provider');
    authManager.setActiveProvider('bearer');
    console.log('Active Provider:', authManager.getActiveProvider()?.name);
    
    config = { headers: {} };
    config = await authManager.authenticate(config);
    console.log('Active Provider Auth Result:', config.headers);
    console.log();
    
    // 8. Test Provider Management
    console.log('8. Testing Provider Management');
    console.log('Providers before removal:', authManager.listProviders());
    authManager.removeProvider('basic');
    console.log('Providers after removing basic:', authManager.listProviders());
    console.log();
    
    console.log('✅ Authentication Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Authentication Demo failed:', error);
  }
}

// Run the demo
runAuthDemo();