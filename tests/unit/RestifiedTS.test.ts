import { expect } from 'chai';
import { RestifiedTS, restified } from '../../src/core/dsl/RestifiedTS';
import { GivenStep } from '../../src/core/dsl/GivenStep';

describe('RestifiedTS Core DSL', () => {
  
  describe('RestifiedTS Class', () => {
    it('should create a new instance', () => {
      const instance = new RestifiedTS();
      expect(instance).to.be.instanceOf(RestifiedTS);
    });

    it('should provide given() method that returns GivenStep', () => {
      const instance = new RestifiedTS();
      const givenStep = instance.given();
      expect(givenStep).to.be.instanceOf(GivenStep);
    });

    it('should have static given() method', () => {
      const givenStep = restified.given();
      expect(givenStep).to.be.instanceOf(GivenStep);
    });
  });

  describe('restified singleton', () => {
    it('should be an instance of RestifiedTS', () => {
      expect(restified).to.be.instanceOf(RestifiedTS);
    });

    it('should provide fluent API starting with given()', () => {
      const givenStep = restified.given();
      expect(givenStep).to.be.instanceOf(GivenStep);
    });

    it('should maintain same instance across calls', () => {
      const instance1 = restified;
      const instance2 = restified;
      expect(instance1).to.equal(instance2);
    });
  });

  describe('Framework Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => {
        new RestifiedTS();
      }).to.not.throw();
    });

    it('should be ready for fluent API usage', () => {
      expect(() => {
        restified.given();
      }).to.not.throw();
    });
  });
});