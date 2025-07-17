/**
 * Multiple HTTP Clients Configuration Example
 *
 * This example demonstrates how to configure and use multiple HTTP clients
 * for different services, including client pooling, custom configurations,
 * and service-specific settings.
 */

import { RestifiedTS } from '../../src';

async function basicMultipleClients() {
  console.log('=' Running Basic Multiple Clients Example');
  
  try {
    // Configure client for User Service
    RestifiedTS.createClient('userService', {
      baseURL: 'https://user-service.example.com',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service': 'user-service'
      }
    });
    
    // Configure client for Payment Service
    RestifiedTS.createClient('paymentService', {
      baseURL: 'https://payment-service.example.com',
      timeout: 10000, // Higher timeout for payment operations
      headers: {
        'Content-Type': 'application/json',
        'X-Service': 'payment-service'
      }
    });
    
    // Configure client for Notification Service
    RestifiedTS.createClient('notificationService', {
      baseURL: 'https://notification-service.example.com',
      timeout: 3000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service': 'notification-service'
      }
    });
    
    console.log(' Multiple clients configured');
    
    // Use User Service client
    const userResponse = await RestifiedTS
      .given()
        .client('userService')
        .header('Authorization', 'Bearer user-token')
      .when()
        .get('/users/123')
      .then()
        .statusCode(200)
        .jsonPath('$.id', '123')
        .jsonPath('$.name', (name: string) => name.length > 0)
      .execute();
    
    console.log(' User service call successful');
    
    // Use Payment Service client
    const paymentResponse = await RestifiedTS
      .given()
        .client('paymentService')
        .header('Authorization', 'Bearer payment-token')
        .body({
          amount: 100.00,
          currency: 'USD',
          userId: '123'
        })
      .when()
        .post('/payments')
      .then()
        .statusCode(201)
        .jsonPath('$.status', 'pending')
        .jsonPath('$.amount', 100.00)
        .extract('$.id', 'paymentId')
      .execute();
    
    console.log(' Payment service call successful');
    
    // Use Notification Service client
    const notificationResponse = await RestifiedTS
      .given()
        .client('notificationService')
        .header('Authorization', 'Bearer notification-token')
        .body({
          userId: '123',
          type: 'payment_confirmation',
          message: 'Payment processed successfully',
          paymentId: paymentResponse.extractedData.paymentId
        })
      .when()
        .post('/notifications')
      .then()
        .statusCode(201)
        .jsonPath('$.status', 'sent')
        .jsonPath('$.type', 'payment_confirmation')
      .execute();
    
    console.log(' Notification service call successful');
    
  } catch (error) {
    console.error('L Basic multiple clients failed:', error);
  }
}

async function clientWithCustomConfiguration() {
  console.log('=' Running Client with Custom Configuration Example');
  
  try {
    // Create client with custom retry configuration
    RestifiedTS.createClient('retryService', {
      baseURL: 'https://unreliable-service.example.com',
      timeout: 5000,
      retryConfig: {
        retries: 3,
        retryDelay: 1000,
        retryOnStatusCodes: [500, 502, 503, 504]
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Create client with custom interceptors
    RestifiedTS.createClient('interceptorService', {
      baseURL: 'https://api.example.com',
      timeout: 5000,
      interceptors: {
        request: (config) => {
          config.headers['X-Request-Time'] = new Date().toISOString();
          config.headers['X-Request-ID'] = `req-${Date.now()}`;
          return config;
        },
        response: (response) => {
          response.headers['X-Response-Time'] = new Date().toISOString();
          return response;
        }
      }
    });
    
    console.log(' Custom clients configured');
    
    // Test retry client
    const retryResponse = await RestifiedTS
      .given()
        .client('retryService')
      .when()
        .get('/unstable-endpoint')
      .then()
        .statusCode(200)
        .jsonPath('$.data', (data: any) => data !== null)
      .execute();
    
    console.log(' Retry client test successful');
    
    // Test interceptor client
    const interceptorResponse = await RestifiedTS
      .given()
        .client('interceptorService')
        .header('X-Test', 'interceptor-test')
      .when()
        .get('/test-endpoint')
      .then()
        .statusCode(200)
        .header('X-Response-Time', (time: string) => time.length > 0)
        .jsonPath('$.requestId', (id: string) => id.startsWith('req-'))
      .execute();
    
    console.log(' Interceptor client test successful');
    
  } catch (error) {
    console.error('L Client with custom configuration failed:', error);
  }
}

async function environmentSpecificClients() {
  console.log('=' Running Environment Specific Clients Example');
  
  try {
    const environment = process.env.NODE_ENV || 'development';
    
    // Configure clients based on environment
    const environments = {
      development: {
        userService: 'http://localhost:3001',
        paymentService: 'http://localhost:3002',
        notificationService: 'http://localhost:3003'
      },
      staging: {
        userService: 'https://user-service.staging.example.com',
        paymentService: 'https://payment-service.staging.example.com',
        notificationService: 'https://notification-service.staging.example.com'
      },
      production: {
        userService: 'https://user-service.example.com',
        paymentService: 'https://payment-service.example.com',
        notificationService: 'https://notification-service.example.com'
      }
    };
    
    const config = environments[environment] || environments.development;
    
    // Create environment-specific clients
    RestifiedTS.createClient('userService', {
      baseURL: config.userService,
      timeout: environment === 'production' ? 10000 : 5000,
      headers: {
        'X-Environment': environment,
        'Content-Type': 'application/json'
      }
    });
    
    RestifiedTS.createClient('paymentService', {
      baseURL: config.paymentService,
      timeout: environment === 'production' ? 15000 : 8000,
      headers: {
        'X-Environment': environment,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(` Environment-specific clients configured for: ${environment}`);
    
    // Test environment-specific behavior
    const userResponse = await RestifiedTS
      .given()
        .client('userService')
        .header('X-Test-Environment', environment)
      .when()
        .get('/health')
      .then()
        .statusCode(200)
        .jsonPath('$.environment', environment)
        .jsonPath('$.status', 'healthy')
      .execute();
    
    console.log(` ${environment} environment test successful`);
    
  } catch (error) {
    console.error('L Environment specific clients failed:', error);
  }
}

async function clientPooling() {
  console.log('=' Running Client Pooling Example');
  
  try {
    // Create multiple instances of the same service for load balancing
    const serviceInstances = [
      'https://api1.example.com',
      'https://api2.example.com',
      'https://api3.example.com'
    ];
    
    // Configure client pool
    serviceInstances.forEach((baseURL, index) => {
      RestifiedTS.createClient(`apiService${index + 1}`, {
        baseURL,
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Instance': `instance-${index + 1}`
        }
      });
    });
    
    console.log(' Client pool configured');
    
    // Round-robin client selection
    const results = [];
    for (let i = 0; i < 6; i++) {
      const clientIndex = (i % serviceInstances.length) + 1;
      const clientName = `apiService${clientIndex}`;
      
      const response = await RestifiedTS
        .given()
          .client(clientName)
          .header('X-Request-Number', i.toString())
        .when()
          .get('/api/data')
        .then()
          .statusCode(200)
          .jsonPath('$.instance', `instance-${clientIndex}`)
          .jsonPath('$.requestNumber', i)
        .execute();
      
      results.push({
        request: i,
        client: clientName,
        instance: response.data.instance
      });
      
      console.log(` Request ${i} handled by ${clientName}`);
    }
    
    console.log(' Client pooling test completed');
    console.log('Load distribution:', results);
    
  } catch (error) {
    console.error('L Client pooling failed:', error);
  }
}

async function clientAuthentication() {
  console.log('=' Running Client Authentication Example');
  
  try {
    // Create client with OAuth authentication
    RestifiedTS.createClient('oauthService', {
      baseURL: 'https://oauth-service.example.com',
      timeout: 5000,
      auth: {
        type: 'oauth2',
        clientId: 'oauth-client-id',
        clientSecret: 'oauth-client-secret',
        tokenUrl: 'https://oauth-service.example.com/token'
      }
    });
    
    // Create client with API key authentication
    RestifiedTS.createClient('apiKeyService', {
      baseURL: 'https://api-key-service.example.com',
      timeout: 5000,
      auth: {
        type: 'apiKey',
        apiKey: 'your-api-key-here',
        headerName: 'X-API-Key'
      }
    });
    
    // Create client with basic authentication
    RestifiedTS.createClient('basicAuthService', {
      baseURL: 'https://basic-auth-service.example.com',
      timeout: 5000,
      auth: {
        type: 'basic',
        username: 'test-user',
        password: 'test-password'
      }
    });
    
    console.log(' Authentication clients configured');
    
    // Test OAuth client
    const oauthResponse = await RestifiedTS
      .given()
        .client('oauthService')
      .when()
        .get('/protected/data')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .jsonPath('$.authType', 'oauth2')
      .execute();
    
    console.log(' OAuth client test successful');
    
    // Test API key client
    const apiKeyResponse = await RestifiedTS
      .given()
        .client('apiKeyService')
      .when()
        .get('/api/data')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .jsonPath('$.authType', 'apiKey')
      .execute();
    
    console.log(' API key client test successful');
    
    // Test basic auth client
    const basicAuthResponse = await RestifiedTS
      .given()
        .client('basicAuthService')
      .when()
        .get('/secure/data')
      .then()
        .statusCode(200)
        .jsonPath('$.authenticated', true)
        .jsonPath('$.authType', 'basic')
      .execute();
    
    console.log(' Basic auth client test successful');
    
  } catch (error) {
    console.error('L Client authentication failed:', error);
  }
}

async function clientHealthChecks() {
  console.log('=' Running Client Health Checks Example');
  
  try {
    // Configure clients with health check endpoints
    const services = [
      { name: 'userService', baseURL: 'https://user-service.example.com' },
      { name: 'paymentService', baseURL: 'https://payment-service.example.com' },
      { name: 'orderService', baseURL: 'https://order-service.example.com' }
    ];
    
    // Create clients with health check configuration
    services.forEach(service => {
      RestifiedTS.createClient(service.name, {
        baseURL: service.baseURL,
        timeout: 5000,
        healthCheck: {
          endpoint: '/health',
          interval: 30000, // 30 seconds
          enabled: true
        }
      });
    });
    
    console.log(' Health check clients configured');
    
    // Perform health checks
    const healthResults = [];
    for (const service of services) {
      try {
        const healthResponse = await RestifiedTS
          .given()
            .client(service.name)
          .when()
            .get('/health')
          .then()
            .statusCode(200)
            .jsonPath('$.status', 'healthy')
            .jsonPath('$.service', service.name)
            .responseTime((time: number) => time < 1000)
          .execute();
        
        healthResults.push({
          service: service.name,
          status: 'healthy',
          responseTime: healthResponse.responseTime
        });
        
        console.log(` ${service.name} health check passed`);
        
      } catch (error) {
        healthResults.push({
          service: service.name,
          status: 'unhealthy',
          error: error.message
        });
        
        console.error(`L ${service.name} health check failed`);
      }
    }
    
    console.log(' Health check results:', healthResults);
    
  } catch (error) {
    console.error('L Client health checks failed:', error);
  }
}

async function clientMetrics() {
  console.log('=' Running Client Metrics Example');
  
  try {
    // Create client with metrics collection
    RestifiedTS.createClient('metricsService', {
      baseURL: 'https://api.example.com',
      timeout: 5000,
      metrics: {
        enabled: true,
        collectResponseTime: true,
        collectRequestSize: true,
        collectResponseSize: true,
        collectStatusCodes: true
      }
    });
    
    console.log(' Metrics client configured');
    
    // Make multiple requests to collect metrics
    const requests = [];
    for (let i = 0; i < 10; i++) {
      const requestPromise = RestifiedTS
        .given()
          .client('metricsService')
          .header('X-Request-ID', `req-${i}`)
        .when()
          .get(`/api/data/${i}`)
        .then()
          .statusCode(200)
          .jsonPath('$.id', i)
        .execute();
      
      requests.push(requestPromise);
    }
    
    // Wait for all requests to complete
    const responses = await Promise.all(requests);
    
    console.log(' All metric collection requests completed');
    
    // Analyze metrics
    const metrics = {
      totalRequests: responses.length,
      averageResponseTime: responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length,
      statusCodeDistribution: responses.reduce((acc, r) => {
        acc[r.statusCode] = (acc[r.statusCode] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    };
    
    console.log(' Metrics analysis:', metrics);
    
  } catch (error) {
    console.error('L Client metrics failed:', error);
  }
}

// Run all examples
async function runAllExamples() {
  console.log('<¯ Starting Multiple Clients Configuration Examples\n');
  
  await basicMultipleClients();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await clientWithCustomConfiguration();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await environmentSpecificClients();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await clientPooling();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await clientAuthentication();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await clientHealthChecks();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await clientMetrics();
  
  console.log('\n<‰ All Multiple Clients Configuration Examples Completed!');
}

// Execute if run directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicMultipleClients,
  clientWithCustomConfiguration,
  environmentSpecificClients,
  clientPooling,
  clientAuthentication,
  clientHealthChecks,
  clientMetrics,
  runAllExamples
};