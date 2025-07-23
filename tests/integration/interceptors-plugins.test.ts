import { expect } from 'chai';
import { 
  InterceptorManager, 
  PluginManager, 
  InterceptorPluginSystem,
  BuiltInInterceptorFactory,
  AuthenticationInterceptor,
  RequestLoggingInterceptor,
  ResponseLoggingInterceptor,
  UserAgentInterceptor
} from '../../src/interceptors';
import { InterceptorContext, InterceptorPriority, InterceptorPhase } from '../../src/interceptors/InterceptorTypes';

describe('Interceptors and Plugins Integration Tests @integration @regression', () => {
  let interceptorManager: InterceptorManager;
  let pluginSystem: InterceptorPluginSystem;

  beforeEach(() => {
    interceptorManager = new InterceptorManager({});
    const mockServices = {
      httpClient: {},
      variableStore: {},
      responseStore: {},
      assertionManager: {},
      logger: { info: () => {}, error: () => {} },
      config: {}
    };
    pluginSystem = new InterceptorPluginSystem(mockServices);
  });

  describe('Request Interceptor Integration', () => {
    it('should execute request interceptors in order', async () => {
      const executionOrder: string[] = [];
      
      // Create custom interceptors that track execution order
      const firstInterceptor = {
        name: 'firstInterceptor',
        priority: InterceptorPriority.HIGH,
        enabled: true,
        description: 'First interceptor',
        phase: InterceptorPhase.REQUEST,
        execute: async (config: any, context: InterceptorContext) => {
          executionOrder.push('first');
          config.headers = config.headers || {};
          config.headers['X-First-Interceptor'] = 'executed';
          return config;
        }
      };

      const secondInterceptor = {
        name: 'secondInterceptor',
        priority: InterceptorPriority.NORMAL,
        enabled: true,
        description: 'Second interceptor',
        phase: InterceptorPhase.REQUEST,
        execute: async (config: any, context: InterceptorContext) => {
          executionOrder.push('second');
          config.headers = config.headers || {};
          config.headers['X-Second-Interceptor'] = 'executed';
          return config;
        }
      };

      const thirdInterceptor = {
        name: 'thirdInterceptor',
        priority: InterceptorPriority.LOW,
        enabled: true,
        description: 'Third interceptor',
        phase: InterceptorPhase.REQUEST,
        execute: async (config: any, context: InterceptorContext) => {
          executionOrder.push('third');
          config.headers = config.headers || {};
          config.headers['X-Third-Interceptor'] = 'executed';
          return config;
        }
      };

      // Register interceptors
      interceptorManager.registerInterceptor(firstInterceptor);
      interceptorManager.registerInterceptor(secondInterceptor);
      interceptorManager.registerInterceptor(thirdInterceptor);

      // Create mock request config
      const mockConfig = {
        method: 'GET',
        url: '/test',
        headers: {}
      };

      const mockContext: InterceptorContext = {
        requestId: 'test-req-1',
        timestamp: new Date(),
        phase: InterceptorPhase.REQUEST,
        attempt: 1,
        metadata: {},
        variables: {},
        config: mockConfig
      };

      // Execute the interceptor chain
      const result = await interceptorManager.executeRequestInterceptors(mockConfig, mockContext);

      // Verify execution order (HIGH priority first, then NORMAL, then LOW)
      expect(executionOrder).to.deep.equal(['first', 'second', 'third']);
      
      // Verify all interceptors modified the config
      expect(result.headers).to.have.property('X-First-Interceptor', 'executed');
      expect(result.headers).to.have.property('X-Second-Interceptor', 'executed');
      expect(result.headers).to.have.property('X-Third-Interceptor', 'executed');
    });

    it('should handle interceptor errors gracefully', async () => {
      const faultyInterceptor = {
        name: 'faultyInterceptor',
        priority: InterceptorPriority.NORMAL,
        enabled: true,
        description: 'Faulty interceptor',
        phase: InterceptorPhase.REQUEST,
        execute: async (config: any, context: InterceptorContext) => {
          throw new Error('Interceptor execution failed');
        },
        onError: async (error: any, context: InterceptorContext) => {
          // Log error and return modified config
          context.metadata.errorHandled = true;
          return { ...context.config, errorRecovered: true };
        }
      };

      const normalInterceptor = {
        name: 'normalInterceptor',
        priority: InterceptorPriority.LOW,
        enabled: true,
        description: 'Normal interceptor',
        phase: InterceptorPhase.REQUEST,
        execute: async (config: any, context: InterceptorContext) => {
          config.headers = config.headers || {};
          config.headers['X-Normal'] = 'executed';
          return config;
        }
      };

      interceptorManager.registerInterceptor(faultyInterceptor);
      interceptorManager.registerInterceptor(normalInterceptor);

      const mockConfig = { method: 'GET', url: '/test', headers: {} };
      const mockContext: InterceptorContext = {
        requestId: 'test-req-error',
        timestamp: new Date(),
        phase: InterceptorPhase.REQUEST,
        attempt: 1,
        metadata: {},
        variables: {},
        config: mockConfig
      };

      // Should not throw despite faulty interceptor
      const result = await interceptorManager.executeRequestInterceptors(mockConfig, mockContext);
      
      // Normal interceptor should still execute
      expect(result.headers).to.have.property('X-Normal', 'executed');
    });

    it('should skip disabled interceptors', async () => {
      const enabledInterceptor = {
        name: 'enabledInterceptor',
        priority: InterceptorPriority.NORMAL,
        enabled: true,
        description: 'Enabled interceptor',
        phase: InterceptorPhase.REQUEST,
        execute: async (config: any, context: InterceptorContext) => {
          config.executed = config.executed || [];
          config.executed.push('enabled');
          return config;
        }
      };

      const disabledInterceptor = {
        name: 'disabledInterceptor',
        priority: InterceptorPriority.NORMAL,
        enabled: false,
        description: 'Disabled interceptor',
        phase: InterceptorPhase.REQUEST,
        execute: async (config: any, context: InterceptorContext) => {
          config.executed = config.executed || [];
          config.executed.push('disabled');
          return config;
        }
      };

      interceptorManager.registerInterceptor(enabledInterceptor);
      interceptorManager.registerInterceptor(disabledInterceptor);

      const mockConfig = { method: 'GET', url: '/test' };
      const mockContext: InterceptorContext = {
        requestId: 'test-req-disabled',
        timestamp: new Date(),
        phase: InterceptorPhase.REQUEST,
        attempt: 1,
        metadata: {},
        variables: {},
        config: mockConfig
      };

      const result = await interceptorManager.executeRequestInterceptors(mockConfig, mockContext);

      // Only enabled interceptor should have executed
      expect((result as any).executed).to.deep.equal(['enabled']);
    });
  });

  describe('Built-in Interceptor Integration', () => {
    it('should integrate authentication interceptor', async () => {
      const mockAuthProvider = {
        authenticate: async (config: any) => {
          config.headers = config.headers || {};
          config.headers['Authorization'] = 'Bearer mock-token';
          return config;
        }
      };

      const authInterceptor = new AuthenticationInterceptor(mockAuthProvider);
      interceptorManager.registerInterceptor(authInterceptor);

      const mockConfig = { method: 'GET', url: '/secure', headers: {} };
      const mockContext: InterceptorContext = {
        requestId: 'auth-test',
        timestamp: new Date(),
        phase: InterceptorPhase.REQUEST,
        attempt: 1,
        metadata: {},
        variables: {},
        config: mockConfig
      };

      const result = await interceptorManager.executeRequestInterceptors(mockConfig, mockContext);

      expect(result.headers).to.have.property('Authorization', 'Bearer mock-token');
    });

    it('should integrate user agent interceptor', async () => {
      const userAgentInterceptor = new UserAgentInterceptor('TestSuite/1.0.0');
      interceptorManager.registerInterceptor(userAgentInterceptor);

      const mockConfig = { method: 'GET', url: '/test', headers: {} };
      const mockContext: InterceptorContext = {
        requestId: 'ua-test',
        timestamp: new Date(),
        phase: InterceptorPhase.REQUEST,
        attempt: 1,
        metadata: {},
        variables: {},
        config: mockConfig
      };

      const result = await interceptorManager.executeRequestInterceptors(mockConfig, mockContext);

      expect(result.headers).to.have.property('User-Agent', 'TestSuite/1.0.0');
    });

    it('should integrate logging interceptor', async () => {
      const logEntries: any[] = [];
      const mockLogger = {
        info: (message: string, data?: any) => {
          logEntries.push({ level: 'info', message, data });
        }
      };

      const loggingInterceptor = new RequestLoggingInterceptor(mockLogger);
      interceptorManager.registerInterceptor(loggingInterceptor);

      const mockConfig = { method: 'POST', url: '/api/test', headers: {} };
      const mockContext: InterceptorContext = {
        requestId: 'log-test',
        timestamp: new Date(),
        phase: InterceptorPhase.REQUEST,
        attempt: 1,
        metadata: {},
        variables: {},
        config: mockConfig
      };

      await interceptorManager.executeRequestInterceptors(mockConfig, mockContext);

      expect(logEntries).to.have.length(1);
      expect(logEntries[0].level).to.equal('info');
      expect(logEntries[0].message).to.include('Request');
    });
  });

  describe('Plugin System Integration', () => {
    it('should integrate plugins with interceptor system', async () => {
      let pluginInitialized = false;
      let interceptorRegistered = false;

      const testPlugin = {
        name: 'testIntegrationPlugin',
        version: '1.0.0',
        description: 'Test plugin for integration',
        enabled: true,
        priority: InterceptorPriority.NORMAL,
        initialize: (context: any) => {
          pluginInitialized = true;
          
          // Plugin adds its own interceptor
          const pluginInterceptor = {
            name: 'pluginInterceptor',
            priority: InterceptorPriority.NORMAL,
            enabled: true,
            description: 'Interceptor added by plugin',
            phase: InterceptorPhase.REQUEST,
            execute: async (config: any, context: InterceptorContext) => {
              config.headers = config.headers || {};
              config.headers['X-Plugin-Interceptor'] = 'executed';
              return config;
            }
          };

          context.services.registerInterceptor(pluginInterceptor);
          interceptorRegistered = true;
        }
      };

      await pluginSystem.registerPlugin(testPlugin);

      expect(pluginInitialized).to.be.true;
      expect(interceptorRegistered).to.be.true;
      expect(pluginSystem.getAllInterceptors()).to.have.length(1);
      expect(pluginSystem.getAllPlugins()).to.have.length(1);
    });

    it('should handle plugin lifecycle events', async () => {
      const lifecycleEvents: string[] = [];

      const lifecyclePlugin = {
        name: 'lifecyclePlugin',
        version: '1.0.0',
        description: 'Lifecycle plugin for testing',
        enabled: true,
        priority: InterceptorPriority.NORMAL,
        initialize: (context: any) => {
          lifecycleEvents.push('initialize');
        },
        cleanup: async () => {
          lifecycleEvents.push('cleanup');
        }
      };

      await pluginSystem.registerPlugin(lifecyclePlugin);
      expect(lifecycleEvents).to.include('initialize');

      await pluginSystem.unregisterPlugin('lifecyclePlugin');
      expect(lifecycleEvents).to.include('cleanup');
    });

    it('should manage plugin configurations', async () => {
      const configurablePlugin = {
        name: 'configurablePlugin',
        version: '1.0.0',
        description: 'Configurable plugin for testing',
        enabled: true,
        priority: InterceptorPriority.NORMAL,
        config: {
          setting1: 'value1',
          setting2: 42,
          setting3: true
        },
        initialize: (context: any) => {
          expect(context.config).to.exist;
          expect(context.config.setting1).to.equal('value1');
          expect(context.config.setting2).to.equal(42);
          expect(context.config.setting3).to.be.true;
        }
      };

      await pluginSystem.registerPlugin(configurablePlugin);
      // If we get here without throwing, the plugin was registered successfully
      expect(true).to.be.true;
    });
  });

  describe('Factory Integration', () => {
    it('should use factory to create interceptor suite', () => {
      const basicInterceptors = BuiltInInterceptorFactory.createAllBasicInterceptors();

      // Register all request interceptors
      basicInterceptors.request.forEach(interceptor => {
        interceptorManager.registerInterceptor(interceptor);
      });

      // Register all response interceptors  
      basicInterceptors.response.forEach(interceptor => {
        interceptorManager.registerInterceptor(interceptor);
      });

      // Register all error interceptors
      basicInterceptors.error.forEach(interceptor => {
        interceptorManager.registerInterceptor(interceptor);
      });

      const allInterceptors = interceptorManager.getAllInterceptors();
      
      expect(allInterceptors.length).to.be.greaterThan(5);
      expect(allInterceptors.some((i: any) => i.name === 'requestLogging')).to.be.true;
      expect(allInterceptors.some((i: any) => i.name === 'responseLogging')).to.be.true;
      expect(allInterceptors.some((i: any) => i.name === 'userAgent')).to.be.true;
      expect(allInterceptors.some((i: any) => i.name === 'retry')).to.be.true;
    });

    it('should create interceptors with custom configuration', () => {
      const customTimeoutInterceptor = BuiltInInterceptorFactory.createTimeoutInterceptor(10000);
      const customUserAgentInterceptor = BuiltInInterceptorFactory.createUserAgentInterceptor('CustomIntegrationTest/2.0');

      interceptorManager.registerInterceptor(customTimeoutInterceptor);
      interceptorManager.registerInterceptor(customUserAgentInterceptor);

      const interceptors = interceptorManager.getAllInterceptors();
      
      expect(interceptors).to.have.length(2);
      expect(interceptors.some((i: any) => i.name === 'timeout')).to.be.true;
      expect(interceptors.some((i: any) => i.name === 'userAgent')).to.be.true;
    });
  });

  describe('Performance and Statistics Integration', () => {
    it('should track interceptor performance statistics', async () => {
      const performanceInterceptor = {
        name: 'performanceInterceptor',
        priority: InterceptorPriority.NORMAL,
        enabled: true,
        description: 'Performance tracking interceptor',
        phase: InterceptorPhase.REQUEST,
        execute: async (config: any, context: InterceptorContext) => {
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10));
          return config;
        }
      };

      interceptorManager.registerInterceptor(performanceInterceptor);

      // Execute multiple times to gather statistics
      for (let i = 0; i < 3; i++) {
        const mockConfig = { method: 'GET', url: `/test-${i}` };
        const mockContext: InterceptorContext = {
          requestId: `perf-test-${i}`,
          timestamp: new Date(),
          phase: InterceptorPhase.REQUEST,
          attempt: 1,
          metadata: {},
          variables: {},
          config: mockConfig
        };

        await interceptorManager.executeRequestInterceptors(mockConfig, mockContext);
      }

      const stats = interceptorManager.getStatistics();
      const perfStats = stats['performanceInterceptor'];

      expect(perfStats).to.exist;
      expect(perfStats.executionCount).to.equal(3);
      expect(perfStats.successCount).to.equal(3);
      expect(perfStats.errorCount).to.equal(0);
      expect(perfStats.totalExecutionTime).to.be.greaterThan(0);
      expect(perfStats.averageExecutionTime).to.be.greaterThan(0);
    });

    it('should provide comprehensive system statistics', () => {
      // Add multiple interceptors of different types
      const requestInterceptor = new RequestLoggingInterceptor();
      const responseInterceptor = new ResponseLoggingInterceptor();
      const authInterceptor = new AuthenticationInterceptor(null);

      interceptorManager.registerInterceptor(requestInterceptor);
      interceptorManager.registerInterceptor(responseInterceptor);
      interceptorManager.registerInterceptor(authInterceptor);

      const systemStats = interceptorManager.getStatistics();

      expect(systemStats).to.exist;
      expect(systemStats.totalInterceptors).to.equal(3);
      expect(systemStats.enabledInterceptors).to.equal(3);
      expect(systemStats.disabledInterceptors).to.equal(0);
      expect(systemStats.byPhase).to.exist;
      expect(systemStats.byPriority).to.exist;
    });
  });
});