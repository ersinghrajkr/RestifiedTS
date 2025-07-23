import { expect } from 'chai';
import { ResponseStore } from '../../../src/core/stores/ResponseStore';

describe('ResponseStore System Tests @smoke @unit', () => {
  let responseStore: ResponseStore;

  beforeEach(() => {
    responseStore = new ResponseStore();
  });

  describe('Basic Response Operations', () => {
    it('should create ResponseStore instance', () => {
      expect(responseStore).to.be.instanceOf(ResponseStore);
    });

    it('should store and retrieve HTTP responses', () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { message: 'success' },
        request: { url: '/api/test', method: 'GET' },
        config: {},
        timestamp: new Date()
      } as any;

      responseStore.store('test-request', mockResponse);
      const retrieved = responseStore.get('test-request');
      
      expect(retrieved).to.exist;
      expect(retrieved!.status).to.equal(200);
      expect(retrieved!.data.message).to.equal('success');
    });

    it('should check response existence', () => {
      const mockResponse = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        data: { error: 'not found' },
        request: { url: '/api/missing', method: 'GET' },
        config: {},
        timestamp: new Date()
      } as any;

      expect(responseStore.has('missing-request')).to.be.false;
      
      responseStore.store('missing-request', mockResponse);
      expect(responseStore.has('missing-request')).to.be.true;
    });

    it('should remove stored responses', () => {
      const mockResponse = {
        status: 201,
        statusText: 'Created',
        headers: {},
        data: { id: 123 },
        request: { url: '/api/create', method: 'POST' },
        config: {},
        timestamp: new Date()
      } as any;

      responseStore.store('create-request', mockResponse);
      expect(responseStore.has('create-request')).to.be.true;
      
      const removed = responseStore.remove('create-request');
      expect(removed).to.be.true;
      expect(responseStore.has('create-request')).to.be.false;
    });
  });

  describe('Response Querying and Filtering', () => {
    beforeEach(() => {
      // Setup test responses
      const responses = [
        {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { users: [] },
          request: { url: '/api/users', method: 'GET' },
          config: {},
          timestamp: new Date()
        },
        {
          status: 404,
          statusText: 'Not Found',
          headers: { 'content-type': 'application/json' },
          data: { error: 'User not found' },
          request: { url: '/api/users/999', method: 'GET' },
          config: {},
          timestamp: new Date()
        },
        {
          status: 201,
          statusText: 'Created',
          headers: { 'content-type': 'application/json' },
          data: { id: 1, name: 'New User' },
          request: { url: '/api/users', method: 'POST' },
          config: {},
          timestamp: new Date()
        }
      ];

      responses.forEach((response, index) => {
        responseStore.store(`request-${index}`, response as any);
      });
    });

    it('should find responses by status code', () => {
      const successResponses = responseStore.findByStatus(200);
      expect(successResponses).to.have.length(1);
      expect(successResponses[0].response.data.users).to.be.an('array');

      const notFoundResponses = responseStore.findByStatus(404);
      expect(notFoundResponses).to.have.length(1);
      expect(notFoundResponses[0].response.data.error).to.include('not found');
    });

    it('should find responses by URL pattern', () => {
      const userResponses = responseStore.findByUrl('/api/users');
      expect(userResponses).to.have.length.at.least(2);

      const specificUserResponses = responseStore.findByUrl(/\/users\/\d+/);
      expect(specificUserResponses).to.have.length(1);
    });

    it('should list all response keys', () => {
      const keys = responseStore.keys();
      expect(keys).to.include.members(['request-0', 'request-1', 'request-2']);
      expect(keys).to.have.length(3);
    });
  });

  describe('Response Management', () => {
    it('should provide storage statistics', () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { test: 'data' },
        request: { url: '/test', method: 'GET' },
        config: {},
        timestamp: new Date()
      } as any;

      responseStore.store('stats-test', mockResponse);
      
      const stats = responseStore.getStats();
      expect(stats.size).to.equal(1);
      expect(stats.maxSize).to.be.a('number');
      expect(stats.memoryUsage).to.be.a('number');
    });

    it('should clear all responses', () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        request: { url: '/test', method: 'GET' },
        config: {},
        timestamp: new Date()
      } as any;

      responseStore.store('clear-test', mockResponse);
      expect(responseStore.has('clear-test')).to.be.true;
      
      responseStore.clear();
      expect(responseStore.has('clear-test')).to.be.false;
      expect(responseStore.keys()).to.have.length(0);
    });

    it('should handle export and import', () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { export: 'test' },
        request: { url: '/export', method: 'GET' },
        config: {},
        timestamp: new Date()
      } as any;

      responseStore.store('export-test', mockResponse);
      
      const exported = responseStore.export();
      expect(exported).to.have.length(1);
      expect(exported[0].key).to.equal('export-test');
      
      responseStore.clear();
      responseStore.import(exported);
      
      expect(responseStore.has('export-test')).to.be.true;
    });
  });

  describe('TTL and Expiration', () => {
    it('should handle TTL for responses', () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { ttl: 'test' },
        request: { url: '/ttl', method: 'GET' },
        config: {},
        timestamp: new Date()
      } as any;

      responseStore.store('ttl-test', mockResponse, 1000); // 1 second TTL
      expect(responseStore.has('ttl-test')).to.be.true;
      
      const timeToExpiration = responseStore.getTimeToExpiration('ttl-test');
      expect(timeToExpiration).to.be.a('number');
      expect(timeToExpiration).to.be.lessThan(1000);
    });

    it('should update TTL for stored responses', () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        request: { url: '/update-ttl', method: 'GET' },
        config: {},
        timestamp: new Date()
      } as any;

      responseStore.store('update-ttl-test', mockResponse, 1000);
      
      const updated = responseStore.updateTtl('update-ttl-test', 5000);
      expect(updated).to.be.true;
      
      const timeToExpiration = responseStore.getTimeToExpiration('update-ttl-test');
      expect(timeToExpiration).to.be.greaterThan(1000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent responses gracefully', () => {
      expect(responseStore.get('non-existent')).to.be.null;
      expect(responseStore.has('non-existent')).to.be.false;
      expect(responseStore.remove('non-existent')).to.be.false;
    });

    it('should handle invalid TTL updates', () => {
      const updated = responseStore.updateTtl('non-existent', 1000);
      expect(updated).to.be.false;
    });

    it('should handle storage resizing', () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        request: { url: '/resize', method: 'GET' },
        config: {},
        timestamp: new Date()
      } as any;

      responseStore.store('resize-test', mockResponse);
      expect(responseStore.has('resize-test')).to.be.true;
      
      responseStore.resize(0); // Resize to 0 should remove all items
      expect(responseStore.has('resize-test')).to.be.false;
    });

    it('should handle store destruction', () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        request: { url: '/destroy', method: 'GET' },
        config: {},
        timestamp: new Date()
      } as any;

      responseStore.store('destroy-test', mockResponse);
      expect(responseStore.has('destroy-test')).to.be.true;
      
      responseStore.destroy();
      expect(responseStore.has('destroy-test')).to.be.false;
    });
  });
});