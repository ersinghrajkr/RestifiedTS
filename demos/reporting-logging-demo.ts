#!/usr/bin/env ts-node

/**
 * Comprehensive Reporting and Logging Demo
 * 
 * This demo showcases the complete logging and reporting system including:
 * - Multi-transport logging (console, file, memory, HTTP)
 * - Structured logging with metadata and context
 * - Test execution tracking and metrics
 * - Report generation in multiple formats (HTML, JSON, JUnit)
 * - Performance monitoring and analytics
 * - Notification system
 */

import { 
  RestifiedLogger, 
  TransportFactory, 
  LogLevel,
  ReportingManager,
  RestifiedReportGenerator,
  ReportFormat,
  TestStatus,
  TestSeverity,
  NotificationConfig
} from '../src/index';

async function demonstrateLoggingSystem() {
  console.log('\n=== RestifiedTS Logging System Demo ===');
  
  // 1. Create logger with multiple transports
  const logger = new RestifiedLogger({
    level: LogLevel.DEBUG,
    context: 'LoggingDemo',
    defaultMetadata: { version: '1.0.0', environment: 'demo' }
  });
  
  // Add file transport with rotation
  logger.addTransport(TransportFactory.createFile('logs/demo.log', {
    level: LogLevel.INFO,
    rotationPolicy: {
      maxSize: 1024 * 1024, // 1MB
      maxFiles: 3,
      compressionEnabled: true,
      retentionDays: 7
    }
  }));
  
  // Add memory transport for testing
  const memoryTransport = TransportFactory.createMemory({
    level: LogLevel.TRACE,
    maxEntries: 100
  });
  logger.addTransport(memoryTransport);
  
  // Add HTTP transport for remote logging
  logger.addTransport(TransportFactory.createHttp('https://httpbin.org/post', {
    level: LogLevel.ERROR,
    batchSize: 5,
    batchTimeout: 3000,
    headers: { 'X-Service': 'RestifiedTS' }
  }));
  
  // 2. Demonstrate structured logging
  logger.info('Demo started', { 
    action: 'demo_start',
    timestamp: new Date().toISOString()
  });
  
  // Child logger with additional context
  const childLogger = logger.child('APITest', { testId: 'TEST-001' });
  childLogger.debug('Preparing API test', { endpoint: '/users', method: 'GET' });
  
  // 3. Performance timing
  const timer = logger.startTimer('api_request');
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 250));
  
  timer.end('API request completed', LogLevel.INFO);
  
  // 4. Error logging
  try {
    throw new Error('Simulated API error');
  } catch (error) {
    logger.error('API request failed', error as Error, {
      endpoint: '/users',
      statusCode: 500,
      retryCount: 0
    });
  }
  
  // 5. Log sampling configuration
  logger.configureSampling({
    enabled: true,
    rate: 0.1, // Sample 10% of logs
    rules: [
      { level: LogLevel.ERROR, rate: 1.0 }, // Always log errors
      { level: LogLevel.DEBUG, rate: 0.05 } // Sample 5% of debug logs
    ]
  });
  
  // 6. Buffering configuration
  logger.configureBuffering({
    enabled: true,
    size: 10,
    flushInterval: 1000,
    flushOnLevel: LogLevel.ERROR,
    flushOnShutdown: true
  });
  
  // Generate multiple log entries
  for (let i = 0; i < 15; i++) {
    logger.debug(`Debug message ${i}`, { iteration: i });
    if (i % 5 === 0) {
      logger.info(`Info message ${i}`, { milestone: true });
    }
  }
  
  // 7. Show memory transport contents
  console.log('\\n--- Memory Transport Contents ---');
  const entries = memoryTransport.getEntries();
  console.log(`Total entries: ${entries.length}`);
  console.log(`Error entries: ${memoryTransport.getEntriesByLevel(LogLevel.ERROR).length}`);
  console.log(`Info entries: ${memoryTransport.getEntriesByLevel(LogLevel.INFO).length}`);
  
  await logger.flush();
  console.log('✓ Logging system demonstration completed');
}

async function demonstrateReportingSystem() {
  console.log('\\n=== RestifiedTS Reporting System Demo ===');
  
  // 1. Create reporting manager
  const reportingManager = new ReportingManager();
  
  // 2. Configure notifications
  const notificationConfig: NotificationConfig = {
    enabled: true,
    channels: [
      {
        type: 'log',
        config: {},
        events: ['test_failed', 'execution_completed'],
        conditions: [
          { field: 'status', operator: 'eq', value: TestStatus.FAILED }
        ]
      },
      {
        type: 'webhook',
        config: { url: 'https://httpbin.org/post' },
        events: ['execution_completed'],
        conditions: [
          { field: 'globalStatistics.successRate', operator: 'lt', value: 80 }
        ]
      }
    ]
  };
  
  reportingManager.configureNotifications(notificationConfig);
  
  // 3. Start test execution
  const executionId = await reportingManager.startExecution(
    'API Integration Test Suite',
    'Comprehensive API testing with multiple endpoints'
  );
  
  console.log(`Started execution: ${executionId}`);
  
  // 4. Start test suite
  const suiteId = await reportingManager.startSuite(
    'User Management API',
    'Tests for user CRUD operations'
  );
  
  // 5. Add test cases
  const testCases = [
    { name: 'Get Users List', shouldPass: true },
    { name: 'Create New User', shouldPass: true },
    { name: 'Update User Profile', shouldPass: false },
    { name: 'Delete User', shouldPass: true },
    { name: 'Get User by ID', shouldPass: true }
  ];
  
  for (const testCase of testCases) {
    const testId = await reportingManager.startTest(
      testCase.name,
      `Test case for ${testCase.name.toLowerCase()}`,
      TestSeverity.MAJOR
    );
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    
    // Add test steps
    await reportingManager.addStep(
      'Send HTTP Request',
      TestStatus.PASSED,
      []
    );
    
    await reportingManager.addStep(
      'Validate Response',
      testCase.shouldPass ? TestStatus.PASSED : TestStatus.FAILED,
      [],
      testCase.shouldPass ? undefined : new Error('Validation failed')
    );
    
    // Log HTTP request/response
    await reportingManager.logHttpRequest(
      {
        method: 'GET',
        url: '/api/users',
        headers: { 'Authorization': 'Bearer token123' },
        data: null
      },
      testCase.shouldPass ? {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        data: [{ id: 1, name: 'John Doe' }],
        responseTime: Math.random() * 200 + 50
      } : {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' },
        data: { error: 'Database connection failed' },
        responseTime: Math.random() * 1000 + 100
      }
    );
    
    // Complete test
    await reportingManager.endTest(
      testCase.shouldPass ? TestStatus.PASSED : TestStatus.FAILED,
      testCase.shouldPass ? undefined : new Error('Test assertion failed')
    );
    
    console.log(`✓ Completed test: ${testCase.name}`);
  }
  
  // 6. End test suite
  await reportingManager.endSuite();
  console.log('✓ Completed test suite');
  
  // 7. End execution
  const executionResult = await reportingManager.endExecution();
  console.log('✓ Completed test execution');
  
  console.log('\\n--- Execution Summary ---');
  console.log(`Total tests: ${executionResult.globalStatistics.total}`);
  console.log(`Passed: ${executionResult.globalStatistics.passed}`);
  console.log(`Failed: ${executionResult.globalStatistics.failed}`);
  console.log(`Success rate: ${executionResult.globalStatistics.successRate.toFixed(1)}%`);
  console.log(`Duration: ${executionResult.duration}ms`);
  
  // 8. Generate reports
  const reportConfig = {
    format: [ReportFormat.HTML, ReportFormat.JSON, ReportFormat.JUNIT],
    outputDirectory: './reports',
    filename: 'api-test-report',
    includeAttachments: true,
    includeEnvironment: true,
    includeHistoricalData: false,
    includeTrends: false,
    includePerformanceMetrics: true,
    includeDetailedSteps: true,
    includeMetadata: true,
    customProperties: {
      project: 'RestifiedTS Demo',
      version: '1.0.0'
    },
    branding: {
      title: 'RestifiedTS Test Report',
      company: 'RestifiedTS Framework'
    }
  };
  
  const reports = await reportingManager.generateReports(reportConfig);
  
  console.log('\\n--- Generated Reports ---');
  reports.forEach(report => {
    console.log(`${report.format.toUpperCase()}: ${report.filename} (${report.size} bytes)`);
  });
  
  await reportingManager.flush();
  await reportingManager.close();
  
  console.log('✓ Reporting system demonstration completed');
}

async function demonstrateAnalytics() {
  console.log('\\n=== RestifiedTS Analytics Demo ===');
  
  // This would typically be implemented with a real metrics collector
  // For demo purposes, we'll show the structure
  
  console.log('Analytics capabilities include:');
  console.log('• Test execution trends and patterns');
  console.log('• Performance metrics and monitoring');
  console.log('• Flaky test detection');
  console.log('• Error pattern analysis');
  console.log('• Test stability scoring');
  console.log('• Coverage analysis');
  console.log('• Dashboard data aggregation');
  console.log('• Historical data tracking');
  
  console.log('✓ Analytics demonstration completed');
}

async function main() {
  try {
    await demonstrateLoggingSystem();
    await demonstrateReportingSystem();
    await demonstrateAnalytics();
    
    console.log('\\n🎉 RestifiedTS Logging and Reporting Demo completed successfully!');
    console.log('\\nKey features demonstrated:');
    console.log('✓ Multi-transport logging system');
    console.log('✓ Structured logging with metadata');
    console.log('✓ Performance monitoring and timing');
    console.log('✓ Test execution tracking');
    console.log('✓ Multi-format report generation');
    console.log('✓ Notification system');
    console.log('✓ Analytics capabilities');
    console.log('✓ Error handling and debugging');
    
  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}