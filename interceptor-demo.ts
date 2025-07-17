/**
 * Interceptor and Plugin System Demo for RestifiedTS
 * 
 * This demo showcases the comprehensive interceptor and plugin system
 * including request/response interception, built-in interceptors, and plugin management.
 */

import {
  InterceptorManager,
  PluginManager,
  InterceptorPluginSystem,
  BuiltInInterceptorFactory,
  InterceptorPhase,
  InterceptorPriority,
  PluginCapability,
  PluginStatus,
  BuiltInInterceptorType
} from './src/interceptors';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

// Sample plugin services
const sampleServices = {
  httpClient: { request: async (config: any) => ({ data: 'mock response' }) },
  variableStore: { get: (key: string) => `value_${key}`, set: (key: string, value: any) => {} },
  responseStore: { store: (key: string, response: any) => {}, get: (key: string) => null },
  assertionManager: { assert: (type: string, actual: any, expected: any) => ({ success: true }) },
  logger: console,
  config: { timeout: 30000 }
};

// Sample request config
const sampleRequestConfig: AxiosRequestConfig = {
  method: 'GET',
  url: 'https://api.example.com/users',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
};

// Sample response
const sampleResponse: AxiosResponse = {
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'application/json',
    'x-response-time': '123ms'
  },
  data: {
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ]
  },
  config: sampleRequestConfig
};

async function runInterceptorDemo() {
  console.log('🔌 Starting RestifiedTS Interceptor and Plugin System Demo\n');

  try {
    // 1. Interceptor Manager Demo
    console.log('1. Testing Interceptor Manager');
    
    const interceptorManager = new InterceptorManager({
      enabled: true,
      priority: InterceptorPriority.NORMAL,
      maxRetries: 3,
      timeout: 30000,
      preserveOrder: true
    });

    // Create custom request interceptor
    const customRequestInterceptor = {
      name: 'customRequest',
      priority: InterceptorPriority.HIGH,
      enabled: true,
      description: 'Custom request interceptor for demo',
      phase: InterceptorPhase.REQUEST,
      execute: async (config: AxiosRequestConfig) => {
        console.log('  ✓ Custom request interceptor executed');
        config.headers = { ...config.headers, 'X-Custom-Header': 'demo-value' };
        return config;
      }
    };

    // Create custom response interceptor
    const customResponseInterceptor = {
      name: 'customResponse',
      priority: InterceptorPriority.NORMAL,
      enabled: true,
      description: 'Custom response interceptor for demo',
      phase: InterceptorPhase.RESPONSE,
      execute: async (response: AxiosResponse) => {
        console.log('  ✓ Custom response interceptor executed');
        (response as any).processedAt = new Date().toISOString();
        return response;
      }
    };

    // Register interceptors
    interceptorManager.registerInterceptor(customRequestInterceptor);
    interceptorManager.registerInterceptor(customResponseInterceptor);

    // Execute request interceptors
    const modifiedConfig = await interceptorManager.executeRequestInterceptors(sampleRequestConfig);
    console.log('  ✓ Request interceptors executed successfully');
    console.log('  ✓ Added custom header:', modifiedConfig.headers?.['X-Custom-Header']);

    // Execute response interceptors
    const modifiedResponse = await interceptorManager.executeResponseInterceptors(sampleResponse);
    console.log('  ✓ Response interceptors executed successfully');
    console.log('  ✓ Added processed timestamp:', (modifiedResponse as any).processedAt);

    // Get statistics
    const stats = interceptorManager.getGlobalStatistics();
    console.log('  ✓ Interceptor statistics:', {
      totalExecutions: stats.totalExecutions,
      averageTime: `${stats.averageExecutionTime.toFixed(2)}ms`
    });

    console.log();

    // 2. Built-in Interceptors Demo
    console.log('2. Testing Built-in Interceptors');

    // Create built-in interceptors
    const requestLogger = BuiltInInterceptorFactory.createRequestLoggingInterceptor(console);
    const responseLogger = BuiltInInterceptorFactory.createResponseLoggingInterceptor(console);
    const timeoutInterceptor = BuiltInInterceptorFactory.createTimeoutInterceptor(15000);
    const userAgentInterceptor = BuiltInInterceptorFactory.createUserAgentInterceptor('RestifiedTS-Demo/1.0.0');
    const compressionInterceptor = BuiltInInterceptorFactory.createCompressionInterceptor(['gzip', 'deflate']);
    const retryInterceptor = BuiltInInterceptorFactory.createRetryInterceptor(3, 1000, 5000);
    const monitoringInterceptor = BuiltInInterceptorFactory.createMonitoringInterceptor();

    // Register built-in interceptors
    interceptorManager.registerInterceptor(requestLogger);
    interceptorManager.registerInterceptor(responseLogger);
    interceptorManager.registerInterceptor(timeoutInterceptor);
    interceptorManager.registerInterceptor(userAgentInterceptor);
    interceptorManager.registerInterceptor(compressionInterceptor);
    interceptorManager.registerInterceptor(retryInterceptor);
    interceptorManager.registerInterceptor(monitoringInterceptor);

    // Test request processing with built-in interceptors
    const processedConfig = await interceptorManager.executeRequestInterceptors({
      method: 'POST',
      url: 'https://api.example.com/data',
      data: { test: 'data' }
    });

    console.log('  ✓ Built-in interceptors processed request');
    console.log('  ✓ Added User-Agent:', processedConfig.headers?.['User-Agent']);
    console.log('  ✓ Added Accept-Encoding:', processedConfig.headers?.['Accept-Encoding']);
    console.log('  ✓ Set timeout:', processedConfig.timeout);

    // Test response processing
    const processedResponse = await interceptorManager.executeResponseInterceptors({
      ...sampleResponse,
      config: processedConfig
    });

    console.log('  ✓ Built-in interceptors processed response');
    console.log('  ✓ Added response time:', (processedResponse as any).responseTime);

    // Get monitoring metrics
    const metrics = monitoringInterceptor.getMetrics();
    console.log('  ✓ Monitoring metrics:', Object.keys(metrics).length, 'endpoints tracked');

    console.log();

    // 3. Plugin Manager Demo
    console.log('3. Testing Plugin Manager');

    const pluginManager = new PluginManager(
      interceptorManager,
      sampleServices,
      {
        autoLoadPlugins: false,
        pluginTimeout: 10000,
        enableStatistics: true,
        healthCheckInterval: 30000
      }
    );

    // Create sample plugin
    const samplePlugin = {
      name: 'demo-plugin',
      version: '1.0.0',
      description: 'Sample plugin for demonstration',
      author: 'RestifiedTS Demo',
      enabled: true,
      priority: InterceptorPriority.NORMAL,
      capabilities: [
        PluginCapability.REQUEST_INTERCEPTION,
        PluginCapability.RESPONSE_INTERCEPTION,
        PluginCapability.LOGGING
      ],
      
      initialize: async (context: any) => {
        console.log('  ✓ Plugin initialized:', context.pluginName);
      },
      
      activate: async () => {
        console.log('  ✓ Plugin activated');
      },
      
      deactivate: async () => {
        console.log('  ✓ Plugin deactivated');
      },
      
      healthCheck: async () => ({
        healthy: true,
        message: 'Plugin is running normally',
        lastChecked: new Date()
      }),
      
      interceptors: [
        {
          name: 'pluginRequestInterceptor',
          priority: InterceptorPriority.NORMAL,
          enabled: true,
          description: 'Plugin request interceptor',
          phase: InterceptorPhase.REQUEST,
          execute: async (config: AxiosRequestConfig) => {
            console.log('  ✓ Plugin request interceptor executed');
            config.headers = { ...config.headers, 'X-Plugin-Header': 'plugin-value' };
            return config;
          }
        },
        {
          name: 'pluginResponseInterceptor',
          priority: InterceptorPriority.NORMAL,
          enabled: true,
          description: 'Plugin response interceptor',
          phase: InterceptorPhase.RESPONSE,
          execute: async (response: AxiosResponse) => {
            console.log('  ✓ Plugin response interceptor executed');
            (response as any).pluginProcessed = true;
            return response;
          }
        }
      ]
    };

    // Register plugin
    await pluginManager.registerPlugin(samplePlugin);
    console.log('  ✓ Plugin registered successfully');

    // Check plugin status
    const pluginStatus = pluginManager.getPluginStatus('demo-plugin');
    console.log('  ✓ Plugin status:', pluginStatus);

    // Check plugin health
    const health = await pluginManager.checkPluginHealth('demo-plugin');
    console.log('  ✓ Plugin health:', health?.healthy ? 'Healthy' : 'Unhealthy');

    // Get plugin statistics
    const pluginStats = pluginManager.getPluginStatistics('demo-plugin');
    console.log('  ✓ Plugin statistics:', {
      executions: pluginStats?.interceptorExecutions || 0,
      errors: pluginStats?.errorCount || 0
    });

    console.log();

    // 4. Interceptor Plugin System Demo
    console.log('4. Testing Interceptor Plugin System');

    const system = new InterceptorPluginSystem(sampleServices, {
      enableBuiltInInterceptors: true,
      enabledBuiltInTypes: [
        BuiltInInterceptorType.LOGGING,
        BuiltInInterceptorType.TIMEOUT,
        BuiltInInterceptorType.USER_AGENT,
        BuiltInInterceptorType.MONITORING
      ],
      interceptors: {
        enabled: true,
        preserveOrder: true,
        timeout: 15000
      },
      plugins: {
        enableStatistics: true,
        healthCheckInterval: 60000
      }
    });

    // Initialize system
    await system.initialize();
    console.log('  ✓ System initialized successfully');

    // Register the demo plugin
    await system.registerPlugin(samplePlugin);
    console.log('  ✓ Plugin registered via system');

    // Execute full request/response cycle
    const systemConfig = await system.executeRequestInterceptors({
      method: 'GET',
      url: 'https://api.example.com/test',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('  ✓ System processed request');
    console.log('  ✓ Headers added:', Object.keys(systemConfig.headers || {}).length);

    const systemResponse = await system.executeResponseInterceptors({
      ...sampleResponse,
      config: systemConfig
    });

    console.log('  ✓ System processed response');
    console.log('  ✓ Plugin processed:', (systemResponse as any).pluginProcessed);

    // Get system summary
    const summary = system.getSummary();
    console.log('  ✓ System summary:', {
      interceptors: summary.interceptors.totalInterceptors,
      plugins: summary.plugins.totalPlugins,
      performance: `${summary.performance.averageInterceptorTime.toFixed(2)}ms avg`,
      healthy: summary.health.systemReady
    });

    console.log();

    // 5. Advanced Features Demo
    console.log('5. Testing Advanced Features');

    // Create rate limiting interceptor
    const rateLimiter = BuiltInInterceptorFactory.createRateLimitingInterceptor(5, 10000);
    system.registerInterceptor(rateLimiter);
    console.log('  ✓ Rate limiting interceptor registered');

    // Create cache interceptor
    const cacheInterceptor = BuiltInInterceptorFactory.createCacheInterceptor(60000);
    system.registerInterceptor(cacheInterceptor);
    console.log('  ✓ Cache interceptor registered');

    // Create validation interceptor
    const validationInterceptor = BuiltInInterceptorFactory.createRequestValidationInterceptor(
      (config) => {
        return !!(config.url && config.method);
      }
    );
    system.registerInterceptor(validationInterceptor);
    console.log('  ✓ Validation interceptor registered');

    // Test interceptor enabling/disabling
    const disabled = system.disableInterceptor('requestLogging');
    console.log('  ✓ Interceptor disabled:', disabled);

    const enabled = system.enableInterceptor('requestLogging');
    console.log('  ✓ Interceptor enabled:', enabled);

    // Test plugin capabilities
    const loggingPlugins = system.getPluginsByCapability(PluginCapability.LOGGING);
    console.log('  ✓ Logging plugins found:', loggingPlugins.length);

    const requestInterceptors = system.getInterceptorsByPhase(InterceptorPhase.REQUEST);
    console.log('  ✓ Request interceptors:', requestInterceptors.length);

    // Health check
    const systemHealth = await system.checkHealth();
    console.log('  ✓ System health:', systemHealth.healthy ? 'Healthy' : 'Unhealthy');

    console.log();

    // 6. Performance and Statistics Demo
    console.log('6. Testing Performance and Statistics');

    // Simulate multiple requests
    const testRequests = 10;
    const startTime = Date.now();

    for (let i = 0; i < testRequests; i++) {
      const testConfig = {
        method: 'GET' as const,
        url: `https://api.example.com/test/${i}`,
        headers: { 'Content-Type': 'application/json' }
      };

      const processedTestConfig = await system.executeRequestInterceptors(testConfig);
      const processedTestResponse = await system.executeResponseInterceptors({
        ...sampleResponse,
        config: processedTestConfig
      });
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log('  ✓ Performance test completed');
    console.log(`  ✓ Processed ${testRequests} requests in ${totalTime}ms`);
    console.log(`  ✓ Average time per request: ${(totalTime / testRequests).toFixed(2)}ms`);

    // Get final statistics
    const finalStats = system.getInterceptorManager().getGlobalStatistics();
    console.log('  ✓ Final statistics:', {
      totalExecutions: finalStats.totalExecutions,
      totalErrors: finalStats.totalErrors,
      successRate: `${((finalStats.totalExecutions - finalStats.totalErrors) / finalStats.totalExecutions * 100).toFixed(1)}%`
    });

    // Clear statistics
    system.clearStatistics();
    console.log('  ✓ Statistics cleared');

    console.log();

    // 7. Error Handling Demo
    console.log('7. Testing Error Handling');

    // Create error interceptor
    const errorInterceptor = {
      name: 'errorHandler',
      priority: InterceptorPriority.HIGH,
      enabled: true,
      description: 'Error handling interceptor',
      phase: InterceptorPhase.ERROR,
      execute: async (error: any) => {
        console.log('  ✓ Error interceptor handled error:', error.message);
        return { handled: true, originalError: error };
      },
      shouldHandle: (error: any) => error.message.includes('timeout')
    };

    system.registerInterceptor(errorInterceptor);

    // Simulate error handling
    try {
      await system.executeErrorInterceptors(new Error('Request timeout occurred'));
    } catch (error) {
      console.log('  ✓ Error handling completed');
    }

    console.log();

    // 8. Cleanup Demo
    console.log('8. Testing Cleanup');

    // Disable plugin
    await system.disablePlugin('demo-plugin');
    console.log('  ✓ Plugin disabled');

    // Unregister plugin
    await system.unregisterPlugin('demo-plugin');
    console.log('  ✓ Plugin unregistered');

    // Unregister interceptor
    system.unregisterInterceptor('customRequest');
    console.log('  ✓ Interceptor unregistered');

    // Destroy system
    await system.destroy();
    console.log('  ✓ System destroyed');

    console.log();
    console.log('✅ Interceptor and Plugin System Demo completed successfully!');
    console.log('');
    console.log('💡 Key Features Demonstrated:');
    console.log('1. Comprehensive interceptor management with priority-based execution');
    console.log('2. Built-in interceptors for common functionality (logging, auth, retry, etc.)');
    console.log('3. Plugin system with lifecycle management and health monitoring');
    console.log('4. Request/response processing pipeline with error handling');
    console.log('5. Performance monitoring and statistics collection');
    console.log('6. Flexible configuration and extensibility');
    console.log('7. Event-driven architecture for real-time monitoring');
    console.log('8. Graceful error handling and recovery mechanisms');

  } catch (error) {
    console.error('❌ Interceptor Demo failed:', error);
  }
}

// Run the demo
runInterceptorDemo();