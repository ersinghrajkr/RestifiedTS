import { expect } from 'chai';
import { restified } from 'restifiedts';

describe('Global Test Setup @setup', () => {
  
  before(async function() {
    this.timeout(30000);
    console.log('🚀 Starting Global Test Setup...');
    
    // Environment verification
    if (!process.env.API_BASE_URL) {
      console.warn('⚠️  API_BASE_URL not set, using default');
    }
    
    // Global configuration
    restified.configure({
      timeout: 10000,
      retries: 2
    });
    
    console.log('✅ Global setup completed successfully');
  });

  after(async function() {
    this.timeout(10000);
    console.log('🧹 Starting Global Test Cleanup...');
    
    // Cleanup any global resources
    restified.reset();
    
    console.log('✅ Global cleanup completed successfully');
  });

  it('should verify test environment is ready', async function() {
    // Basic connectivity test
    try {
      await restified
        .given()
          .baseURL('https://httpbin.org')
        .when()
          .get('/status/200')
        .then()
          .statusCode(200)
        .execute();
        
      console.log('✅ Test environment connectivity verified');
    } catch (error) {
      console.warn('⚠️  Test environment connectivity issue:', error);
      this.skip();
    }
  });
});
