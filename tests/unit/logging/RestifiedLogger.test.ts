import { expect } from 'chai';
import { RestifiedLogger } from '../../../src/logging/RestifiedLogger';

describe('RestifiedTS Logging System Tests @smoke @unit', () => {
  let logger: RestifiedLogger;
  const loggersToCleanup: RestifiedLogger[] = [];

  beforeEach(() => {
    logger = new RestifiedLogger();
    loggersToCleanup.push(logger);
  });

  afterEach(() => {
    // Clean up all loggers created during tests
    loggersToCleanup.forEach(logger => {
      try {
        logger.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    loggersToCleanup.length = 0; // Clear the array
  });

  describe('Logger Initialization', () => {
    it('should create RestifiedLogger instance', () => {
      expect(logger).to.be.instanceOf(RestifiedLogger);
    });

    it('should initialize with default configuration', () => {
      const defaultLogger = new RestifiedLogger();
      loggersToCleanup.push(defaultLogger);
      expect(defaultLogger).to.be.instanceOf(RestifiedLogger);
    });

    it('should accept custom configuration', () => {
      const customLogger = new RestifiedLogger({
        enableConsole: true,
        enableFile: false,
        enableJSON: true
      });
      expect(customLogger).to.be.instanceOf(RestifiedLogger);
    });
  });

  describe('Log Level Methods', () => {
    it('should have debug method', () => {
      expect(logger).to.have.property('debug');
      expect(logger.debug).to.be.a('function');
    });

    it('should have info method', () => {
      expect(logger).to.have.property('info');
      expect(logger.info).to.be.a('function');
    });

    it('should have warn method', () => {
      expect(logger).to.have.property('warn');
      expect(logger.warn).to.be.a('function');
    });

    it('should have error method', () => {
      expect(logger).to.have.property('error');
      expect(logger.error).to.be.a('function');
    });

    it('should log messages without throwing errors', () => {
      expect(() => logger.debug('Debug message')).to.not.throw();
      expect(() => logger.info('Info message')).to.not.throw();
      expect(() => logger.warn('Warning message')).to.not.throw();
      expect(() => logger.error('Error message')).to.not.throw();
    });
  });

  describe('Log Context and Metadata', () => {
    it('should handle log messages with context', () => {
      const context = { userId: '123', action: 'test' };
      expect(() => logger.info('Test message', context)).to.not.throw();
    });

    it('should handle log messages with error objects', () => {
      const error = new Error('Test error');
      expect(() => logger.error('Error occurred', error)).to.not.throw();
    });

    it('should handle complex metadata objects', () => {
      const metadata = {
        request: {
          method: 'GET',
          url: '/api/test',
          headers: { 'Content-Type': 'application/json' }
        },
        response: {
          status: 200,
          duration: 150
        }
      };
      expect(() => logger.info('API request completed', metadata)).to.not.throw();
    });
  });

  describe('Performance and Timing', () => {
    it('should handle high-frequency logging', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          logger.info(`High frequency log ${i}`);
        }
      }).to.not.throw();
    });

    it('should handle timing operations if available', () => {
      const timer = logger.startTimer('test-operation');
      expect(timer).to.be.an('object');
      expect(timer.name).to.equal('test-operation');
      
      setTimeout(() => {
        expect(() => timer.end('Timer completed')).to.not.throw();
      }, 10);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined messages', () => {
      expect(() => logger.info(null as any)).to.not.throw();
      expect(() => logger.info(undefined as any)).to.not.throw();
    });

    it('should handle circular references in metadata', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      expect(() => logger.info('Circular reference test', circular)).to.not.throw();
    });

    it('should handle very large log messages', () => {
      const largeMessage = 'x'.repeat(10000);
      expect(() => logger.info(largeMessage)).to.not.throw();
    });

    it('should handle special characters and unicode', () => {
      const specialMessage = 'Test with émojis 🚀 and spéciàl chars ñ ü';
      expect(() => logger.info(specialMessage)).to.not.throw();
    });
  });

  describe('Integration Scenarios', () => {
    it('should support multiple logger instances', () => {
      const logger1 = new RestifiedLogger({ enableConsole: false });
      const logger2 = new RestifiedLogger({ enableConsole: false });
      
      expect(() => {
        logger1.debug('Logger 1 debug');
        logger2.error('Logger 2 error');
      }).to.not.throw();
    });

    it('should handle concurrent logging', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => {
          logger.info(`Concurrent log ${i}`);
        }));
      }
      
      await Promise.all(promises);
      expect(true).to.be.true; // Test passes if no errors thrown
    });
  });

  describe('Method Availability', () => {
    it('should have essential logging methods', () => {
      const requiredMethods = ['debug', 'info', 'warn', 'error'];
      
      requiredMethods.forEach(method => {
        expect(logger).to.have.property(method);
        expect(logger[method as keyof RestifiedLogger]).to.be.a('function');
      });
    });

    it('should maintain method consistency', () => {
      // All log level methods should have similar signatures
      expect(() => {
        logger.debug('message');
        logger.info('message');
        logger.warn('message');
        logger.error('message');
      }).to.not.throw();
    });
  });

  describe('Configuration and Transport', () => {
    it('should support console transport', () => {
      const consoleLogger = new RestifiedLogger({
        enableConsole: true,
        enableFile: false
      });
      
      expect(consoleLogger).to.be.instanceOf(RestifiedLogger);
      expect(() => consoleLogger.info('Console log test')).to.not.throw();
    });

    it('should support file transport configuration', () => {
      const fileLogger = new RestifiedLogger({
        enableConsole: false,
        enableFile: true
      });
      
      expect(fileLogger).to.be.instanceOf(RestifiedLogger);
      expect(() => fileLogger.info('File log test')).to.not.throw();
    });

    it('should support JSON logging configuration', () => {
      const jsonLogger = new RestifiedLogger({
        enableConsole: false,
        enableFile: false,
        enableJSON: true
      });
      
      expect(jsonLogger).to.be.instanceOf(RestifiedLogger);
      expect(() => jsonLogger.info('JSON log test')).to.not.throw();
    });
  });

  describe('RestifiedTS Integration', () => {
    it('should integrate with test execution logging', () => {
      const testExecutionLogger = new RestifiedLogger({
        enableConsole: false,
        enableJSON: true
      });
      
      const testMetadata = {
        testName: 'API GET Test',
        method: 'GET',
        url: '/api/users',
        duration: 150,
        status: 'passed'
      };
      
      expect(() => {
        testExecutionLogger.info('Test execution started', testMetadata);
        testExecutionLogger.info('Request sent', { method: 'GET', url: '/api/users' });
        testExecutionLogger.info('Response received', { status: 200, duration: 150 });
        testExecutionLogger.info('Test completed successfully', { result: 'passed' });
      }).to.not.throw();
    });

    it('should handle API request/response logging', () => {
      const apiLogger = new RestifiedLogger({ enableConsole: false });
      
      const requestData = {
        method: 'POST',
        url: '/api/users',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'Test User', email: 'test@example.com' }
      };
      
      const responseData = {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: { id: 123, name: 'Test User', email: 'test@example.com' },
        duration: 200
      };
      
      expect(() => {
        apiLogger.debug('API Request', requestData);
        apiLogger.debug('API Response', responseData);
      }).to.not.throw();
    });

    it('should handle error and assertion logging', () => {
      const assertionLogger = new RestifiedLogger({ enableConsole: false });
      
      const assertionData = {
        testName: 'Status Code Assertion',
        expected: 200,
        actual: 404,
        passed: false,
        message: 'Expected status code 200 but got 404'
      };
      
      const networkError = new Error('Connection timeout');
      
      expect(() => {
        assertionLogger.warn('Assertion failed', assertionData);
        assertionLogger.error('Test error occurred', networkError, {
          testName: 'Network Error Test',
          duration: 5000,
          retryAttempt: 3
        });
      }).to.not.throw();
    });
  });

  describe('Performance Monitoring', () => {
    it('should handle performance-related logging', () => {
      const perfLogger = new RestifiedLogger({ enableConsole: false });
      
      const performanceData = {
        operation: 'Database Query',
        duration: 45,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };
      
      expect(() => {
        perfLogger.info('Performance metrics', performanceData);
      }).to.not.throw();
    });

    it('should log test suite execution metrics', () => {
      const suiteLogger = new RestifiedLogger({ enableConsole: false });
      
      const suiteMetrics = {
        suiteName: 'API Tests',
        totalTests: 50,
        passedTests: 48,
        failedTests: 2,
        totalDuration: 15000,
        averageTestDuration: 300
      };
      
      expect(() => {
        suiteLogger.info('Test suite completed', suiteMetrics);
      }).to.not.throw();
    });
  });
});