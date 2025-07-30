/**
 * RestifiedTS Playwright-Style Configuration Usage Examples
 * Demonstrating backward compatibility and new features
 */

import { RestifiedTS, defineConfig, runConfiguredTests } from 'restifiedts';

// =============================================
// EXAMPLE 1: Backward Compatible Usage (UNCHANGED)
// =============================================

// This continues to work exactly as before - no breaking changes
const oldStyleRestified = new RestifiedTS({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  auth: {
    type: 'bearer',
    token: 'your-token'
  }
});

// Use it the same way as always
async function oldStyleTest() {
  await oldStyleRestified
    .given()
      .header('Content-Type', 'application/json')
    .when()
      .get('/users/1')
      .execute()
    .then()
      .statusCode(200)
      .jsonPath('$.name', 'John Doe');
}

// =============================================
// EXAMPLE 2: New Playwright-Style Configuration
// =============================================

// Create restified.config.ts file (generated via CLI)
const playwrightStyleConfig = defineConfig({
  // Test Discovery
  testDir: './tests',
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  
  // Execution Settings  
  fullyParallel: true,
  workers: process.env.CI ? 4 : '50%',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  
  // Multiple Service Projects
  projects: [
    {
      name: 'user-service',
      baseURL: 'https://api.example.com/users',
      auth: { type: 'bearer', token: process.env.USER_TOKEN }
    },
    {
      name: 'auth-service', 
      baseURL: 'https://auth.example.com',
      auth: { type: 'oauth2', clientId: process.env.AUTH_CLIENT_ID }
    }
  ],
  
  // Enterprise Features
  enterprise: {
    roles: ['admin', 'manager', 'user'],
    dataGeneration: true,
    performanceTracking: true
  }
});

// =============================================
// EXAMPLE 3: New RestifiedTS.create() Method
// =============================================

async function newStyleTest() {
  // Automatically loads restified.config.ts
  const restified = await RestifiedTS.create();
  
  // Use specific project client
  restified.useClient('user-service');
  
  await restified
    .given()
      .header('Content-Type', 'application/json')
    .when()
      .get('/profile')
      .execute()
    .then()
      .statusCode(200)
      .jsonPath('$.id', (id: number) => id > 0);
}

// =============================================
// EXAMPLE 4: Configuration Override
// =============================================

async function configOverrideTest() {
  // Load config but override specific settings
  const restified = await RestifiedTS.create({
    baseURL: 'https://staging.example.com', // Override config file
    timeout: 60000 // Override timeout
  });
  
  await restified
    .given()
      .variable('userId', '12345')
    .when()
      .get('/users/{{userId}}')
      .execute()
    .then()
      .statusCode(200);
}

// =============================================
// EXAMPLE 5: Multi-Project Test Execution
// =============================================

async function multiProjectTest() {
  // Run tests for all configured projects
  const result = await runConfiguredTests({
    parallel: true,
    workers: 4
  });
  
  console.log(`Total tests: ${result.totalTests}`);
  console.log(`Passed: ${result.totalPassed}`);
  console.log(`Failed: ${result.totalFailed}`);
  
  // Check individual project results
  for (const projectResult of result.projectResults) {
    console.log(`Project ${projectResult.projectName}: ${projectResult.success ? 'PASSED' : 'FAILED'}`);
  }
}

// =============================================
// EXAMPLE 6: Mixed Usage in Same Test File
// =============================================

describe('API Tests with Mixed Configuration', function() {
  let configuredRestified: RestifiedTS;
  let legacyRestified: RestifiedTS;
  
  before(async function() {
    // New style with config file
    configuredRestified = await RestifiedTS.create();
    
    // Old style for specific use case
    legacyRestified = new RestifiedTS({
      baseURL: 'https://legacy-api.example.com',
      timeout: 10000
    });
  });
  
  it('should work with new configuration system', async function() {
    configuredRestified.useClient('user-service');
    
    await configuredRestified
      .given()
        .header('Accept', 'application/json')
      .when()
        .get('/users')
        .execute()
      .then()
        .statusCode(200)
        .jsonPath('$.length', (length: number) => length > 0);
  });
  
  it('should work with legacy configuration', async function() {
    await legacyRestified
      .given()
        .header('Authorization', 'Bearer legacy-token')
      .when()
        .get('/status')
        .execute()
      .then()
        .statusCode(200);
  });
  
  after(async function() {
    await configuredRestified.cleanup();
    await legacyRestified.cleanup();
  });
});

// =============================================
// EXAMPLE 7: Enterprise Features Usage
// =============================================

async function enterpriseFeatureTest() {
  const restified = await RestifiedTS.create();
  
  // Role-based testing (configured in restified.config.ts)
  const roles = ['admin', 'manager', 'user'];
  
  for (const role of roles) {
    console.log(`Testing with role: ${role}`);
    
    // Switch to role-specific client/auth
    restified.useClient(`${role}-service`);
    
    await restified
      .given()
        .variable('role', role)
      .when()
        .get('/profile')
        .execute()
      .then()
        .statusCode(200)
        .jsonPath('$.role', role);
  }
}

// =============================================
// EXAMPLE 8: Migration Path
// =============================================

// Step 1: Generate config file
// npx restifiedts config-init --type enterprise

// Step 2: Gradually migrate tests
async function migrationExample() {
  // Old way (still works)
  const oldRestified = new RestifiedTS({ baseURL: 'https://api.example.com' });
  
  // New way (with benefits)
  const newRestified = await RestifiedTS.create();
  
  // Both can coexist in the same test file
  // Migrate test by test at your own pace
}

export {
  oldStyleTest,
  newStyleTest,
  configOverrideTest,
  multiProjectTest,
  enterpriseFeatureTest,
  migrationExample
};