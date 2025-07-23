import { expect } from 'chai';
import { ResponseStore } from '../../../src/core/stores/ResponseStore';
import { RestifiedResponse } from '../../../src/types/RestifiedTypes';

describe('ResponseStore System Tests @unit @regression', () => {
  let responseStore: ResponseStore;

  beforeEach(() => {
    responseStore = new ResponseStore({
      maxSize: 10,
      defaultTtl: 5000, // 5 seconds for testing
      enableCleanup: false // Disable auto cleanup for predictable tests
    });
  });

  afterEach(() => {
    responseStore.clear();
  });

  describe('Basic Response Storage', () => {
    it('should create ResponseStore instance', () => {
      expect(responseStore).to.be.instanceOf(ResponseStore);
    });

    it('should store and retrieve HTTP responses', () => {
      const mockResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { message: 'success' },
        config: {},
        request: {
          method: 'GET',
          url: '/api/test',
          headers: {},
          timestamp: new Date(),
          id: 'req-1',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 150,
        size: 1024,
        timestamp: new Date(),
        id: 'res-1'
      };

      responseStore.store('test-request', mockResponse);
      const retrieved = responseStore.get('test-request');
      
      expect(retrieved).to.exist;
      expect(retrieved!.status).to.equal(200);
      expect(retrieved!.data.message).to.equal('success');
    });

    it('should handle different response types', () => {
      const jsonResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: { type: 'json', users: [] },
        headers: { 'content-type': 'application/json' },
        config: {},
        request: {
          method: 'GET',
          url: '/api/json',
          headers: {},
          timestamp: new Date(),
          id: 'req-json',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 100,
        size: 512,
        timestamp: new Date(),
        id: 'res-json'
      };

      const xmlResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: '<users></users>',
        headers: { 'content-type': 'application/xml' },
        config: {},
        request: {
          method: 'GET',
          url: '/api/xml',
          headers: {},
          timestamp: new Date(),
          id: 'req-xml',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 120,
        size: 256,
        timestamp: new Date(),
        id: 'res-xml'
      };

      const textResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: 'plain text response',
        headers: { 'content-type': 'text/plain' },
        config: {},
        request: {
          method: 'GET',
          url: '/api/text',
          headers: {},
          timestamp: new Date(),
          id: 'req-text',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 80,
        size: 128,
        timestamp: new Date(),
        id: 'res-text'
      };

      responseStore.store('json-response', jsonResponse);
      responseStore.store('xml-response', xmlResponse);
      responseStore.store('text-response', textResponse);

      expect(responseStore.get('json-response')!.data.type).to.equal('json');
      expect(responseStore.get('xml-response')!.data).to.equal('<users></users>');
      expect(responseStore.get('text-response')!.data).to.equal('plain text response');
    });

    it('should check if responses exist', () => {
      const testResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: { test: true },
        headers: {},
        config: {},
        request: {
          method: 'GET',
          url: '/test',
          headers: {},
          timestamp: new Date(),
          id: 'req-exists',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 100,
        size: 64,
        timestamp: new Date(),
        id: 'res-exists'
      };

      expect(responseStore.has('exists-test')).to.be.false;
      
      responseStore.store('exists-test', testResponse);
      
      expect(responseStore.has('exists-test')).to.be.true;
    });

    it('should remove responses', () => {
      const testResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: { temp: true },
        headers: {},
        config: {},
        request: {
          method: 'GET',
          url: '/temp',
          headers: {},
          timestamp: new Date(),
          id: 'req-temp',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 50,
        size: 32,
        timestamp: new Date(),
        id: 'res-temp'
      };

      responseStore.store('temp-response', testResponse);
      expect(responseStore.has('temp-response')).to.be.true;
      
      const removed = responseStore.remove('temp-response');
      expect(removed).to.be.true;
      expect(responseStore.has('temp-response')).to.be.false;
    });

    it('should clear all responses', () => {
      const testResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
        headers: {},
        config: {},
        request: {
          method: 'GET',
          url: '/clear-test',
          headers: {},
          timestamp: new Date(),
          id: 'req-clear',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 100,
        size: 64,
        timestamp: new Date(),
        id: 'res-clear'
      };

      responseStore.store('clear-test-1', testResponse);
      responseStore.store('clear-test-2', testResponse);
      
      expect(responseStore.keys()).to.have.length(2);
      
      responseStore.clear();
      
      expect(responseStore.keys()).to.have.length(0);
    });

    it('should list all stored response keys', () => {
      const testResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
        headers: {},
        config: {},
        request: {
          method: 'GET',
          url: '/keys-test',
          headers: {},
          timestamp: new Date(),
          id: 'req-keys',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 100,
        size: 64,
        timestamp: new Date(),
        id: 'res-keys'
      };

      responseStore.store('key1', testResponse);
      responseStore.store('key2', testResponse);
      responseStore.store('key3', testResponse);
      
      const keys = responseStore.keys();
      expect(keys).to.include('key1');
      expect(keys).to.include('key2');
      expect(keys).to.include('key3');
      expect(keys).to.have.length(3);
    });
  });

  describe('Response Querying and Filtering', () => {
    beforeEach(() => {
      // Store multiple responses for testing
      const successResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: { users: [{ id: 1, name: 'John' }] },
        headers: { 'content-type': 'application/json' },
        config: {},
        request: {
          method: 'GET',
          url: '/users',
          headers: {},
          timestamp: new Date(),
          id: 'req-success',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 150,
        size: 256,
        timestamp: new Date(),
        id: 'res-success'
      };

      const createdResponse: RestifiedResponse = {
        status: 201,
        statusText: 'Created',
        data: { id: 2, name: 'Jane' },
        headers: { 'content-type': 'application/json' },
        config: {},
        request: {
          method: 'POST',
          url: '/users',
          headers: {},
          timestamp: new Date(),
          id: 'req-created',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 200,
        size: 128,
        timestamp: new Date(),
        id: 'res-created'
      };

      const errorResponse: RestifiedResponse = {
        status: 404,
        statusText: 'Not Found',
        data: { error: 'Not found' },
        headers: { 'content-type': 'application/json' },
        config: {},
        request: {
          method: 'GET',
          url: '/users/999',
          headers: {},
          timestamp: new Date(),
          id: 'req-error',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 100,
        size: 64,
        timestamp: new Date(),
        id: 'res-error'
      };

      responseStore.store('users-get', successResponse);
      responseStore.store('users-post', createdResponse);
      responseStore.store('error-response', errorResponse);
    });

    it('should find responses by status code', () => {
      const successResponses = responseStore.findByStatus(200);
      const createdResponses = responseStore.findByStatus(201);
      const errorResponses = responseStore.findByStatus(404);

      expect(successResponses).to.have.length(1);
      expect(createdResponses).to.have.length(1);
      expect(errorResponses).to.have.length(1);
      
      expect(successResponses[0].key).to.equal('users-get');
      expect(createdResponses[0].key).to.equal('users-post');
      expect(errorResponses[0].key).to.equal('error-response');
    });

    it('should find responses by URL pattern', () => {
      const usersResponses = responseStore.findByUrl('/users');
      const specificUserResponses = responseStore.findByUrl('/users/999');

      expect(usersResponses).to.have.length(3); // All match /users
      expect(specificUserResponses).to.have.length(1);
      expect(specificUserResponses[0].key).to.equal('error-response');
    });

    it('should find responses by URL regex pattern', () => {
      const usersRegexResponses = responseStore.findByUrl(/\/users/);
      const postOnlyResponses = responseStore.findByUrl(/POST/); // This won't match URLs, but demonstrates regex usage

      expect(usersRegexResponses).to.have.length(3);
      expect(postOnlyResponses).to.have.length(0); // URLs don't contain method
    });

    it('should find responses using custom predicate', () => {
      const jsonResponses = responseStore.find((key, response) => 
        response.headers['content-type'] === 'application/json'
      );

      const fastResponses = responseStore.find((key, response) => 
        response.responseTime < 120
      );

      expect(jsonResponses).to.have.length(3);
      expect(fastResponses).to.have.length(1);
      expect(fastResponses[0].key).to.equal('error-response');
    });

    it('should find responses by time range', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      const recentResponses = responseStore.findByTimeRange(fiveMinutesAgo, fiveMinutesFromNow);
      
      expect(recentResponses).to.have.length(3); // All responses should be recent
    });
  });

  describe('Response Store Statistics', () => {
    it('should provide storage statistics', () => {
      const testResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: { stats: 'test' },
        headers: {},
        config: {},
        request: {
          method: 'GET',
          url: '/stats',
          headers: {},
          timestamp: new Date(),
          id: 'req-stats',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 100,
        size: 64,
        timestamp: new Date(),
        id: 'res-stats'
      };

      responseStore.store('stats-test-1', testResponse);
      responseStore.store('stats-test-2', testResponse);
      
      const stats = responseStore.getStats();
      
      expect(stats).to.exist;
      expect(stats.size).to.equal(2);
      expect(stats.maxSize).to.equal(10);
      expect(stats.memoryUsage).to.be.a('number');
      expect(stats.memoryUsage).to.be.greaterThan(0);
      expect(stats.oldestEntry).to.be.a('date');
      expect(stats.newestEntry).to.be.a('date');
    });
  });

  describe('TTL and Expiration', () => {
    it('should handle TTL expiration', async () => {
      const shortTtlStore = new ResponseStore({
        maxSize: 10,
        defaultTtl: 100, // 100ms TTL
        enableCleanup: false
      });

      const testResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: { expires: true },
        headers: {},
        config: {},
        request: {
          method: 'GET',
          url: '/expires',
          headers: {},
          timestamp: new Date(),
          id: 'req-expires',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 50,
        size: 32,
        timestamp: new Date(),
        id: 'res-expires'
      };

      shortTtlStore.store('expiring-response', testResponse);
      
      // Should exist immediately
      expect(shortTtlStore.has('expiring-response')).to.be.true;
      expect(shortTtlStore.get('expiring-response')).to.exist;
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired and removed
      expect(shortTtlStore.has('expiring-response')).to.be.false;
      expect(shortTtlStore.get('expiring-response')).to.be.null;
    });

    it('should support custom TTL per response', async () => {
      const testResponse: RestifiedResponse = {
        status: 200,
        statusText: 'OK',
        data: { customTtl: true },
        headers: {},
        config: {},
        request: {
          method: 'GET',
          url: '/custom-ttl',
          headers: {},
          timestamp: new Date(),
          id: 'req-custom',
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 100,
        size: 64,
        timestamp: new Date(),
        id: 'res-custom'
      };

      // Store with custom short TTL
      responseStore.store('custom-ttl-response', testResponse, 50); // 50ms TTL
      
      expect(responseStore.has('custom-ttl-response')).to.be.true;
      
      // Wait for custom TTL expiration
      await new Promise(resolve => setTimeout(resolve, 75));
      
      expect(responseStore.has('custom-ttl-response')).to.be.false;
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle retrieving non-existent responses', () => {
      const nonExistent = responseStore.get('non-existent-key');
      expect(nonExistent).to.be.null;
      
      const hasNonExistent = responseStore.has('non-existent-key');
      expect(hasNonExistent).to.be.false;
    });

    it('should handle removing non-existent responses', () => {
      const removed = responseStore.remove('non-existent-key');
      expect(removed).to.be.false;
    });

    it('should handle storage size limits', () => {
      const limitedStore = new ResponseStore({
        maxSize: 2, // Very small limit
        enableCleanup: false
      });

      const createTestResponse = (id: string): RestifiedResponse => ({
        status: 200,
        statusText: 'OK',
        data: { id },
        headers: {},
        config: {},
        request: {
          method: 'GET',
          url: `/test/${id}`,
          headers: {},
          timestamp: new Date(),
          id: `req-${id}`,
          body: undefined,
          params: {},
          queryParams: {}
        },
        responseTime: 100,
        size: 64,
        timestamp: new Date(),
        id: `res-${id}`
      });

      // Fill up to limit
      limitedStore.store('response1', createTestResponse('1'));
      limitedStore.store('response2', createTestResponse('2'));
      
      expect(limitedStore.keys()).to.have.length(2);
      
      // This should evict the oldest
      limitedStore.store('response3', createTestResponse('3'));
      
      expect(limitedStore.keys()).to.have.length(2);
      expect(limitedStore.has('response1')).to.be.false; // Should be evicted
      expect(limitedStore.has('response2')).to.be.true;
      expect(limitedStore.has('response3')).to.be.true;
    });
  });
});