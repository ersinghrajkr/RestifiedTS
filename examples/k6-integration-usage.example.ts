/**
 * K6 Integration Usage Examples
 * Demonstrating RestifiedTS + K6 performance testing integration
 */

import { RestifiedTS } from 'restifiedts';
import { PerformanceEngine, UnifiedTestConfig } from '../src/performance/PerformanceEngine';
import { K6Integration } from '../src/performance/K6Integration';

// =============================================
// EXAMPLE 1: Unified Performance Engine Usage
// =============================================

async function runUnifiedPerformanceTest() {
  // Create performance engine with auto-detection
  const performanceEngine = new PerformanceEngine();
  
  // Check available engines
  const engineStatus = await performanceEngine.getEngineStatus();
  console.log('Available Performance Engines:', engineStatus);
  
  // Define unified test configuration
  const testConfig: UnifiedTestConfig = {
    name: 'API Load Test',
    engine: 'auto', // Will auto-select K6 if available, fallback to Artillery
    baseUrl: 'https://api.example.com',
    endpoints: [
      { path: '/users', method: 'GET', expectedStatus: 200 },
      { path: '/posts', method: 'GET', expectedStatus: 200 },
      { path: '/posts', method: 'POST', body: { title: 'Test', content: 'Test content' } }
    ],
    authentication: {
      type: 'bearer',
      credentials: { username: 'test', password: 'test123' }
    },
    scenarios: {
      load: true // Run standard load test
    },
    thresholds: {
      responseTime: 2000, // 95th percentile < 2 seconds
      errorRate: 0.01,    // Error rate < 1%
      throughput: 10      // At least 10 RPS
    }
  };
  
  // Run the test
  const testId = await performanceEngine.runPerformanceTest(testConfig);
  console.log(`Started performance test: ${testId}`);
  
  // Listen for events
  performanceEngine.on('test:progress', (data) => {
    console.log(`Test ${data.testId} progress:`, data.output);
  });
  
  performanceEngine.on('test:completed', async (data) => {
    console.log(`Test ${data.testId} completed!`);
    
    // Generate comprehensive report
    const report = await performanceEngine.generateUnifiedReport(testId);
    if (report) {
      console.log('Performance Score:', report.analysis.performanceScore);
      console.log('Bottlenecks:', report.analysis.bottlenecks);
      console.log('Recommendations:', report.analysis.recommendations);
    }
  });
  
  performanceEngine.on('test:failed', (data) => {
    console.error(`Test ${data.testId} failed:`, data.error);
  });
}

// =============================================
// EXAMPLE 2: Direct K6 Integration
// =============================================

async function runDirectK6Test() {
  const k6 = new K6Integration();
  
  // Check if K6 is available
  const k6Available = await k6.checkK6Availability();
  if (!k6Available) {
    console.error('K6 is not installed or not available in PATH');
    return;
  }
  
  // Convert RestifiedTS test to K6 script
  const k6Script = k6.convertRestifiedTestToK6({
    name: 'User API Test',
    baseUrl: 'https://jsonplaceholder.typicode.com',
    endpoints: [
      { path: '/users/1', method: 'GET', expectedStatus: 200 },
      { path: '/posts/1', method: 'GET', expectedStatus: 200 }
    ],
    authentication: {
      type: 'bearer',
      credentials: { username: 'test', password: 'test' }
    }
  });
  
  console.log('Generated K6 Script:');
  console.log(k6Script);
  
  // Create load test scenarios
  const scenarios = k6.createLoadTestScenarios();
  
  // Run smoke test
  const testId = await k6.runK6Test(k6Script, scenarios.smoke);
  console.log(`Started K6 test: ${testId}`);
  
  k6.on('test:completed', (result) => {
    console.log('K6 Test completed!');
    
    // Generate performance report
    const report = k6.generatePerformanceReport(testId);
    if (report) {
      console.log('Performance Summary:', report.summary);
      console.log('Grade:', report.grade);
      console.log('Recommendations:', report.recommendations);
    }
  });
}

// =============================================
// EXAMPLE 3: Multiple Scenario Testing
// =============================================

async function runMultipleScenarios() {
  const performanceEngine = new PerformanceEngine();
  
  const baseConfig: Omit<UnifiedTestConfig, 'scenarios' | 'name'> = {
    engine: 'k6',
    baseUrl: 'https://api.example.com',
    endpoints: [
      { path: '/health', method: 'GET' },
      { path: '/users', method: 'GET' },
      { path: '/orders', method: 'GET' }
    ],
    authentication: {
      type: 'bearer',
      credentials: { username: 'admin', password: 'admin123' }
    },
    thresholds: {
      responseTime: 5000,
      errorRate: 0.1
    }
  };
  
  // Run different types of tests
  const testScenarios = [
    { name: 'Smoke Test', scenarios: { smoke: true } },
    { name: 'Load Test', scenarios: { load: true } },
    { name: 'Stress Test', scenarios: { stress: true } },
    { name: 'Spike Test', scenarios: { spike: true } }
  ];
  
  const testResults: string[] = [];
  
  for (const scenario of testScenarios) {
    console.log(`\n🚀 Starting ${scenario.name}...`);
    
    const testConfig: UnifiedTestConfig = {
      ...baseConfig,
      name: scenario.name,
      scenarios: scenario.scenarios
    };
    
    const testId = await performanceEngine.runPerformanceTest(testConfig);
    testResults.push(testId);
    
    // Wait for test completion before starting next
    await new Promise((resolve) => {
      performanceEngine.once('test:completed', resolve);
      performanceEngine.once('test:failed', resolve);
    });
  }
  
  // Generate summary report for all tests
  console.log('\n📊 Test Summary:');
  for (const testId of testResults) {
    const report = await performanceEngine.generateUnifiedReport(testId);
    if (report) {
      console.log(`${report.summary.config.name}: Score ${report.analysis.performanceScore}/100`);
    }
  }
}

// =============================================
// EXAMPLE 4: RestifiedTS + Performance Integration
// =============================================

async function integratedApiAndPerformanceTest() {
  // First, run functional API tests
  console.log('🧪 Running functional API tests...');
  
  const restified = await RestifiedTS.create({
    baseURL: 'https://jsonplaceholder.typicode.com',
    timeout: 30000
  });
  
  // Functional test to validate API works
  await restified
    .given()
      .header('Content-Type', 'application/json')
    .when()
      .get('/users/1')
      .execute()
    .then()
      .statusCode(200)
      .jsonPath('$.id', 1)
      .jsonPath('$.name', (name: string) => typeof name === 'string');
  
  console.log('✅ Functional tests passed!');
  
  // Now run performance tests on the same endpoints
  console.log('📈 Running performance tests...');
  
  const performanceEngine = new PerformanceEngine();
  
  const perfTestConfig: UnifiedTestConfig = {
    name: 'JSONPlaceholder Performance Test',
    engine: 'auto',
    baseUrl: 'https://jsonplaceholder.typicode.com',
    endpoints: [
      { path: '/users/1', method: 'GET', expectedStatus: 200 },
      { path: '/posts/1', method: 'GET', expectedStatus: 200 },
      { path: '/albums/1', method: 'GET', expectedStatus: 200 }
    ],
    scenarios: {
      load: true
    },
    thresholds: {
      responseTime: 1000, // Public API should be fast
      errorRate: 0.001,   // Very low error tolerance
      throughput: 5       // Reasonable for public API
    }
  };
  
  const testId = await performanceEngine.runPerformanceTest(perfTestConfig);
  
  performanceEngine.on('test:completed', async () => {
    const report = await performanceEngine.generateUnifiedReport(testId);
    if (report) {
      console.log('\n📊 Performance Test Results:');
      console.log(`Performance Score: ${report.analysis.performanceScore}/100`);
      console.log(`Average Response Time: ${report.summary.metrics.averageResponseTime}ms`);
      console.log(`95th Percentile: ${report.summary.metrics.p95ResponseTime}ms`);
      console.log(`Requests/Second: ${report.summary.metrics.requestsPerSecond}`);
      console.log(`Error Rate: ${(report.summary.metrics.errorRate * 100).toFixed(2)}%`);
      
      if (report.analysis.bottlenecks.length > 0) {
        console.log('\n⚠️  Bottlenecks Identified:');
        report.analysis.bottlenecks.forEach(bottleneck => {
          console.log(`  - ${bottleneck}`);
        });
      }
      
      if (report.analysis.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.analysis.recommendations.forEach(rec => {
          console.log(`  - ${rec}`);
        });
      }
    }
    
    // Cleanup
    await restified.cleanup();
  });
}

// =============================================
// EXAMPLE 5: Configuration-Driven Performance Testing
// =============================================

async function configDrivenPerformanceTest() {
  // Load configuration from restified.config.ts
  const restified = await RestifiedTS.create();
  
  // Use performance configuration from config file
  const performanceEngine = new PerformanceEngine();
  
  // This would read from the performance section of restified.config.ts
  const configFromFile = {
    name: 'Config-Driven Test',
    engine: 'k6' as const,
    baseUrl: process.env.API_BASE_URL || 'https://api.example.com',
    endpoints: [
      { path: '/api/v1/users', method: 'GET' },
      { path: '/api/v1/orders', method: 'GET' },
      { path: '/api/v1/products', method: 'GET' }
    ],
    authentication: {
      type: 'bearer' as const,
      credentials: { token: process.env.API_TOKEN }
    },
    scenarios: {
      load: true
    },
    thresholds: {
      responseTime: parseInt(process.env.PERF_RESPONSE_TIME_THRESHOLD || '2000'),
      errorRate: parseFloat(process.env.PERF_ERROR_RATE_THRESHOLD || '0.01'),
      throughput: parseInt(process.env.PERF_THROUGHPUT_THRESHOLD || '10')
    }
  };
  
  const testId = await performanceEngine.runPerformanceTest(configFromFile);
  
  performanceEngine.on('test:completed', async () => {
    console.log('✅ Configuration-driven performance test completed');
    
    const report = await performanceEngine.generateUnifiedReport(testId);
    if (report) {
      // Export results for CI/CD
      const ciResults = {
        passed: report.analysis.performanceScore >= 80,
        score: report.analysis.performanceScore,
        metrics: report.summary.metrics,
        thresholds: report.summary.thresholds
      };
      
      // Could write to file for CI/CD consumption
      console.log('CI/CD Results:', JSON.stringify(ciResults, null, 2));
    }
  });
}

// Export examples for usage
export {
  runUnifiedPerformanceTest,
  runDirectK6Test,
  runMultipleScenarios,
  integratedApiAndPerformanceTest,
  configDrivenPerformanceTest
};