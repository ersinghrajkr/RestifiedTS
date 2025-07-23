import { expect } from 'chai';
import { 
  RestifiedTS, 
  restified,
  HttpClient,
  VariableStore,
  ResponseStore,
  Config,
  AuthManager
} from '../../src';

describe('@smoke Framework Smoke Tests', () => {
  
  describe('Core Components Initialization', () => {
    it('should initialize RestifiedTS without errors', () => {
      expect(() => new RestifiedTS()).to.not.throw();
    });

    it('should provide restified singleton', () => {
      expect(restified).to.be.instanceOf(RestifiedTS);
    });

    it('should initialize HttpClient', () => {
      const config = new Config();
      expect(() => new HttpClient(config.getConfig())).to.not.throw();
    });

    it('should initialize VariableStore', () => {
      expect(() => new VariableStore()).to.not.throw();
    });

    it('should initialize ResponseStore', () => {
      expect(() => new ResponseStore()).to.not.throw();
    });

    it('should initialize Config', () => {
      expect(() => new Config()).to.not.throw();
    });

    it('should initialize AuthManager', () => {
      expect(() => new AuthManager()).to.not.throw();
    });
  });

  describe('DSL Chain Validation', () => {
    it('should create complete DSL chain without errors', () => {
      expect(() => {
        restified
          .given()
            .baseURL('https://test.com')
            .header('Content-Type', 'application/json')
            .queryParam('test', 'value')
            .contextVariable('env', 'test')
          .when()
            .get('/test');
      }).to.not.throw();
    });

    it('should handle empty configuration gracefully', () => {
      expect(() => {
        restified.given().when().get('/test');
      }).to.not.throw();
    });
  });

  describe('Export Validation', () => {
    it('should export all required components', () => {
      expect(RestifiedTS).to.exist;
      expect(restified).to.exist;
      expect(HttpClient).to.exist;
      expect(VariableStore).to.exist;
      expect(ResponseStore).to.exist;
      expect(Config).to.exist;
      expect(AuthManager).to.exist;
    });

    it('should have proper class constructors', () => {
      expect(RestifiedTS).to.be.a('function');
      expect(HttpClient).to.be.a('function');
      expect(VariableStore).to.be.a('function');
      expect(ResponseStore).to.be.a('function');
      expect(Config).to.be.a('function');
      expect(AuthManager).to.be.a('function');
    });
  });

  describe('Basic Functionality', () => {
    it('should support method chaining in DSL', () => {
      const givenStep = restified.given();
      expect(givenStep).to.have.property('baseURL');
      expect(givenStep).to.have.property('header');
      expect(givenStep).to.have.property('queryParam');
      expect(givenStep).to.have.property('when');
    });

    it('should provide fluent interface methods', () => {
      const givenStep = restified.given();
      const chained = givenStep
        .baseURL('https://test.com')
        .header('Test', 'Value');
      
      expect(chained).to.equal(givenStep); // Should return same instance for chaining
    });
  });
});