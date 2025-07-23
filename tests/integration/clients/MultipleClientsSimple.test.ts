import { expect } from 'chai';
import { restified } from '../../../src';

describe('Multiple Clients Configuration Tests @integration @smoke', () => {
  beforeEach(() => {
    // Clear any existing state before each test
    if (restified.clearAll) {
      restified.clearAll();
    }
  });

  afterEach(() => {
    // Clean up state after each test
    if (restified.clearAll) {
      restified.clearAll();
    }
  });

  describe('Basic Multiple Clients', () => {
    it('should create and configure multiple service clients', () => {
      // Configure client for User Service
      restified.createClient('userService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service': 'user-service'
        }
      });
      
      // Configure client for Posts Service (simulating different service)
      restified.createClient('postsService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service': 'posts-service'
        }
      });
      
      // Verify clients were created successfully
      const clientNames = restified.getClientNames();
      expect(clientNames).to.include('userService');
      expect(clientNames).to.include('postsService');
    });

    it('should make requests using different clients', async () => {
      // Configure clients
      restified.createClient('userService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service': 'user-service'
        }
      });
      
      restified.createClient('postsService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service': 'posts-service'
        }
      });

      // Test User Service client
      const userResponse = await restified
        .useClient('userService')
        .given()
          .header('X-Test-Type', 'user-fetch')
        .when()
          .get('/users/1')
        .then()
          .statusCode(200)
          .jsonPath('$.id', 1)
          .jsonPath('$.name', (name: string) => name.length > 0)
          .jsonPath('$.email', (email: string) => email.includes('@'))
        .execute();

      expect(userResponse.data).to.exist;
      expect(userResponse.data.id).to.equal(1);
      expect(userResponse.data.name).to.be.a('string');

      // Test Posts Service client
      const postsResponse = await restified
        .useClient('postsService')
        .given()
          .header('X-Test-Type', 'posts-fetch')
        .when()
          .get('/posts/1')
        .then()
          .statusCode(200)
          .jsonPath('$.id', 1)
          .jsonPath('$.userId', 1)
          .jsonPath('$.title', (title: string) => title.length > 0)
        .execute();

      expect(postsResponse.data).to.exist;
      expect(postsResponse.data.id).to.equal(1);
      expect(postsResponse.data.userId).to.equal(1);
    });
  });

  describe('Client Configuration Management', () => {
    it('should create client with custom timeout configuration', () => {
      // Create client with custom configuration
      restified.createClient('customService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 3000, // Custom shorter timeout
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'true'
        }
      });

      const clientNames = restified.getClientNames();
      expect(clientNames).to.include('customService');
    });

    it('should use client with custom configuration', async () => {
      // Create client with custom configuration
      restified.createClient('configService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Config-Test': 'enabled'
        }
      });

      // Test the configured client
      const response = await restified
        .useClient('configService')
        .given()
          .header('X-Test', 'config-test')
        .when()
          .get('/users/1')
        .then()
          .statusCode(200)
          .jsonPath('$.id', 1)
          .jsonPath('$.name', (name: string) => name.length > 0)
        .execute();

      expect(response.data).to.exist;
      expect(response.data.id).to.equal(1);
    });
  });

  describe('Environment Specific Clients', () => {
    it('should configure clients based on environment', () => {
      const environment = process.env.NODE_ENV || 'test';
      
      // Configure environment-specific client
      restified.createClient('envService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: environment === 'production' ? 10000 : 5000,
        headers: {
          'X-Environment': environment,
          'Content-Type': 'application/json'
        }
      });

      const clientNames = restified.getClientNames();
      expect(clientNames).to.include('envService');
    });

    it('should use environment-specific client configuration', async () => {
      const environment = process.env.NODE_ENV || 'test';
      
      // Configure environment-specific client
      restified.createClient('envTestService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: environment === 'production' ? 10000 : 5000,
        headers: {
          'X-Environment': environment,
          'Content-Type': 'application/json'
        }
      });

      // Test environment-specific behavior
      const response = await restified
        .useClient('envTestService')
        .given()
          .header('X-Test-Environment', environment)
        .when()
          .get('/users/1')
        .then()
          .statusCode(200)
          .jsonPath('$.id', 1)
          .jsonPath('$.name', (name: string) => name.length > 0)
        .execute();

      expect(response.data).to.exist;
      expect(response.data.id).to.equal(1);
    });
  });

  describe('Client Pool Simulation', () => {
    it('should create multiple instances for load balancing', () => {
      // Create multiple instances of the same service for load balancing
      const serviceInstances = [
        'https://jsonplaceholder.typicode.com',
        'https://jsonplaceholder.typicode.com', // Simulating different instances
        'https://jsonplaceholder.typicode.com'
      ];
      
      // Configure client pool
      serviceInstances.forEach((baseURL, index) => {
        restified.createClient(`apiService${index + 1}`, {
          baseURL,
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Instance': `instance-${index + 1}`
          }
        });
      });

      // Verify all clients were created
      const clientNames = restified.getClientNames();
      expect(clientNames).to.include('apiService1');
      expect(clientNames).to.include('apiService2');
      expect(clientNames).to.include('apiService3');
    });

    it('should distribute requests across client pool', async () => {
      // Configure client pool
      const serviceInstances = [
        'https://jsonplaceholder.typicode.com',
        'https://jsonplaceholder.typicode.com',
        'https://jsonplaceholder.typicode.com'
      ];
      
      serviceInstances.forEach((baseURL, index) => {
        restified.createClient(`poolService${index + 1}`, {
          baseURL,
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Instance': `instance-${index + 1}`
          }
        });
      });

      // Test round-robin client selection
      const results = [];
      for (let i = 0; i < 3; i++) {
        const clientIndex = (i % serviceInstances.length) + 1;
        const clientName = `poolService${clientIndex}`;
        
        const response = await restified
          .useClient(clientName)
          .given()
            .header('X-Request-Number', i.toString())
          .when()
            .get('/users/1')
          .then()
            .statusCode(200)
            .jsonPath('$.id', 1)
            .jsonPath('$.name', (name: string) => name.length > 0)
          .execute();
        
        results.push({
          request: i,
          client: clientName,
          userId: response.data.id
        });
      }

      expect(results).to.have.length(3);
      
      // Verify requests were distributed across different clients
      const clientsUsed = [...new Set(results.map(r => r.client))];
      expect(clientsUsed).to.have.length(3);
      expect(clientsUsed).to.include('poolService1');
      expect(clientsUsed).to.include('poolService2');
      expect(clientsUsed).to.include('poolService3');
    });
  });

  describe('Client Management', () => {
    it('should list all configured clients', () => {
      // Create multiple clients
      restified.createClient('client1', { 
        baseURL: 'https://jsonplaceholder.typicode.com' 
      });
      restified.createClient('client2', { 
        baseURL: 'https://jsonplaceholder.typicode.com' 
      });
      restified.createClient('client3', { 
        baseURL: 'https://jsonplaceholder.typicode.com' 
      });

      const clientNames = restified.getClientNames();
      expect(clientNames).to.be.an('array');
      expect(clientNames).to.include('client1');
      expect(clientNames).to.include('client2');
      expect(clientNames).to.include('client3');
    });

    it('should switch between different clients', async () => {
      // Create two different clients
      restified.createClient('serviceA', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        headers: { 'X-Service': 'A' }
      });
      
      restified.createClient('serviceB', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        headers: { 'X-Service': 'B' }
      });

      // Test first client
      const responseA = await restified
        .useClient('serviceA')
        .given()
          .header('X-Test', 'service-a')
        .when()
          .get('/users/1')
        .then()
          .statusCode(200)
          .jsonPath('$.id', 1)
        .execute();

      expect(responseA.data.id).to.equal(1);

      // Test second client
      const responseB = await restified
        .useClient('serviceB')
        .given()
          .header('X-Test', 'service-b')
        .when()
          .get('/users/2')
        .then()
          .statusCode(200)
          .jsonPath('$.id', 2)
        .execute();

      expect(responseB.data.id).to.equal(2);
    });
  });

  describe('Integration Workflow', () => {
    it('should orchestrate multiple clients in a typical workflow', async () => {
      // Configure clients for a typical microservices workflow
      restified.createClient('userService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 5000,
        headers: { 'X-Service': 'user' }
      });
      
      restified.createClient('postsService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 5000,
        headers: { 'X-Service': 'posts' }
      });
      
      restified.createClient('commentsService', {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 5000,
        headers: { 'X-Service': 'comments' }
      });

      // Step 1: Get user information
      const userResponse = await restified
        .useClient('userService')
        .given()
        .when()
          .get('/users/1')
        .then()
          .statusCode(200)
          .jsonPath('$.id', 1)
          .extract('$.id', 'userId')
        .execute();

      const userId = restified.getGlobalVariable('userId');
      expect(userId).to.equal(1);

      // Step 2: Get user's posts
      const postsResponse = await restified
        .useClient('postsService')
        .given()
        .when()
          .get(`/posts?userId=${userId}`)
        .then()
          .statusCode(200)
          .jsonPath('$[0].userId', userId)
          .extract('$[0].id', 'postId')
        .execute();

      const postId = restified.getGlobalVariable('postId');
      expect(postId).to.be.a('number');

      // Step 3: Get comments for the first post
      const commentsResponse = await restified
        .useClient('commentsService')
        .given()
        .when()
          .get(`/comments?postId=${postId}`)
        .then()
          .statusCode(200)
          .jsonPath('$[0].postId', postId)
        .execute();

      expect(commentsResponse.data).to.be.an('array');
      expect(commentsResponse.data.length).to.be.greaterThan(0);
      expect(commentsResponse.data[0].postId).to.equal(postId);
    });
  });
});