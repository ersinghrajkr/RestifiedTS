import { expect } from 'chai';
import { GivenStep } from '../../src/core/dsl/GivenStep';
import { WhenStep } from '../../src/core/dsl/WhenStep';
import { VariableStore } from '../../src/core/stores/VariableStore';
import { HttpClient } from '../../src/core/clients/HttpClient';
import { Config } from '../../src/core/config/Config';

describe('GivenStep DSL', () => {
  let givenStep: GivenStep;
  let variableStore: VariableStore;
  let httpClient: HttpClient;
  let config: Config;

  beforeEach(() => {
    variableStore = new VariableStore();
    config = new Config();
    httpClient = new HttpClient(config.getConfig());
    givenStep = new GivenStep(variableStore, httpClient, config);
  });

  describe('Configuration Methods', () => {
    it('should set base URL', () => {
      const result = givenStep.baseURL('https://api.example.com');
      expect(result).to.be.instanceOf(GivenStep);
    });

    it('should set headers', () => {
      const result = givenStep.header('Content-Type', 'application/json');
      expect(result).to.be.instanceOf(GivenStep);
    });

    it('should set query parameters', () => {
      const result = givenStep.queryParam('page', '1');
      expect(result).to.be.instanceOf(GivenStep);
    });

    it('should set path parameters', () => {
      const result = givenStep.pathParam('id', '123');
      expect(result).to.be.instanceOf(GivenStep);
    });

    it('should set variables', () => {
      const result = givenStep.variable('userId', '12345');
      expect(result).to.be.instanceOf(GivenStep);
    });

    it('should set timeout', () => {
      const result = givenStep.timeout(5000);
      expect(result).to.be.instanceOf(GivenStep);
    });
  });

  describe('Method Chaining', () => {
    it('should allow method chaining', () => {
      const result = givenStep
        .baseURL('https://api.example.com')
        .header('Authorization', 'Bearer token')
        .queryParam('limit', '10')
        .pathParam('id', '123')
        .variable('env', 'test')
        .timeout(3000);
      
      expect(result).to.be.instanceOf(GivenStep);
    });
  });

  describe('Transition to WhenStep', () => {
    it('should transition to WhenStep via when()', () => {
      const whenStep = givenStep.when();
      expect(whenStep).to.be.instanceOf(WhenStep);
    });
  });
});