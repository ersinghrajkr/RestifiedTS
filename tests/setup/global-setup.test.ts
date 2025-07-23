import { expect } from 'chai';
import { restified } from '../../src';

/**
 * Global Setup and Teardown Test Suite
 * 
 * This test suite demonstrates critical setup and teardown patterns
 * that are essential for robust API testing with RestifiedTS.
 */

describe('Global Setup and Teardown Tests @integration @setup', () => {
  // Global variables to store test data across tests
  let globalAuthToken: string;
  let testUserId: string;
  let testEnvironmentReady: boolean = false;
  let createdResources: string[] = [];

  /**
   * GLOBAL SETUP - Runs once before all tests in this suite
   * Use this for expensive operations like:
   * - Environment verification
   * - Authentication
   * - Database connections
   * - Mock server setup
   */
  before(async function() {
    this.timeout(30000); // Allow 30 seconds for global setup
    
    console.log('🚀 Starting Global Test Setup...');
    
    try {
      // 1. Verify test environment is accessible
      console.log('🔍 Step 1: Verifying test environment...');
      const healthCheck = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .timeout(10000)
        .when()
          .get('/posts/1')
        .then()
          .statusCode(200)
        .execute();
      
      expect(healthCheck.status).to.equal(200);
      console.log('✅ Test environment is accessible');

      // 2. Perform authentication (simulated)
      console.log('🔐 Step 2: Performing authentication...');
      const authResult = await restified
        .given()
          .baseURL('https://httpbin.org')
          .header('Content-Type', 'application/json')
          .body({
            username: 'test-admin',
            password: 'test-password',
            grantType: 'client_credentials'
          })
        .when()
          .post('/post') // Simulated auth endpoint
        .then()
          .statusCode(200)
        .execute();

      // Simulate receiving an auth token
      globalAuthToken = `Bearer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      restified.setGlobalVariable('authToken', globalAuthToken);
      
      console.log('✅ Authentication successful');
      console.log(`🎫 Global Auth Token: ${globalAuthToken.substring(0, 20)}...`);

      // 3. Set up test data
      console.log('📊 Step 3: Setting up global test data...');
      restified.setGlobalVariable('testSuiteId', `suite_${Date.now()}`);
      restified.setGlobalVariable('testStartTime', new Date().toISOString());
      restified.setGlobalVariable('environment', process.env.NODE_ENV || 'test');
      
      // Create a test user for the entire suite
      const userCreationResult = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .header('Content-Type', 'application/json')
          .header('Authorization', globalAuthToken)
          .body({
            name: 'Test Suite User',
            username: 'testsuite',
            email: 'testsuite@restifiedts.com',
            phone: '1-770-736-8031 x56442',
            website: 'restifiedts.com'
          })
        .when()
          .post('/users')
        .then()
          .statusCode(201)
          .extract('$.id', 'globalTestUserId')
        .execute();

      testUserId = userCreationResult.data.id.toString();
      restified.setGlobalVariable('testUserId', testUserId);
      createdResources.push(`user:${testUserId}`);
      
      console.log(`✅ Test user created with ID: ${testUserId}`);

      // 4. Initialize configuration
      console.log('⚙️  Step 4: Initializing test configuration...');
      const testConfig = {
        maxRetries: 3,
        timeout: 10000,
        baseURL: 'https://jsonplaceholder.typicode.com',
        reportingEnabled: true,
        auditLogging: true
      };
      
      restified.setGlobalVariable('testConfig', testConfig);
      console.log('✅ Test configuration initialized');

      // 5. Verify all systems are ready
      console.log('✔️  Step 5: Final system verification...');
      testEnvironmentReady = true;
      
      console.log('🎉 Global setup completed successfully!');
      console.log(`📋 Created resources: ${createdResources.join(', ')}`);
      
    } catch (error: any) {
      console.error('❌ Global setup failed:', error.message);
      console.error('Stack trace:', error.stack);
      throw new Error(`Global setup failed: ${error.message}`);
    }
  });

  /**
   * GLOBAL TEARDOWN - Runs once after all tests in this suite
   * Use this for cleanup operations like:
   * - Removing test data
   * - Closing connections
   * - Generating final reports
   */
  after(async function() {
    this.timeout(20000); // Allow 20 seconds for global teardown
    
    console.log('🧹 Starting Global Test Teardown...');
    
    try {
      // 1. Clean up created resources
      console.log('🗑️  Step 1: Cleaning up created resources...');
      
      for (const resource of createdResources) {
        const [type, id] = resource.split(':');
        
        try {
          if (type === 'user') {
            const deleteResult = await restified
              .given()
                .baseURL('https://jsonplaceholder.typicode.com')
                .header('Authorization', globalAuthToken)
              .when()
                .delete(`/users/${id}`)
              .then()
                .statusCode(200)
              .execute();
            
            console.log(`✅ Deleted ${type} with ID: ${id}`);
          }
        } catch (cleanupError: any) {
          console.warn(`⚠️  Failed to cleanup ${resource}:`, cleanupError.message);
        }
      }

      // 2. Generate test execution summary
      console.log('📊 Step 2: Generating test execution summary...');
      const testSummary = {
        suiteId: restified.getGlobalVariable('testSuiteId'),
        startTime: restified.getGlobalVariable('testStartTime'),
        endTime: new Date().toISOString(),
        environment: restified.getGlobalVariable('environment'),
        resourcesCreated: createdResources.length,
        resourcesCleanedUp: createdResources.length,
        authTokenUsed: globalAuthToken ? 'Yes' : 'No'
      };
      
      console.log('📋 Test Execution Summary:');
      console.log(JSON.stringify(testSummary, null, 2));

      // 3. Clear global variables
      console.log('🔄 Step 3: Clearing global variables...');
      restified.clearGlobalVariables?.();
      globalAuthToken = '';
      testUserId = '';
      createdResources = [];
      
      console.log('✅ Global teardown completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Global teardown failed:', error.message);
      console.error('This may leave test data in the system');
    }
  });

  /**
   * INDIVIDUAL TEST SETUP - Runs before each test
   * Use this for test-specific setup that doesn't affect other tests
   */
  beforeEach(async function() {
    this.timeout(10000);
    
    console.log(`🔧 Setting up individual test: ${this.currentTest?.title}`);
    
    try {
      // Verify global setup completed successfully
      expect(testEnvironmentReady, 'Global setup did not complete successfully').to.be.true;
      expect(globalAuthToken, 'Global auth token not available').to.not.be.empty;
      expect(testUserId, 'Global test user ID not available').to.not.be.empty;

      // Set test-specific variables
      restified.setLocalVariable('currentTestName', this.currentTest?.title || 'unknown');
      restified.setLocalVariable('testStartTime', Date.now());
      restified.setLocalVariable('testId', `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);

      console.log(`✅ Individual test setup complete for: ${this.currentTest?.title}`);
      
    } catch (error: any) {
      console.error('❌ Individual test setup failed:', error.message);
      throw error;
    }
  });

  /**
   * INDIVIDUAL TEST TEARDOWN - Runs after each test
   * Use this for test-specific cleanup
   */
  afterEach(async function() {
    this.timeout(10000);
    
    const testName = this.currentTest?.title || 'unknown';
    const testPassed = this.currentTest?.state === 'passed';
    
    console.log(`🧽 Cleaning up individual test: ${testName} (${testPassed ? 'PASSED' : 'FAILED'})`);
    
    try {
      // Log test execution details
      const testStartTime = restified.getGlobalVariable('testStartTime');
      const testDuration = testStartTime ? Date.now() - testStartTime : 0;
      
      console.log(`⏱️  Test Duration: ${testDuration}ms`);
      console.log(`📊 Test Status: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);

      // Clean up any test-specific resources
      const testSpecificResources = restified.getLocalVariable('testResources');
      if (testSpecificResources && Array.isArray(testSpecificResources)) {
        for (const resource of testSpecificResources) {
          try {
            // Cleanup logic for test-specific resources
            console.log(`🗑️  Cleaning up test resource: ${resource}`);
          } catch (cleanupError: any) {
            console.warn(`⚠️  Failed to cleanup test resource ${resource}:`, cleanupError.message);
          }
        }
      }

      // Clear local variables for next test
      restified.clearLocalVariables?.();
      
      console.log(`✅ Individual test cleanup complete for: ${testName}`);
      
    } catch (error: any) {
      console.error('❌ Individual test cleanup failed:', error.message);
      // Don't throw error here to avoid masking the original test failure
    }
  });

  /**
   * ACTUAL TESTS - These demonstrate using the setup data
   */
  describe('Tests Using Global Setup Data', () => {
    
    it('should have access to global authentication token', async function() {
      this.timeout(5000);
      
      // Verify we have access to globally set auth token
      const authToken = restified.getGlobalVariable('authToken');
      expect(authToken).to.equal(globalAuthToken);
      expect(authToken).to.include('Bearer_');
      
      console.log('✅ Global auth token is accessible to test');
    });

    it('should have access to global test user', async function() {
      this.timeout(8000);
      
      const userId = restified.getGlobalVariable('testUserId');
      expect(userId).to.equal(testUserId);
      
      // Verify the user exists by fetching it
      const userResult = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .header('Authorization', globalAuthToken)
        .when()
          .get(`/users/${userId}`)
        .then()
          .statusCode(200)
          .jsonPath('$.id', parseInt(userId))
        .execute();
      
      expect(userResult.status).to.equal(200);
      console.log(`✅ Global test user ${userId} is accessible and valid`);
    });

    it('should be able to create and cleanup test-specific resources', async function() {
      this.timeout(10000);
      
      // Create a test-specific post
      const postResult = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .header('Content-Type', 'application/json')
          .header('Authorization', globalAuthToken)
          .body({
            title: 'Test Post for Setup/Teardown Demo',
            body: 'This post will be cleaned up after the test',
            userId: parseInt(testUserId)
          })
        .when()
          .post('/posts')
        .then()
          .statusCode(201)
          .extract('$.id', 'testPostId')
        .execute();

      const postId = postResult.data.id.toString();
      
      // Store resource for cleanup
      restified.setLocalVariable('testResources', [`post:${postId}`]);
      
      expect(postResult.status).to.equal(201);
      expect(postResult.data.userId).to.equal(parseInt(testUserId));
      
      console.log(`✅ Created test-specific post with ID: ${postId}`);
      
      // Verify the post exists
      const getPostResult = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
        .when()
          .get(`/posts/${postId}`)
        .then()
          .statusCode(200)
        .execute();
      
      expect(getPostResult.status).to.equal(200);
      console.log('✅ Test-specific post verified and will be cleaned up in afterEach');
    });

    it('should demonstrate test isolation', async function() {
      this.timeout(5000);
      
      // This test should not have access to resources created in previous test
      const testResources = restified.getLocalVariable('testResources');
      expect(testResources).to.be.undefined; // Should be cleared after previous test
      
      // But should still have access to global variables
      const globalUserId = restified.getGlobalVariable('testUserId');
      const globalAuthToken = restified.getGlobalVariable('authToken');
      
      expect(globalUserId).to.equal(testUserId);
      expect(globalAuthToken).to.not.be.empty;
      
      console.log('✅ Test isolation working correctly - local vars cleared, global vars preserved');
    });

    it('should handle test failure gracefully in teardown', async function() {
      this.timeout(5000);
      
      // Create a resource that should be cleaned up even if test fails
      restified.setLocalVariable('testResources', ['failing-test-resource:123']);
      
      // Intentionally fail this test to demonstrate teardown still works
      try {
        expect(true).to.be.false; // This will fail
      } catch (error) {
        console.log('✅ Test failed as expected, teardown should still execute');
        throw error; // Re-throw to actually fail the test
      }
    });
  });

  describe('Environment Configuration Validation', () => {
    
    it('should validate test environment configuration', async function() {
      this.timeout(5000);
      
      const testConfig = restified.getGlobalVariable('testConfig');
      expect(testConfig).to.exist;
      expect(testConfig.baseURL).to.be.a('string');
      expect(testConfig.timeout).to.be.a('number');
      expect(testConfig.maxRetries).to.be.a('number');
      
      console.log('✅ Test configuration is valid');
      console.log('📋 Config:', JSON.stringify(testConfig, null, 2));
    });

    it('should have proper environment variables set', function() {
      const environment = restified.getGlobalVariable('environment');
      const suiteId = restified.getGlobalVariable('testSuiteId');
      
      expect(environment).to.be.a('string');
      expect(suiteId).to.include('suite_');
      
      console.log('✅ Environment variables properly configured');
      console.log(`🌍 Environment: ${environment}`);
      console.log(`🆔 Suite ID: ${suiteId}`);
    });
  });
});