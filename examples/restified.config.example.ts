/**
 * RestifiedTS Configuration Example
 * Playwright-inspired configuration for comprehensive API testing
 */

import { defineConfig } from 'restifiedts';

export default defineConfig({
  // Test Discovery
  testDir: './tests',
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  testIgnore: ['**/node_modules/**', '**/dist/**'],
  
  // Execution Settings
  fullyParallel: true,
  workers: process.env.CI ? 4 : '50%',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,
  
  // Global Setup/Teardown
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  
  // Reporting
  reporter: [
    ['html', { outputFolder: 'reports/html', open: !process.env.CI }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list'],
    process.env.CI ? ['github'] : null
  ].filter(Boolean),
  
  // Multiple Service Projects
  projects: [
    {
      name: 'user-service',
      baseURL: process.env.USER_SERVICE_URL || 'https://api.example.com/users',
      testMatch: '**/user-service/**/*.test.ts',
      auth: {
        type: 'bearer',
        token: process.env.USER_SERVICE_TOKEN
      },
      timeout: 30000,
      retries: 1
    },
    {
      name: 'auth-service',
      baseURL: process.env.AUTH_SERVICE_URL || 'https://auth.example.com',
      testMatch: '**/auth-service/**/*.test.ts',
      auth: {
        type: 'oauth2',
        clientId: process.env.AUTH_CLIENT_ID,
        clientSecret: process.env.AUTH_CLIENT_SECRET
      },
      timeout: 15000,
      retries: 2
    },
    {
      name: 'order-service',
      baseURL: process.env.ORDER_SERVICE_URL || 'https://orders.example.com',
      testMatch: '**/order-service/**/*.test.ts',
      auth: {
        type: 'apikey',
        apiKey: process.env.ORDER_API_KEY,
        apiKeyHeader: 'X-API-Key'
      }
    }
  ],
  
  // Enterprise Features
  enterprise: {
    roles: ['admin', 'manager', 'user', 'guest'],
    dataGeneration: true,
    boundaryTesting: true,
    performanceTracking: true,
    securityTesting: true,
    loadBalancing: 'round-robin',
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 60000
    }
  },
  
  // Database Configuration
  database: {
    connections: {
      primary: {
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME || 'test_db',
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      },
      redis: {
        type: 'redis',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        database: '0'
      }
    }
  },
  
  // GraphQL Configuration
  graphql: {
    endpoint: process.env.GRAPHQL_ENDPOINT || '/graphql',
    timeout: 30000,
    introspection: process.env.NODE_ENV !== 'production'
  },
  
  // WebSocket Configuration
  webSocket: {
    timeout: 10000,
    pingInterval: 30000
  },
  
  // Performance Testing
  performance: {
    thresholds: {
      responseTime: 1000,
      throughput: 100,
      errorRate: 0.01
    },
    artillery: {
      enabled: true,
      configFile: './performance/artillery.yml'
    }
  },
  
  // Security Testing
  security: {
    zap: {
      enabled: process.env.SECURITY_TESTING === 'true',
      proxyHost: 'localhost',
      proxyPort: 8080
    },
    scans: {
      sqlInjection: true,
      xss: true,
      authBypass: true
    }
  },
  
  // Advanced Options
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    variables: {
      environment: process.env.NODE_ENV || 'test',
      version: process.env.API_VERSION || 'v1',
      region: process.env.AWS_REGION || 'us-east-1'
    }
  },
  
  // Expect Configuration
  expect: {
    timeout: 5000,
    interval: 100
  }
});