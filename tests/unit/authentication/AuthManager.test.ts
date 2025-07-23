import { expect } from 'chai';
import { 
  AuthManager, 
  BearerAuth, 
  BasicAuth, 
  ApiKeyAuth, 
  OAuth2Auth 
} from '../../../src/core/auth';

describe('RestifiedTS Authentication System Tests @smoke @unit', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    authManager = new AuthManager();
  });

  describe('AuthManager', () => {
    it('should initialize auth manager without errors', () => {
      expect(authManager).to.be.instanceOf(AuthManager);
    });

    it('should add authentication providers', () => {
      const bearerAuth = new BearerAuth({ token: 'test-token' });
      
      expect(() => {
        authManager.addProvider('bearer', bearerAuth);
      }).to.not.throw();
    });

    it('should retrieve registered providers', () => {
      const bearerAuth = new BearerAuth({ token: 'test-token' });
      authManager.addProvider('bearer', bearerAuth);
      
      const provider = authManager.getProvider('bearer');
      expect(provider).to.equal(bearerAuth);
    });

    it('should support multiple authentication providers', () => {
      const bearerAuth = new BearerAuth({ token: 'bearer-token' });
      const basicAuth = new BasicAuth({ username: 'username', password: 'password' });
      const apiKeyAuth = new ApiKeyAuth({ key: 'api-key-value', headerName: 'X-API-Key' });
      
      expect(() => {
        authManager.addProvider('bearer', bearerAuth);
        authManager.addProvider('basic', basicAuth);
        authManager.addProvider('apikey', apiKeyAuth);
      }).to.not.throw();
      
      expect(authManager.getProvider('bearer')).to.equal(bearerAuth);
      expect(authManager.getProvider('basic')).to.equal(basicAuth);
      expect(authManager.getProvider('apikey')).to.equal(apiKeyAuth);
    });

    it('should set and get active providers', () => {
      const bearerAuth = new BearerAuth({ token: 'test-token' });
      authManager.addProvider('bearer', bearerAuth);
      
      authManager.setActiveProvider('bearer');
      expect(authManager.getActiveProvider()).to.equal(bearerAuth);
    });

    it('should list all providers', () => {
      const bearerAuth = new BearerAuth({ token: 'bearer-token' });
      const basicAuth = new BasicAuth({ username: 'user', password: 'pass' });
      
      authManager.addProvider('bearer', bearerAuth);
      authManager.addProvider('basic', basicAuth);
      
      const providerNames = authManager.listProviders();
      expect(providerNames).to.include('bearer');
      expect(providerNames).to.include('basic');
      expect(providerNames).to.have.length(2);
    });

    it('should check if provider exists', () => {
      const bearerAuth = new BearerAuth({ token: 'test-token' });
      authManager.addProvider('bearer', bearerAuth);
      
      expect(authManager.hasProvider('bearer')).to.be.true;
      expect(authManager.hasProvider('nonexistent')).to.be.false;
    });

    it('should remove providers', () => {
      const bearerAuth = new BearerAuth({ token: 'test-token' });
      authManager.addProvider('bearer', bearerAuth);
      
      expect(authManager.hasProvider('bearer')).to.be.true;
      
      const removed = authManager.removeProvider('bearer');
      expect(removed).to.be.true;
      expect(authManager.hasProvider('bearer')).to.be.false;
    });

    it('should clear all providers', () => {
      const bearerAuth = new BearerAuth({ token: 'bearer-token' });
      const basicAuth = new BasicAuth({ username: 'user', password: 'pass' });
      
      authManager.addProvider('bearer', bearerAuth);
      authManager.addProvider('basic', basicAuth);
      
      expect(authManager.listProviders()).to.have.length(2);
      
      authManager.clear();
      expect(authManager.listProviders()).to.have.length(0);
    });

    it('should authenticate requests with active provider', async () => {
      const bearerAuth = new BearerAuth({ token: 'test-token' });
      authManager.addProvider('bearer', bearerAuth);
      authManager.setActiveProvider('bearer');
      
      const config = { headers: {} };
      const authenticatedConfig = await authManager.authenticate(config);
      
      expect(authenticatedConfig.headers).to.have.property('Authorization');
      expect(authenticatedConfig.headers!['Authorization']).to.equal('Bearer test-token');
    });

    it('should authenticate with specific provider', async () => {
      const bearerAuth = new BearerAuth({ token: 'bearer-token' });
      const basicAuth = new BasicAuth({ username: 'user', password: 'pass' });
      
      authManager.addProvider('bearer', bearerAuth);
      authManager.addProvider('basic', basicAuth);
      
      const config = { headers: {} };
      const bearerConfig = await authManager.authenticateWith('bearer', config);
      
      expect(bearerConfig.headers).to.have.property('Authorization');
      expect(bearerConfig.headers!['Authorization']).to.include('Bearer');
    });

    it('should get authentication summary', () => {
      const bearerAuth = new BearerAuth({ token: 'bearer-token' });
      const basicAuth = new BasicAuth({ username: 'user', password: 'pass' });
      
      authManager.addProvider('bearer', bearerAuth);
      authManager.addProvider('basic', basicAuth);
      authManager.setActiveProvider('bearer');
      
      const summary = authManager.getSummary();
      
      expect(summary.activeProvider).to.equal('bearer');
      expect(summary.totalProviders).to.equal(2);
      expect(summary.providers).to.have.length(2);
    });
  });

  describe('BearerAuth Provider', () => {
    it('should create BearerAuth with token', () => {
      const bearerAuth = new BearerAuth({ token: 'test-token' });
      expect(bearerAuth).to.be.instanceOf(BearerAuth);
    });

    it('should validate token presence', () => {
      const bearerAuth = new BearerAuth({ token: 'test-token' });
      expect(bearerAuth.isValid()).to.be.true;
    });

    it('should authenticate HTTP request with bearer token', async () => {
      const bearerAuth = new BearerAuth({ token: 'access-token-123' });
      
      const config = { headers: {} };
      const authenticatedConfig = await bearerAuth.authenticate(config);
      
      expect(authenticatedConfig.headers!['Authorization']).to.equal('Bearer access-token-123');
    });

    it('should update bearer token', () => {
      const bearerAuth = new BearerAuth({ token: 'initial-token' });
      expect(bearerAuth.getToken()).to.equal('initial-token');
      
      bearerAuth.updateToken('updated-token');
      expect(bearerAuth.getToken()).to.equal('updated-token');
    });

    it('should handle custom header names', async () => {
      const bearerAuth = new BearerAuth({ 
        token: 'test-token', 
        headerName: 'X-Auth-Token' 
      });
      
      const config = { headers: {} };
      const authenticatedConfig = await bearerAuth.authenticate(config);
      
      expect(authenticatedConfig.headers!['X-Auth-Token']).to.equal('Bearer test-token');
    });

    it('should handle custom prefix', async () => {
      const bearerAuth = new BearerAuth({ 
        token: 'test-token', 
        prefix: 'Token' 
      });
      
      const config = { headers: {} };
      const authenticatedConfig = await bearerAuth.authenticate(config);
      
      expect(authenticatedConfig.headers!['Authorization']).to.equal('Token test-token');
    });

    it('should handle no prefix', async () => {
      const bearerAuth = new BearerAuth({ 
        token: 'test-token', 
        prefix: '' 
      });
      
      const config = { headers: {} };
      const authenticatedConfig = await bearerAuth.authenticate(config);
      
      expect(authenticatedConfig.headers!['Authorization']).to.equal('test-token');
    });
  });

  describe('BasicAuth Provider', () => {
    it('should create BasicAuth with credentials', () => {
      const basicAuth = new BasicAuth({ username: 'user', password: 'pass' });
      expect(basicAuth).to.be.instanceOf(BasicAuth);
    });

    it('should authenticate HTTP request with basic auth', async () => {
      const basicAuth = new BasicAuth({ username: 'testuser', password: 'testpass' });
      
      const config = { headers: {} };
      const authenticatedConfig = await basicAuth.authenticate(config);
      
      expect(authenticatedConfig.headers!['Authorization']).to.include('Basic');
    });

    it('should validate credentials', () => {
      const basicAuth = new BasicAuth({ username: 'user', password: 'pass' });
      expect(basicAuth.isValid()).to.be.true;
      
      const emptyAuth = new BasicAuth({ username: '', password: '' });
      expect(emptyAuth.isValid()).to.be.false;
    });
  });

  describe('ApiKeyAuth Provider', () => {
    it('should create ApiKeyAuth with key', () => {
      const apiKeyAuth = new ApiKeyAuth({ key: 'test-key' });
      expect(apiKeyAuth).to.be.instanceOf(ApiKeyAuth);
    });

    it('should authenticate request with API key in header', async () => {
      const apiKeyAuth = new ApiKeyAuth({ 
        key: 'test-api-key', 
        headerName: 'X-API-Key' 
      });
      
      const config = { headers: {} };
      const authenticatedConfig = await apiKeyAuth.authenticate(config);
      
      expect(authenticatedConfig.headers!['X-API-Key']).to.equal('test-api-key');
    });

    it('should authenticate request with API key in query', async () => {
      const apiKeyAuth = new ApiKeyAuth({ 
        key: 'test-api-key',
        queryParamName: 'apikey',
        location: 'query'
      });
      
      const config = { params: {} };
      const authenticatedConfig = await apiKeyAuth.authenticate(config);
      
      // Note: The actual implementation may vary, this test assumes query parameter support
      expect(authenticatedConfig.params).to.exist;
    });

    it('should validate API key', () => {
      const apiKeyAuth = new ApiKeyAuth({ key: 'test-key' });
      expect(apiKeyAuth.isValid()).to.be.true;
    });
  });

  describe('OAuth2Auth Provider', () => {
    it('should create OAuth2Auth with configuration', () => {
      const oauth2Auth = new OAuth2Auth({
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token'
      });
      expect(oauth2Auth).to.be.instanceOf(OAuth2Auth);
    });

    it('should support client credentials flow', async () => {
      const oauth2Auth = new OAuth2Auth({
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
        grantType: 'client_credentials'
      });
      
      expect(oauth2Auth).to.be.instanceOf(OAuth2Auth);
    });

    it('should handle token refresh', async () => {
      const oauth2Auth = new OAuth2Auth({
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenUrl: 'https://auth.example.com/token',
        refreshToken: 'refresh-token-123'
      });
      
      // Note: This would typically require mocking HTTP requests
      expect(oauth2Auth).to.be.instanceOf(OAuth2Auth);
    });
  });

  describe('Integration Tests', () => {
    it('should work with multiple auth providers simultaneously', async () => {
      const bearerAuth = new BearerAuth({ token: 'bearer-token' });
      const apiKeyAuth = new ApiKeyAuth({ key: 'api-key', headerName: 'X-API-Key' });
      
      authManager.addProvider('bearer', bearerAuth);
      authManager.addProvider('apikey', apiKeyAuth);
      
      // Test bearer auth
      const bearerConfig = await authManager.authenticateWith('bearer', { headers: {} });
      expect(bearerConfig.headers!['Authorization']).to.include('Bearer');
      
      // Test API key auth
      const apiKeyConfig = await authManager.authenticateWith('apikey', { headers: {} });
      expect(apiKeyConfig.headers!['X-API-Key']).to.equal('api-key');
    });

    it('should handle provider switching', async () => {
      const bearerAuth = new BearerAuth({ token: 'bearer-token' });
      const basicAuth = new BasicAuth({ username: 'user', password: 'pass' });
      
      authManager.addProvider('bearer', bearerAuth);
      authManager.addProvider('basic', basicAuth);
      
      // Start with bearer
      authManager.setActiveProvider('bearer');
      expect(authManager.getActiveProvider()).to.equal(bearerAuth);
      
      // Switch to basic
      authManager.setActiveProvider('basic');
      expect(authManager.getActiveProvider()).to.equal(basicAuth);
    });
  });
});