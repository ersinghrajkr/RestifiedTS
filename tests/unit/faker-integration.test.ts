/**
 * Faker Integration Tests
 * 
 * Tests for the new faker functionality in RestifiedTS v1.3.0
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { K6FakerIntegration, K6FakerTemplates } from '../../src/performance/K6FakerIntegration';
import { PerformanceEngine } from '../../src/performance/PerformanceEngine';

describe('Faker Integration Tests @unit @faker', function() {
  
  describe('K6FakerIntegration', function() {
    it('should create K6FakerIntegration instance', function() {
      const faker = new K6FakerIntegration();
      expect(faker).to.be.instanceOf(K6FakerIntegration);
    });

    it('should have available providers', function() {
      const faker = new K6FakerIntegration();
      const providers = faker.getAvailableProviders();
      
      expect(providers).to.have.property('person');
      expect(providers).to.have.property('company');
      expect(providers).to.have.property('internet');
      expect(providers).to.have.property('financial');
      expect(providers.person).to.include('firstName');
      expect(providers.person).to.include('email');
    });

    it('should generate comprehensive faker test', function() {
      const faker = new K6FakerIntegration();
      const testScript = faker.generateComprehensiveFakerTest({
        baseUrl: 'https://api.example.com',
        scenarios: [K6FakerTemplates.ecommerce.userRegistration],
        users: 10,
        duration: '1m'
      });

      expect(testScript).to.be.a('string');
      expect(testScript).to.include('globalThis.faker = faker');
      expect(testScript).to.include('import { faker } from \'@faker-js/faker\'');
      expect(testScript).to.include('10'); // users
      expect(testScript).to.include('1m'); // duration
    });
  });

  describe('K6FakerTemplates', function() {
    it('should have predefined templates', function() {
      expect(K6FakerTemplates).to.have.property('ecommerce');
      expect(K6FakerTemplates).to.have.property('social');
      expect(K6FakerTemplates).to.have.property('financial');
      
      expect(K6FakerTemplates.ecommerce).to.have.property('userRegistration');
      expect(K6FakerTemplates.ecommerce).to.have.property('productPurchase');
    });

    it('should have properly structured templates', function() {
      const template = K6FakerTemplates.ecommerce.userRegistration;
      
      expect(template).to.have.property('name');
      expect(template).to.have.property('endpoint');
      expect(template).to.have.property('method');
      expect(template).to.have.property('dataFields');
      expect(template.method).to.equal('POST');
      expect(template.dataFields).to.be.an('array');
    });
  });

  describe('PerformanceEngine', function() {
    it('should create PerformanceEngine instance', function() {
      const engine = new PerformanceEngine();
      expect(engine).to.be.instanceOf(PerformanceEngine);
    });
  });

  describe('xk6-faker Compatibility', function() {
    it('should generate scripts with globalThis.faker pattern', function() {
      const faker = new K6FakerIntegration();
      const scenarios = [K6FakerTemplates.ecommerce.userRegistration];
      
      const script = faker.generateComprehensiveFakerTest({
        baseUrl: 'https://api.example.com',
        scenarios,
        users: 5,
        duration: '30s'
      });

      // Verify xk6-faker compatibility
      expect(script).to.include('globalThis.faker = faker;');
      expect(script).to.include('import { faker } from \'@faker-js/faker\'');
      
      // Verify RestifiedTS branding
      expect(script).to.include('RestifiedTS xk6-faker Integration');
      expect(script).to.include('exactly like xk6-faker extension');
    });

    it('should support seed configuration', function() {
      const faker = new K6FakerIntegration({ seed: 12345 });
      expect(faker).to.be.instanceOf(K6FakerIntegration);
    });

    it('should support locale configuration', function() {
      const faker = new K6FakerIntegration({ locale: 'de' });
      expect(faker).to.be.instanceOf(K6FakerIntegration);
    });
  });
});