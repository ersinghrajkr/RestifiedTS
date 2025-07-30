/**
 * K6 TypeScript Integration Examples
 * Demonstrating native TypeScript support in K6 with RestifiedTS
 */

import { K6Integration, K6Config } from '../src/performance/K6Integration';
import { PerformanceEngine, UnifiedTestConfig } from '../src/performance/PerformanceEngine';

// =============================================
// EXAMPLE 1: TypeScript K6 Script Generation
// =============================================

async function generateTypedK6Script() {
  const k6 = new K6Integration();
  
  // Generate a TypeScript K6 script (not JavaScript)
  const typescriptScript = k6.convertRestifiedTestToK6TypeScript({
    name: 'Typed API Test',
    baseUrl: 'https://api.example.com',
    endpoints: [
      { 
        path: '/users', 
        method: 'GET', 
        expectedStatus: 200,
        headers: { 'Accept': 'application/json' }
      },
      { 
        path: '/users', 
        method: 'POST', 
        body: { name: 'John Doe', email: 'john@example.com' },
        expectedStatus: 201
      }
    ],
    authentication: {
      type: 'bearer',
      credentials: { username: 'admin', password: 'admin123' }
    }
  });
  
  console.log('Generated TypeScript K6 Script:');
  console.log(typescriptScript);
  
  // This will generate something like:
  /*
  import http from 'k6/http';
  import { check, sleep } from 'k6';
  import { Rate, Trend, Counter } from 'k6/metrics';
  import { Options } from 'k6/options';

  // Custom metrics
  const errorRate = new Rate('errors');
  const responseTime = new Trend('response_time');
  const requestCount = new Counter('requests');

  export function setup(): { token: string } {
    const loginResponse = http.post('https://api.example.com/auth/login', JSON.stringify({"username":"admin","password":"admin123"}), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    check(loginResponse, {
      'login successful': (r) => r.status === 200,
      'token received': (r) => r.json('token') !== undefined
    });
    
    return { token: loginResponse.json('token') };
  }

  export default function(data: { token: string }) {
    requestCount.add(1);
    const startTime = Date.now();
    
    const headers = {
      'Authorization': `Bearer ${data.token}`,
      'Content-Type': 'application/json'
    };
    
    // Test GET /users
    const response0 = http.get('https://api.example.com/users', { headers: {"Authorization":`Bearer ${data.token}`,"Content-Type":"application/json","Accept":"application/json"} });
    
    check(response0, {
      'GET /users status is 200': (r) => r.status === 200,
      'GET /users response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(response0.status !== 200);
    responseTime.add(response0.timings.duration);
    
    sleep(Math.random() * 2 + 1); // Random think time 1-3 seconds
    
    // Test POST /users
    const response1 = http.post('https://api.example.com/users', {"name":"John Doe","email":"john@example.com"}, { headers: {"Authorization":`Bearer ${data.token}`,"Content-Type":"application/json"} });
    
    check(response1, {
      'POST /users status is 201': (r) => r.status === 201,
      'POST /users response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(response1.status !== 201);
    responseTime.add(response1.timings.duration);
    
    const endTime = Date.now();
    responseTime.add(endTime - startTime);
  }
  */
}

// =============================================
// EXAMPLE 2: Running TypeScript K6 Tests
// =============================================

async function runTypedK6Test() {
  const k6 = new K6Integration();
  
  // Check K6 availability and TypeScript support
  const k6Available = await k6.checkK6Availability();
  if (!k6Available) {
    console.error('❌ K6 is not available. Install it from: https://k6.io/docs/getting-started/installation/');
    return;
  }
  
  console.log('✅ K6 is available with TypeScript support!');
  
  // Generate TypeScript test script
  const tsScript = k6.convertRestifiedTestToK6TypeScript({
    name: 'TypeScript Load Test',
    baseUrl: 'https://httpbin.org',
    endpoints: [
      { path: '/get', method: 'GET', expectedStatus: 200 },
      { path: '/post', method: 'POST', body: { test: 'data' }, expectedStatus: 200 },
      { path: '/headers', method: 'GET', expectedStatus: 200 }
    ]
  });
  
  // Create load test configuration
  const loadConfig: K6Config = {
    scenarios: {
      typescript_load_test: {
        executor: 'ramping-vus',
        stages: [
          { duration: '30s', target: 5 },
          { duration: '1m', target: 10 },
          { duration: '30s', target: 0 }
        ]
      }
    },
    thresholds: {
      http_req_duration: [{ threshold: 'p(95)<2000' }],
      http_req_failed: [{ threshold: 'rate<0.01' }]
    }
  };
  
  // Run the TypeScript K6 test
  const testId = await k6.runK6Test(tsScript, loadConfig, {
    useTypeScript: true, // Explicitly enable TypeScript mode
    tags: { 
      test_type: 'typescript_demo',
      framework: 'restifiedts'
    }
  });
  
  console.log(`🚀 Started TypeScript K6 test: ${testId}`);
  
  // Listen for test completion
  k6.on('test:completed', (result) => {
    console.log('✅ TypeScript K6 test completed!');
    
    const report = k6.generatePerformanceReport(testId);
    if (report) {
      console.log('\n📊 Performance Report:');
      console.log(`Total Requests: ${report.summary.totalRequests}`);
      console.log(`Average Response Time: ${report.summary.averageResponseTime}ms`);
      console.log(`Error Rate: ${report.summary.errorRate.toFixed(2)}%`);
      console.log(`Grade: ${report.grade}`);
      
      if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
    }
  });
  
  k6.on('test:failed', (data) => {
    console.error('❌ TypeScript K6 test failed:', data.error);
  });
}

// =============================================
// EXAMPLE 3: Advanced TypeScript Features
// =============================================

async function advancedTypedK6Features() {
  const k6 = new K6Integration();
  
  // Create a more complex TypeScript test with modern ES6+ features
  const advancedTsScript = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { Options } from 'k6/options';

// TypeScript interface for API response
interface UserResponse {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface ApiError {
  error: string;
  code: number;
  message: string;
}

// Custom metrics with strong typing
const errorRate = new Rate('api_errors');
const responseTime = new Trend('response_duration');
const userCreations = new Counter('users_created');

// Configuration with TypeScript support
export const options: Options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 20 },
    { duration: '1m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    api_errors: ['rate<0.005']
  }
};

// Setup function with proper typing
export function setup(): { token: string; baseUrl: string } {
  const loginData = {
    username: 'test_user',
    password: 'secure_password'
  };
  
  const loginResponse = http.post('https://api.example.com/auth/login', JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(loginResponse, {
    'authentication successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined
  });
  
  return {
    token: loginResponse.json('token') as string,
    baseUrl: 'https://api.example.com'
  };
}

// Main test function with TypeScript features
export default function(data: { token: string; baseUrl: string }): void {
  const startTime = performance.now();
  
  // Modern ES6+ features that K6 now supports
  const headers = {
    'Authorization': \`Bearer \${data.token}\`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  // Test user creation with TypeScript types
  const newUser = {
    name: \`Test User \${Math.random().toString(36).substring(7)}\`,
    email: \`test.\${Date.now()}@example.com\`,
    preferences: {
      theme: 'dark',
      notifications: true,
      ...{ beta_features: true } // Object spread
    }
  };
  
  const createResponse = http.post(
    \`\${data.baseUrl}/users\`,
    JSON.stringify(newUser),
    { headers }
  );
  
  const success = check(createResponse, {
    'user creation successful': (r) => r.status === 201,
    'response time acceptable': (r) => r.timings.duration < 1000,
    'valid user response': (r) => {
      try {
        const user = r.json() as UserResponse;
        return user.id > 0 && user.name === newUser.name;
      } catch {
        return false;
      }
    }
  });
  
  if (success) {
    userCreations.add(1);
    
    // Optional chaining (ES2020 feature)
    const userId = (createResponse.json() as UserResponse)?.id;
    
    if (userId) {
      // Test user retrieval
      const getResponse = http.get(\`\${data.baseUrl}/users/\${userId}\`, { headers });
      
      check(getResponse, {
        'user retrieval successful': (r) => r.status === 200,
        'user data consistent': (r) => {
          const user = r.json() as UserResponse;
          return user.email === newUser.email;
        }
      });
    }
  } else {
    errorRate.add(1);
    
    // Handle API errors with type safety
    try {
      const error = createResponse.json() as ApiError;
      console.log(\`API Error: \${error.message} (Code: \${error.code})\`);
    } catch {
      console.log('Unknown API error occurred');
    }
  }
  
  const endTime = performance.now();
  responseTime.add(endTime - startTime);
  
  // Random think time with modern syntax
  sleep(Math.random() * 2 + 1);
}

// Teardown function
export function teardown(data: { token: string; baseUrl: string }): void {
  console.log('Test completed, cleaning up resources...');
  
  // Logout or cleanup operations
  http.post(\`\${data.baseUrl}/auth/logout\`, null, {
    headers: { 'Authorization': \`Bearer \${data.token}\` }
  });
}
`;

  // Run the advanced TypeScript test
  const testId = await k6.runK6Test(advancedTsScript, {
    scenarios: {
      advanced_typescript: {
        executor: 'constant-vus',
        vus: 5,
        duration: '2m'
      }
    }
  }, {
    useTypeScript: true,
    tags: {
      test_type: 'advanced_typescript',
      features: 'es6_plus_optional_chaining_interfaces'
    }
  });
  
  console.log(`🚀 Started advanced TypeScript K6 test: ${testId}`);
}

// =============================================
// EXAMPLE 4: Unified Engine with TypeScript Preference
// =============================================

async function unifiedEngineWithTypeScript() {
  const performanceEngine = new PerformanceEngine();
  
  // Check engine availability
  const status = await performanceEngine.getEngineStatus();
  console.log('Engine Status:', status);
  
  if (status.k6.available) {
    console.log('✅ K6 with TypeScript support is available!');
    
    const testConfig: UnifiedTestConfig = {
      name: 'TypeScript-Powered Load Test',
      engine: 'k6', // Force K6 for TypeScript support
      baseUrl: 'https://jsonplaceholder.typicode.com',
      endpoints: [
        { path: '/posts', method: 'GET', expectedStatus: 200 },
        { path: '/posts/1', method: 'GET', expectedStatus: 200 },
        { path: '/posts', method: 'POST', body: { title: 'Test', body: 'Test content', userId: 1 } }
      ],
      scenarios: {
        load: true
      },
      thresholds: {
        responseTime: 1000,
        errorRate: 0.01,
        throughput: 5
      }
    };
    
    const testId = await performanceEngine.runPerformanceTest(testConfig);
    
    performanceEngine.on('test:completed', async () => {
      console.log('✅ TypeScript-powered performance test completed!');
      
      const report = await performanceEngine.generateUnifiedReport(testId);
      if (report) {
        console.log(`Performance Score: ${report.analysis.performanceScore}/100`);
        console.log(`Scalability: ${report.analysis.scalabilityAssessment}`);
      }
    });
  } else {
    console.log('⚠️  K6 not available, falling back to Artillery (JavaScript)');
  }
}

// =============================================
// EXAMPLE 5: K6 TypeScript Best Practices
// =============================================

function k6TypeScriptBestPractices() {
  console.log(`
🎯 K6 TypeScript Best Practices for RestifiedTS Integration:

✅ ADVANTAGES:
1. **Native TypeScript Support**: K6 v0.52+ runs .ts files directly
2. **Type Safety**: Catch errors at development time, not runtime
3. **IntelliSense**: Full IDE support with autocomplete and error detection
4. **Modern ES6+**: Optional chaining, object spread, private fields
5. **No Build Step**: Direct execution with --compatibility-mode=experimental_enhanced

✅ FEATURES AVAILABLE:
- Interface definitions for API responses
- Strongly typed metrics and options
- Optional chaining (?.) and nullish coalescing (??)
- Object spread operator and destructuring
- Private class fields and methods
- Async/await patterns
- Generic types and utility types

✅ RESTIFIEDTS INTEGRATION BENEFITS:
- Generate typed K6 scripts from RestifiedTS tests
- Maintain type safety across the entire testing pipeline
- Leverage TypeScript's ecosystem for better developer experience
- Consistent typing between functional tests and performance tests

📋 USAGE COMMANDS:
- Basic: k6 run --compatibility-mode=experimental_enhanced script.ts
- With output: k6 run --compatibility-mode=experimental_enhanced --out json=results.json script.ts
- Cloud: k6 cloud --compatibility-mode=experimental_enhanced script.ts

🚀 PERFORMANCE:
- TypeScript transpilation happens automatically
- No noticeable performance impact
- Full K6 optimization benefits maintained
- Compatible with all K6 extensions and cloud features
`);
}

// Export examples
export {
  generateTypedK6Script,
  runTypedK6Test,
  advancedTypedK6Features,
  unifiedEngineWithTypeScript,
  k6TypeScriptBestPractices
};