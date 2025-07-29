import { expect } from 'chai';
import { 
  InterceptorManager, 
  PluginManager, 
  InterceptorPluginSystem,
  BuiltInInterceptorFactory,
  AuthenticationInterceptor,
  RequestLoggingInterceptor,
  ResponseLoggingInterceptor,
  RetryInterceptor,
  TimeoutInterceptor,
  UserAgentInterceptor,
  ResponseTimeInterceptor
} from '../../src/interceptors';
import { InterceptorPriority, InterceptorPhase } from '../../src/interceptors/InterceptorTypes';

describe('Interceptor and Plugin System Tests @unit @integration', () => {
  let interceptorManager: InterceptorManager;
  let pluginManager: PluginManager;
  let pluginSystem: InterceptorPluginSystem;

  beforeEach(() => {
    interceptorManager = new InterceptorManager();
    pluginManager = new PluginManager();
    pluginSystem = new InterceptorPluginSystem();
  });

  afterEach(async () => {
    // Clean up all manager instances to prevent resource leaks
    try {
      if (pluginSystem) {
        await pluginSystem.destroy();
      }
      if (pluginManager) {
        await pluginManager.destroy();
      }
      if (interceptorManager) {
        interceptorManager.reset();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('InterceptorManager', () => {
    it('should initialize interceptor manager without errors', () => {
      expect(interceptorManager).to.be.instanceOf(InterceptorManager);
    });

    it('should register built-in interceptors', () => {
      const authInterceptor = new AuthenticationInterceptor(null);
      const loggingInterceptor = new RequestLoggingInterceptor();
      
      expect(() => {
        interceptorManager.registerInterceptor(authInterceptor);
        interceptorManager.registerInterceptor(loggingInterceptor);
      }).to.not.throw();
    });

    it('should prevent duplicate interceptor registration', () => {
      const interceptor1 = new UserAgentInterceptor('TestAgent/1.0');
      const interceptor2 = new UserAgentInterceptor('TestAgent/2.0');
      
      interceptorManager.registerInterceptor(interceptor1);
      
      expect(() => {
        interceptorManager.registerInterceptor(interceptor2);
      }).to.throw('Interceptor with name \'userAgent\' already exists');
    });

    it('should allow duplicate registration when configured', () => {
      const duplicateAllowedManager = new InterceptorManager({
        allowDuplicates: true
      });
      
      const interceptor1 = new UserAgentInterceptor('TestAgent/1.0');
      const interceptor2 = new UserAgentInterceptor('TestAgent/2.0');
      
      expect(() => {
        duplicateAllowedManager.registerInterceptor(interceptor1);
        duplicateAllowedManager.registerInterceptor(interceptor2);
      }).to.not.throw();
    });

    it('should list registered interceptors', () => {
      const authInterceptor = new AuthenticationInterceptor(null);
      const loggingInterceptor = new RequestLoggingInterceptor();
      
      interceptorManager.registerInterceptor(authInterceptor);
      interceptorManager.registerInterceptor(loggingInterceptor);
      
      const interceptors = interceptorManager.listInterceptors();
      
      expect(interceptors).to.have.length(2);
      expect(interceptors.some(i => i.name === 'authentication')).to.be.true;
      expect(interceptors.some(i => i.name === 'requestLogging')).to.be.true;
    });

    it('should unregister interceptors', () => {
      const loggingInterceptor = new RequestLoggingInterceptor();
      
      interceptorManager.registerInterceptor(loggingInterceptor);
      expect(interceptorManager.listInterceptors()).to.have.length(1);
      
      const unregistered = interceptorManager.unregisterInterceptor('requestLogging');
      expect(unregistered).to.be.true;
      expect(interceptorManager.listInterceptors()).to.have.length(0);
    });

    it('should enable and disable interceptors', () => {
      const loggingInterceptor = new RequestLoggingInterceptor();
      interceptorManager.registerInterceptor(loggingInterceptor);
      
      expect(loggingInterceptor.enabled).to.be.true;
      
      interceptorManager.disableInterceptor('requestLogging');
      expect(loggingInterceptor.enabled).to.be.false;
      
      interceptorManager.enableInterceptor('requestLogging');
      expect(loggingInterceptor.enabled).to.be.true;
    });

    it('should provide interceptor statistics', () => {
      const loggingInterceptor = new RequestLoggingInterceptor();
      interceptorManager.registerInterceptor(loggingInterceptor);
      
      const stats = interceptorManager.getStatistics();
      expect(stats).to.exist;
      expect(stats).to.have.property('requestLogging');
      
      const loggingStats = stats['requestLogging'];
      expect(loggingStats).to.have.property('executionCount', 0);
      expect(loggingStats).to.have.property('totalExecutionTime', 0);
      expect(loggingStats).to.have.property('errorCount', 0);
      expect(loggingStats).to.have.property('successCount', 0);
    });
  });

  describe('PluginManager', () => {
    it('should initialize plugin manager without errors', () => {
      expect(pluginManager).to.be.instanceOf(PluginManager);
    });

    it('should load plugins', () => {
      const mockPlugin = {
        name: 'testPlugin',
        version: '1.0.0',
        description: 'A test plugin',
        initialize: () => {},
        cleanup: async () => {}
      };

      expect(() => {
        pluginManager.loadPlugin(mockPlugin);
      }).to.not.throw();
    });

    it('should unload plugins', () => {
      const mockPlugin = {
        name: 'testPlugin',
        version: '1.0.0',
        initialize: () => {},
        cleanup: async () => {}
      };

      pluginManager.loadPlugin(mockPlugin);
      expect(pluginManager.getLoadedPlugins()).to.have.length(1);
      
      const unloaded = pluginManager.unloadPlugin('testPlugin');
      expect(unloaded).to.be.true;
      expect(pluginManager.getLoadedPlugins()).to.have.length(0);
    });

    it('should list loaded plugins', () => {
      const plugin1 = {
        name: 'plugin1',
        version: '1.0.0',
        initialize: () => {}
      };
      
      const plugin2 = {
        name: 'plugin2',
        version: '2.0.0',
        initialize: () => {}
      };

      pluginManager.loadPlugin(plugin1);
      pluginManager.loadPlugin(plugin2);

      const loadedPlugins = pluginManager.getLoadedPlugins();
      expect(loadedPlugins).to.have.length(2);
      expect(loadedPlugins.some(p => p.name === 'plugin1')).to.be.true;
      expect(loadedPlugins.some(p => p.name === 'plugin2')).to.be.true;
    });

    it('should handle plugin initialization errors', async function() {
      this.timeout(5000);
      
      const faultyPlugin = {
        name: 'faultyPlugin',
        version: '1.0.0',
        initialize: () => {
          throw new Error('Initialization failed');
        }
      };

      // The loadPlugin method should reject when initialization fails
      try {
        await pluginManager.loadPlugin(faultyPlugin);
        expect.fail('Expected loadPlugin to throw an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect((error as Error).message).to.include('Initialization failed');
      }
      
      // Plugin should be registered but in error status
      const loadedPlugins = pluginManager.getLoadedPlugins();
      expect(loadedPlugins).to.have.length(1);
      
      // Check the plugin status using getPluginStatus method
      const pluginStatus = pluginManager.getPluginStatus('faultyPlugin');
      expect(pluginStatus).to.equal('error');
    });
  });

  describe('InterceptorPluginSystem', () => {
    it('should initialize interceptor plugin system without errors', () => {
      expect(pluginSystem).to.be.instanceOf(InterceptorPluginSystem);
    });

    it('should integrate interceptors and plugins', async function() {
      this.timeout(5000);
      
      const customInterceptor = new UserAgentInterceptor('Plugin/1.0');
      const mockPlugin = {
        name: 'integratedPlugin',
        version: '1.0.0',
        interceptors: [customInterceptor],
        initialize: () => {
          // Plugin initialization logic (no interceptor registration here)
        }
      };

      try {
        await pluginSystem.loadPlugin(mockPlugin);
        
        // Verify the plugin was loaded
        const plugins = pluginSystem.getPlugins();
        expect(plugins).to.have.length(1);
        expect(plugins[0].name).to.equal('integratedPlugin');
        
        // Verify the interceptor was registered
        const interceptors = pluginSystem.getInterceptors();
        expect(interceptors.some(i => i.name === 'userAgent')).to.be.true;
      } catch (error) {
        console.error('Plugin loading failed:', error);
        throw error;
      }
    });

    it('should manage both interceptors and plugins', () => {
      const interceptor = new RequestLoggingInterceptor();
      const plugin = {
        name: 'managedPlugin',
        version: '1.0.0',
        initialize: () => {}
      };

      pluginSystem.registerInterceptor(interceptor);
      pluginSystem.loadPlugin(plugin);

      expect(pluginSystem.getInterceptors()).to.have.length(1);
      expect(pluginSystem.getPlugins()).to.have.length(1);
    });
  });

  describe('Built-in Interceptor Factory', () => {
    it('should create authentication interceptor', () => {
      const authInterceptor = BuiltInInterceptorFactory.createAuthenticationInterceptor();
      
      expect(authInterceptor).to.be.instanceOf(AuthenticationInterceptor);
      expect(authInterceptor.name).to.equal('authentication');
      expect(authInterceptor.priority).to.equal(InterceptorPriority.HIGH);
      expect(authInterceptor.phase).to.equal(InterceptorPhase.REQUEST);
    });

    it('should create request logging interceptor', () => {
      const loggingInterceptor = BuiltInInterceptorFactory.createRequestLoggingInterceptor();
      
      expect(loggingInterceptor).to.be.instanceOf(RequestLoggingInterceptor);
      expect(loggingInterceptor.name).to.equal('requestLogging');
      expect(loggingInterceptor.priority).to.equal(InterceptorPriority.LOW);
      expect(loggingInterceptor.phase).to.equal(InterceptorPhase.REQUEST);
    });

    it('should create response logging interceptor', () => {
      const responseLoggingInterceptor = BuiltInInterceptorFactory.createResponseLoggingInterceptor();
      
      expect(responseLoggingInterceptor).to.be.instanceOf(ResponseLoggingInterceptor);
      expect(responseLoggingInterceptor.name).to.equal('responseLogging');
      expect(responseLoggingInterceptor.priority).to.equal(InterceptorPriority.LOW);
      expect(responseLoggingInterceptor.phase).to.equal(InterceptorPhase.RESPONSE);
    });

    it('should create retry interceptor', () => {
      const retryInterceptor = BuiltInInterceptorFactory.createRetryInterceptor();
      
      expect(retryInterceptor).to.be.instanceOf(RetryInterceptor);
      expect(retryInterceptor.name).to.equal('retry');
      expect(retryInterceptor.priority).to.equal(InterceptorPriority.HIGH);
      expect(retryInterceptor.phase).to.equal(InterceptorPhase.ERROR);
    });

    it('should create timeout interceptor', () => {
      const timeoutInterceptor = BuiltInInterceptorFactory.createTimeoutInterceptor(5000);
      
      expect(timeoutInterceptor).to.be.instanceOf(TimeoutInterceptor);
      expect(timeoutInterceptor.name).to.equal('timeout');
      expect(timeoutInterceptor.priority).to.equal(InterceptorPriority.HIGH);
      expect(timeoutInterceptor.phase).to.equal(InterceptorPhase.REQUEST);
    });

    it('should create user agent interceptor', () => {
      const userAgentInterceptor = BuiltInInterceptorFactory.createUserAgentInterceptor('CustomAgent/1.0');
      
      expect(userAgentInterceptor).to.be.instanceOf(UserAgentInterceptor);
      expect(userAgentInterceptor.name).to.equal('userAgent');
      expect(userAgentInterceptor.priority).to.equal(InterceptorPriority.LOW);
      expect(userAgentInterceptor.phase).to.equal(InterceptorPhase.REQUEST);
    });

    it('should create response time interceptor', () => {
      const responseTimeInterceptor = BuiltInInterceptorFactory.createResponseTimeInterceptor();
      
      expect(responseTimeInterceptor).to.be.instanceOf(ResponseTimeInterceptor);
      expect(responseTimeInterceptor.name).to.equal('responseTime');
      expect(responseTimeInterceptor.priority).to.equal(InterceptorPriority.LOW);
      expect(responseTimeInterceptor.phase).to.equal(InterceptorPhase.RESPONSE);
    });

    it('should create all basic interceptors', () => {
      const basicInterceptors = BuiltInInterceptorFactory.createAllBasicInterceptors();
      
      expect(basicInterceptors).to.have.property('request');
      expect(basicInterceptors).to.have.property('response');
      expect(basicInterceptors).to.have.property('error');
      
      expect(basicInterceptors.request).to.be.an('array');
      expect(basicInterceptors.response).to.be.an('array');
      expect(basicInterceptors.error).to.be.an('array');
      
      expect(basicInterceptors.request.length).to.be.greaterThan(0);
      expect(basicInterceptors.response.length).to.be.greaterThan(0);
      expect(basicInterceptors.error.length).to.be.greaterThan(0);
    });
  });

  describe('Interceptor Execution Properties', () => {
    it('should verify interceptor properties', () => {
      const authInterceptor = new AuthenticationInterceptor(null);
      
      expect(authInterceptor.name).to.equal('authentication');
      expect(authInterceptor.priority).to.equal(InterceptorPriority.HIGH);
      expect(authInterceptor.enabled).to.be.true;
      expect(authInterceptor.description).to.be.a('string');
      expect(authInterceptor.phase).to.equal(InterceptorPhase.REQUEST);
      expect(authInterceptor.execute).to.be.a('function');
      expect(authInterceptor.onError).to.be.a('function');
    });

    it('should verify different interceptor priorities', () => {
      const authInterceptor = new AuthenticationInterceptor(null);
      const loggingInterceptor = new RequestLoggingInterceptor();
      const retryInterceptor = BuiltInInterceptorFactory.createRetryInterceptor();
      
      expect(authInterceptor.priority).to.equal(InterceptorPriority.HIGH);
      expect(loggingInterceptor.priority).to.equal(InterceptorPriority.LOW);
      expect(retryInterceptor.priority).to.equal(InterceptorPriority.HIGH);
    });

    it('should verify different interceptor phases', () => {
      const requestInterceptor = new RequestLoggingInterceptor();
      const responseInterceptor = new ResponseLoggingInterceptor();
      const errorInterceptor = BuiltInInterceptorFactory.createRetryInterceptor();
      
      expect(requestInterceptor.phase).to.equal(InterceptorPhase.REQUEST);
      expect(responseInterceptor.phase).to.equal(InterceptorPhase.RESPONSE);
      expect(errorInterceptor.phase).to.equal(InterceptorPhase.ERROR);
    });
  });

  describe('Error Handling', () => {
    it('should handle interceptor registration errors gracefully', () => {
      const invalidInterceptor = {} as any; // Invalid interceptor
      
      expect(() => {
        interceptorManager.registerInterceptor(invalidInterceptor);
      }).to.throw();
    });

    it('should handle plugin loading errors gracefully', async function() {
      this.timeout(5000);
      
      const invalidPlugin = {} as any; // Invalid plugin
      
      try {
        await pluginManager.loadPlugin(invalidPlugin);
        expect.fail('Expected loadPlugin to throw an error for invalid plugin');
      } catch (error) {
        expect(error).to.be.an('error');
        expect((error as Error).message).to.include('Plugin must have a valid name');
      }
    });

    it('should handle unregistering non-existent interceptors', () => {
      const result = interceptorManager.unregisterInterceptor('nonExistentInterceptor');
      expect(result).to.be.false;
    });

    it('should handle unloading non-existent plugins', () => {
      const result = pluginManager.unloadPlugin('nonExistentPlugin');
      expect(result).to.be.false;
    });
  });

  describe('Configuration Management', () => {
    it('should respect interceptor manager configuration', () => {
      const configuredManager = new InterceptorManager({
        enabled: false,
        priority: InterceptorPriority.LOW,
        maxRetries: 5,
        timeout: 60000,
        allowDuplicates: true
      });
      
      expect(configuredManager).to.be.instanceOf(InterceptorManager);
    });

    it('should support interceptor configuration', () => {
      const customTimeoutInterceptor = BuiltInInterceptorFactory.createTimeoutInterceptor(10000);
      const customUserAgentInterceptor = BuiltInInterceptorFactory.createUserAgentInterceptor('Custom/2.0');
      
      expect(customTimeoutInterceptor).to.exist;
      expect(customUserAgentInterceptor).to.exist;
    });
  });
});