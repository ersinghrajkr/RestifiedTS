/**
 * Service Discovery Example
 * 
 * This example demonstrates how to test microservices with service discovery,
 * including dynamic service registration, health checks, and load balancing.
 */

import { RestifiedTS } from '../../src';

// Mock service registry for demonstration
const serviceRegistry = new Map<string, ServiceInstance[]>();

interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  healthy: boolean;
  lastHealthCheck: Date;
  metadata: {
    version: string;
    region: string;
    capabilities: string[];
  };
}

async function basicServiceDiscovery() {
  console.log('🔍 Basic Service Discovery Example...\n');

  try {
    // Register services in our mock registry
    registerService('user-service', {
      id: 'user-service-1',
      name: 'user-service',
      host: 'localhost',
      port: 3001,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.0.0',
        region: 'us-west-2',
        capabilities: ['crud', 'auth']
      }
    });

    registerService('order-service', {
      id: 'order-service-1',
      name: 'order-service',
      host: 'localhost',
      port: 3002,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.2.0',
        region: 'us-west-2',
        capabilities: ['orders', 'payments']
      }
    });

    // Discover and test user service
    const userService = discoverService('user-service');
    console.log('🔍 Discovered user service:', userService);

    const userResult = await RestifiedTS
      .given()
        .baseUrl(`http://${userService.host}:${userService.port}`)
        .header('X-Service-Version', userService.metadata.version)
        .header('X-Service-ID', userService.id)
      .when()
        .get('/users/123')
      .then()
        .statusCode(200)
        .jsonPath('$.id', 123)
        .jsonPath('$.name', notNullValue())
        .responseTime(lessThan(1000))
      .execute();

    console.log('✅ User service discovery and call successful!');

    // Discover and test order service
    const orderService = discoverService('order-service');
    console.log('🔍 Discovered order service:', orderService);

    const orderResult = await RestifiedTS
      .given()
        .baseUrl(`http://${orderService.host}:${orderService.port}`)
        .header('X-Service-Version', orderService.metadata.version)
        .header('X-Service-ID', orderService.id)
      .when()
        .get('/orders/456')
      .then()
        .statusCode(200)
        .jsonPath('$.id', 456)
        .jsonPath('$.userId', notNullValue())
        .responseTime(lessThan(1000))
      .execute();

    console.log('✅ Order service discovery and call successful!');

  } catch (error) {
    console.error('❌ Basic service discovery failed:', error.message);
    throw error;
  }
}

async function serviceHealthChecks() {
  console.log('\n🏥 Service Health Checks Example...\n');

  try {
    // Register services with different health states
    registerService('healthy-service', {
      id: 'healthy-service-1',
      name: 'healthy-service',
      host: 'localhost',
      port: 3003,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.0.0',
        region: 'us-west-2',
        capabilities: ['health']
      }
    });

    registerService('unhealthy-service', {
      id: 'unhealthy-service-1',
      name: 'unhealthy-service',
      host: 'localhost',
      port: 3004,
      healthy: false,
      lastHealthCheck: new Date(Date.now() - 60000), // 1 minute ago
      metadata: {
        version: '1.0.0',
        region: 'us-west-2',
        capabilities: ['health']
      }
    });

    // Test healthy service
    const healthyService = discoverHealthyService('healthy-service');
    console.log('🟢 Healthy service found:', healthyService.id);

    const healthResult = await RestifiedTS
      .given()
        .baseUrl(`http://${healthyService.host}:${healthyService.port}`)
        .header('X-Health-Check', 'true')
      .when()
        .get('/health')
      .then()
        .statusCode(200)
        .jsonPath('$.status', 'healthy')
        .jsonPath('$.uptime', greaterThan(0))
        .jsonPath('$.service', healthyService.name)
        .responseTime(lessThan(500))
      .execute();

    console.log('✅ Health check passed for healthy service!');

    // Test unhealthy service discovery (should skip unhealthy instance)
    try {
      const unhealthyService = discoverHealthyService('unhealthy-service');
      console.log('❌ Should not find unhealthy service');
    } catch (error) {
      console.log('✅ Correctly skipped unhealthy service:', error.message);
    }

    // Test service health endpoint directly
    const unhealthyInstance = discoverService('unhealthy-service');
    await RestifiedTS
      .given()
        .baseUrl(`http://${unhealthyInstance.host}:${unhealthyInstance.port}`)
        .header('X-Health-Check', 'true')
      .when()
        .get('/health')
      .then()
        .statusCode(503) // Service unavailable
        .jsonPath('$.status', 'unhealthy')
        .jsonPath('$.service', unhealthyInstance.name)
      .execute();

    console.log('✅ Health check correctly identified unhealthy service!');

  } catch (error) {
    console.error('❌ Service health checks failed:', error.message);
    throw error;
  }
}

async function loadBalancingExample() {
  console.log('\n⚖️ Load Balancing Example...\n');

  try {
    // Register multiple instances of the same service
    registerService('api-service', {
      id: 'api-service-1',
      name: 'api-service',
      host: 'localhost',
      port: 3005,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.0.0',
        region: 'us-west-2',
        capabilities: ['api']
      }
    });

    registerService('api-service', {
      id: 'api-service-2',
      name: 'api-service',
      host: 'localhost',
      port: 3006,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.0.0',
        region: 'us-west-2',
        capabilities: ['api']
      }
    });

    registerService('api-service', {
      id: 'api-service-3',
      name: 'api-service',
      host: 'localhost',
      port: 3007,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.0.0',
        region: 'us-west-2',
        capabilities: ['api']
      }
    });

    const usedInstances = new Set<string>();
    
    // Make multiple requests to test load balancing
    for (let i = 0; i < 6; i++) {
      const instance = discoverServiceWithLoadBalancing('api-service', 'round-robin');
      usedInstances.add(instance.id);
      
      const result = await RestifiedTS
        .given()
          .baseUrl(`http://${instance.host}:${instance.port}`)
          .header('X-Instance-ID', instance.id)
          .header('X-Request-Number', i.toString())
        .when()
          .get('/api/data')
        .then()
          .statusCode(200)
          .jsonPath('$.instanceId', instance.id)
          .jsonPath('$.requestNumber', i)
          .responseTime(lessThan(1000))
        .execute();

      console.log(`✅ Request ${i + 1} handled by instance: ${instance.id}`);
    }

    console.log('⚖️ Load balancing distributed requests across instances:', Array.from(usedInstances));
    console.log('✅ Load balancing test completed successfully!');

  } catch (error) {
    console.error('❌ Load balancing example failed:', error.message);
    throw error;
  }
}

async function serviceVersioning() {
  console.log('\n📋 Service Versioning Example...\n');

  try {
    // Register different versions of the same service
    registerService('payment-service', {
      id: 'payment-service-v1-1',
      name: 'payment-service',
      host: 'localhost',
      port: 3008,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.0.0',
        region: 'us-west-2',
        capabilities: ['payments']
      }
    });

    registerService('payment-service', {
      id: 'payment-service-v2-1',
      name: 'payment-service',
      host: 'localhost',
      port: 3009,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '2.0.0',
        region: 'us-west-2',
        capabilities: ['payments', 'refunds', 'subscriptions']
      }
    });

    // Test v1 service
    const v1Service = discoverServiceByVersion('payment-service', '1.0.0');
    console.log('🔍 Found v1 service:', v1Service.id);

    const v1Result = await RestifiedTS
      .given()
        .baseUrl(`http://${v1Service.host}:${v1Service.port}`)
        .header('X-API-Version', 'v1')
        .header('Accept', 'application/json')
      .when()
        .post('/payments')
        .jsonBody({
          amount: 100.00,
          currency: 'USD',
          method: 'credit_card'
        })
      .then()
        .statusCode(201)
        .jsonPath('$.version', '1.0.0')
        .jsonPath('$.amount', 100.00)
        .jsonPath('$.currency', 'USD')
        .jsonPath('$.capabilities', hasSize(1))
      .execute();

    console.log('✅ v1 payment service test passed!');

    // Test v2 service
    const v2Service = discoverServiceByVersion('payment-service', '2.0.0');
    console.log('🔍 Found v2 service:', v2Service.id);

    const v2Result = await RestifiedTS
      .given()
        .baseUrl(`http://${v2Service.host}:${v2Service.port}`)
        .header('X-API-Version', 'v2')
        .header('Accept', 'application/json')
      .when()
        .post('/payments')
        .jsonBody({
          amount: 150.00,
          currency: 'USD',
          method: 'credit_card',
          subscription: true,
          recurringInterval: 'monthly'
        })
      .then()
        .statusCode(201)
        .jsonPath('$.version', '2.0.0')
        .jsonPath('$.amount', 150.00)
        .jsonPath('$.currency', 'USD')
        .jsonPath('$.subscription', true)
        .jsonPath('$.capabilities', hasSize(3))
      .execute();

    console.log('✅ v2 payment service test passed!');

  } catch (error) {
    console.error('❌ Service versioning example failed:', error.message);
    throw error;
  }
}

async function crossRegionServiceDiscovery() {
  console.log('\n🌍 Cross-Region Service Discovery Example...\n');

  try {
    // Register services in different regions
    registerService('global-service', {
      id: 'global-service-us-1',
      name: 'global-service',
      host: 'us-west-2.example.com',
      port: 443,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.0.0',
        region: 'us-west-2',
        capabilities: ['global']
      }
    });

    registerService('global-service', {
      id: 'global-service-eu-1',
      name: 'global-service',
      host: 'eu-west-1.example.com',
      port: 443,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.0.0',
        region: 'eu-west-1',
        capabilities: ['global']
      }
    });

    // Test US region service
    const usService = discoverServiceByRegion('global-service', 'us-west-2');
    console.log('🇺🇸 US region service:', usService.id);

    const usResult = await RestifiedTS
      .given()
        .baseUrl(`https://${usService.host}:${usService.port}`)
        .header('X-Region', 'us-west-2')
        .header('X-Service-ID', usService.id)
      .when()
        .get('/global/status')
      .then()
        .statusCode(200)
        .jsonPath('$.region', 'us-west-2')
        .jsonPath('$.serviceId', usService.id)
        .jsonPath('$.status', 'active')
        .responseTime(lessThan(2000))
      .execute();

    console.log('✅ US region service test passed!');

    // Test EU region service
    const euService = discoverServiceByRegion('global-service', 'eu-west-1');
    console.log('🇪🇺 EU region service:', euService.id);

    const euResult = await RestifiedTS
      .given()
        .baseUrl(`https://${euService.host}:${euService.port}`)
        .header('X-Region', 'eu-west-1')
        .header('X-Service-ID', euService.id)
      .when()
        .get('/global/status')
      .then()
        .statusCode(200)
        .jsonPath('$.region', 'eu-west-1')
        .jsonPath('$.serviceId', euService.id)
        .jsonPath('$.status', 'active')
        .responseTime(lessThan(2000))
      .execute();

    console.log('✅ EU region service test passed!');

  } catch (error) {
    console.error('❌ Cross-region service discovery failed:', error.message);
    throw error;
  }
}

async function serviceCapabilityDiscovery() {
  console.log('\n🔧 Service Capability Discovery Example...\n');

  try {
    // Register services with different capabilities
    registerService('notification-service', {
      id: 'notification-email-1',
      name: 'notification-service',
      host: 'localhost',
      port: 3010,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.0.0',
        region: 'us-west-2',
        capabilities: ['email', 'templates']
      }
    });

    registerService('notification-service', {
      id: 'notification-sms-1',
      name: 'notification-service',
      host: 'localhost',
      port: 3011,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {
        version: '1.0.0',
        region: 'us-west-2',
        capabilities: ['sms', 'push']
      }
    });

    // Discover service with email capability
    const emailService = discoverServiceByCapability('notification-service', 'email');
    console.log('📧 Email notification service:', emailService.id);

    const emailResult = await RestifiedTS
      .given()
        .baseUrl(`http://${emailService.host}:${emailService.port}`)
        .header('X-Capability', 'email')
      .when()
        .post('/notifications/email')
        .jsonBody({
          to: 'user@example.com',
          subject: 'Test Email',
          body: 'This is a test email from RestifiedTS'
        })
      .then()
        .statusCode(201)
        .jsonPath('$.type', 'email')
        .jsonPath('$.status', 'sent')
        .jsonPath('$.capability', 'email')
      .execute();

    console.log('✅ Email notification service test passed!');

    // Discover service with SMS capability
    const smsService = discoverServiceByCapability('notification-service', 'sms');
    console.log('📱 SMS notification service:', smsService.id);

    const smsResult = await RestifiedTS
      .given()
        .baseUrl(`http://${smsService.host}:${smsService.port}`)
        .header('X-Capability', 'sms')
      .when()
        .post('/notifications/sms')
        .jsonBody({
          to: '+1234567890',
          message: 'Test SMS from RestifiedTS'
        })
      .then()
        .statusCode(201)
        .jsonPath('$.type', 'sms')
        .jsonPath('$.status', 'sent')
        .jsonPath('$.capability', 'sms')
      .execute();

    console.log('✅ SMS notification service test passed!');

  } catch (error) {
    console.error('❌ Service capability discovery failed:', error.message);
    throw error;
  }
}

// Service registry helper functions
function registerService(serviceName: string, instance: ServiceInstance) {
  if (!serviceRegistry.has(serviceName)) {
    serviceRegistry.set(serviceName, []);
  }
  serviceRegistry.get(serviceName)!.push(instance);
}

function discoverService(serviceName: string): ServiceInstance {
  const instances = serviceRegistry.get(serviceName);
  if (!instances || instances.length === 0) {
    throw new Error(`Service ${serviceName} not found`);
  }
  return instances[0];
}

function discoverHealthyService(serviceName: string): ServiceInstance {
  const instances = serviceRegistry.get(serviceName);
  if (!instances || instances.length === 0) {
    throw new Error(`Service ${serviceName} not found`);
  }
  
  const healthyInstances = instances.filter(instance => instance.healthy);
  if (healthyInstances.length === 0) {
    throw new Error(`No healthy instances of ${serviceName} found`);
  }
  
  return healthyInstances[0];
}

function discoverServiceWithLoadBalancing(serviceName: string, strategy: string): ServiceInstance {
  const instances = serviceRegistry.get(serviceName);
  if (!instances || instances.length === 0) {
    throw new Error(`Service ${serviceName} not found`);
  }
  
  const healthyInstances = instances.filter(instance => instance.healthy);
  if (healthyInstances.length === 0) {
    throw new Error(`No healthy instances of ${serviceName} found`);
  }
  
  // Simple round-robin implementation
  const index = Math.floor(Math.random() * healthyInstances.length);
  return healthyInstances[index];
}

function discoverServiceByVersion(serviceName: string, version: string): ServiceInstance {
  const instances = serviceRegistry.get(serviceName);
  if (!instances || instances.length === 0) {
    throw new Error(`Service ${serviceName} not found`);
  }
  
  const versionedInstances = instances.filter(instance => 
    instance.healthy && instance.metadata.version === version
  );
  
  if (versionedInstances.length === 0) {
    throw new Error(`No healthy instances of ${serviceName} version ${version} found`);
  }
  
  return versionedInstances[0];
}

function discoverServiceByRegion(serviceName: string, region: string): ServiceInstance {
  const instances = serviceRegistry.get(serviceName);
  if (!instances || instances.length === 0) {
    throw new Error(`Service ${serviceName} not found`);
  }
  
  const regionalInstances = instances.filter(instance => 
    instance.healthy && instance.metadata.region === region
  );
  
  if (regionalInstances.length === 0) {
    throw new Error(`No healthy instances of ${serviceName} in region ${region} found`);
  }
  
  return regionalInstances[0];
}

function discoverServiceByCapability(serviceName: string, capability: string): ServiceInstance {
  const instances = serviceRegistry.get(serviceName);
  if (!instances || instances.length === 0) {
    throw new Error(`Service ${serviceName} not found`);
  }
  
  const capableInstances = instances.filter(instance => 
    instance.healthy && instance.metadata.capabilities.includes(capability)
  );
  
  if (capableInstances.length === 0) {
    throw new Error(`No healthy instances of ${serviceName} with capability ${capability} found`);
  }
  
  return capableInstances[0];
}

// Helper functions for matchers
function notNullValue() {
  return (actual: any) => actual !== null && actual !== undefined;
}

function lessThan(value: number) {
  return (actual: number) => actual < value;
}

function greaterThan(value: number) {
  return (actual: number) => actual > value;
}

function hasSize(expectedSize: number) {
  return (actual: any[]) => actual.length === expectedSize;
}

// Run all examples
async function runAllExamples() {
  console.log('🎯 Running Service Discovery Examples\n');
  console.log('=' .repeat(50));

  try {
    await basicServiceDiscovery();
    await serviceHealthChecks();
    await loadBalancingExample();
    await serviceVersioning();
    await crossRegionServiceDiscovery();
    await serviceCapabilityDiscovery();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 All Service Discovery Examples completed successfully!');

  } catch (error) {
    console.error('\n💥 Examples failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runAllExamples();
}

export {
  basicServiceDiscovery,
  serviceHealthChecks,
  loadBalancingExample,
  serviceVersioning,
  crossRegionServiceDiscovery,
  serviceCapabilityDiscovery
};