import { expect } from 'chai';
import { VariableStore } from '../../../src/core/stores/VariableStore';

describe('VariableStore System Tests @regression @unit', () => {
  let variableStore: VariableStore;

  beforeEach(() => {
    variableStore = new VariableStore();
  });

  describe('Basic Variable Operations', () => {
    it('should create VariableStore instance', () => {
      expect(variableStore).to.be.instanceOf(VariableStore);
    });

    it('should set and get string variables', () => {
      variableStore.set('testString', 'hello world');
      expect(variableStore.get('testString')).to.equal('hello world');
    });

    it('should set and get number variables', () => {
      variableStore.set('testNumber', 42);
      expect(variableStore.get('testNumber')).to.equal(42);
    });

    it('should set and get boolean variables', () => {
      variableStore.set('testBoolean', true);
      expect(variableStore.get('testBoolean')).to.equal(true);
    });

    it('should set and get object variables', () => {
      const testObject = { name: 'test', value: 123 };
      variableStore.set('testObject', testObject);
      expect(variableStore.get('testObject')).to.deep.equal(testObject);
    });

    it('should set and get array variables', () => {
      const testArray = [1, 2, 3, 'test'];
      variableStore.set('testArray', testArray);
      expect(variableStore.get('testArray')).to.deep.equal(testArray);
    });
  });

  describe('Variable Resolution and Templating', () => {
    beforeEach(() => {
      variableStore.set('baseUrl', 'https://api.example.com');
      variableStore.set('version', 'v1');
      variableStore.set('userId', '12345');
      variableStore.set('token', 'abc123');
    });

    it('should resolve simple variable templates', () => {
      const template = '{{baseUrl}}/{{version}}/users';
      const resolved = variableStore.resolve(template);
      expect(resolved).to.equal('https://api.example.com/v1/users');
    });

    it('should resolve nested variable templates', () => {
      const template = '{{baseUrl}}/{{version}}/users/{{userId}}';
      const resolved = variableStore.resolve(template);
      expect(resolved).to.equal('https://api.example.com/v1/users/12345');
    });

    it('should handle missing variables gracefully', () => {
      const template = '{{baseUrl}}/{{missingVar}}/users';
      const resolved = variableStore.resolve(template);
      expect(resolved).to.equal('https://api.example.com/{{missingVar}}/users');
    });

    it('should resolve variables in complex objects', () => {
      const template = {
        url: '{{baseUrl}}/{{version}}/users/{{userId}}',
        headers: {
          Authorization: 'Bearer {{token}}',
          'Content-Type': 'application/json'
        }
      };
      
      const resolved = variableStore.resolveObject(template);
      expect(resolved.url).to.equal('https://api.example.com/v1/users/12345');
      expect(resolved.headers.Authorization).to.equal('Bearer abc123');
    });
  });

  describe('Scope Management', () => {
    it('should support global and local scopes', () => {
      // Global scope
      variableStore.setGlobal('globalVar', 'global value');
      expect(variableStore.get('globalVar')).to.equal('global value');

      // Local scope
      variableStore.setLocal('localVar', 'local value');
      expect(variableStore.get('localVar')).to.equal('local value');
    });

    it('should handle scope precedence correctly', () => {
      variableStore.setGlobal('sameVar', 'global value');
      variableStore.setLocal('sameVar', 'local value');
      
      // Local should override global
      expect(variableStore.get('sameVar')).to.equal('local value');
    });

    it('should list variables by scope', () => {
      variableStore.setGlobal('global1', 'value1');
      variableStore.setGlobal('global2', 'value2');
      variableStore.setLocal('local1', 'value1');
      
      const globalVars = variableStore.getAllGlobal();
      const localVars = variableStore.getAllLocal();
      
      expect(Object.keys(globalVars)).to.include('global1', 'global2');
      expect(Object.keys(localVars)).to.include('local1');
    });
  });

  describe('Built-in Variable Functions', () => {
    it('should generate random UUIDs', () => {
      const resolved = variableStore.resolve('{{$random.uuid}}');
      expect(resolved).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate current timestamp', () => {
      const resolved = variableStore.resolve('{{$date.now}}');
      const timestamp = parseInt(resolved);
      expect(timestamp).to.be.a('number');
      expect(timestamp).to.be.greaterThan(0);
    });

    it('should generate random numbers', () => {
      const resolved = variableStore.resolve('{{$math.random(1,100)}}');
      const number = parseInt(resolved);
      expect(number).to.be.a('number');
      expect(number).to.be.at.least(1);
      expect(number).to.be.at.most(100);
    });

    it('should access environment variables', () => {
      process.env.TEST_VAR = 'test_value';
      const resolved = variableStore.resolve('{{$env.TEST_VAR}}');
      expect(resolved).to.equal('test_value');
    });

    it('should handle Faker.js integration', () => {
      const resolved = variableStore.resolve('{{$faker.name.firstName}}');
      expect(resolved).to.be.a('string');
      expect(resolved.length).to.be.greaterThan(0);
    });
  });

  describe('Variable Persistence and Import/Export', () => {
    it('should export variables to object', () => {
      variableStore.set('var1', 'value1');
      variableStore.set('var2', 'value2');
      
      const exported = variableStore.exportToJson();
      expect(exported).to.be.a('string');
      
      const parsed = JSON.parse(exported);
      expect(parsed).to.have.property('local');
      expect(parsed.local).to.have.property('var1', 'value1');
      expect(parsed.local).to.have.property('var2', 'value2');
    });

    it('should import variables from object', () => {
      const variables = {
        importedVar1: 'imported value 1',
        importedVar2: 'imported value 2'
      };
      
      const jsonData = JSON.stringify({ local: variables });
      variableStore.importFromJson(jsonData);
      expect(variableStore.get('importedVar1')).to.equal('imported value 1');
      expect(variableStore.get('importedVar2')).to.equal('imported value 2');
    });

    it('should handle variable serialization', () => {
      const complexVar = {
        array: [1, 2, 3],
        object: { nested: true },
        date: new Date(),
        number: 42
      };
      
      variableStore.set('complexVar', complexVar);
      const retrieved = variableStore.get('complexVar');
      
      expect(retrieved).to.deep.equal(complexVar);
    });
  });

  describe('Variable Validation and Type Checking', () => {
    it('should validate variable names', () => {
      expect(() => variableStore.set('valid_name', 'value')).to.not.throw();
      expect(() => variableStore.set('valid-name', 'value')).to.not.throw();
      expect(() => variableStore.set('validName123', 'value')).to.not.throw();
    });

    it('should handle special characters in values', () => {
      const specialValue = 'Value with émojis 🚀 and symbols @#$%';
      variableStore.set('specialVar', specialValue);
      expect(variableStore.get('specialVar')).to.equal(specialValue);
    });

    it('should preserve data types', () => {
      variableStore.set('stringVar', 'string');
      variableStore.set('numberVar', 123);
      variableStore.set('booleanVar', false);
      variableStore.set('nullVar', null);
      variableStore.set('undefinedVar', undefined);
      
      expect(variableStore.get('stringVar')).to.be.a('string');
      expect(variableStore.get('numberVar')).to.be.a('number');
      expect(variableStore.get('booleanVar')).to.be.a('boolean');
      expect(variableStore.get('nullVar')).to.be.null;
      expect(variableStore.get('undefinedVar')).to.be.undefined;
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of variables', () => {
      const variableCount = 1000;
      
      for (let i = 0; i < variableCount; i++) {
        variableStore.set(`var_${i}`, `value_${i}`);
      }
      
      expect(variableStore.get('var_0')).to.equal('value_0');
      expect(variableStore.get('var_999')).to.equal('value_999');
    });

    it('should handle complex nested resolution', () => {
      variableStore.set('level1', '{{level2}}');
      variableStore.set('level2', '{{level3}}');
      variableStore.set('level3', 'final value');
      
      const resolved = variableStore.resolve('{{level1}}');
      expect(resolved).to.equal('final value');
    });

    it('should prevent infinite recursion', () => {
      variableStore.set('recursive1', '{{recursive2}}');
      variableStore.set('recursive2', '{{recursive1}}');
      
      expect(() => {
        variableStore.resolve('{{recursive1}}');
      }).to.not.throw();
    });

    it('should handle concurrent access', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => {
          variableStore.set(`concurrent_${i}`, `value_${i}`);
          return variableStore.get(`concurrent_${i}`);
        }));
      }
      
      const results = await Promise.all(promises);
      expect(results).to.have.length(10);
    });
  });

  describe('Integration with RestifiedTS Features', () => {
    it('should integrate with response extraction', () => {
      // Simulate extracted values from API responses
      variableStore.set('extractedUserId', '98765');
      variableStore.set('extractedToken', 'xyz789');
      
      const template = '/users/{{extractedUserId}}/profile?token={{extractedToken}}';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.equal('/users/98765/profile?token=xyz789');
    });

    it('should support test data management', () => {
      const testData = {
        users: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' }
        ],
        config: {
          apiUrl: 'https://test-api.com',
          timeout: 5000
        }
      };
      
      variableStore.set('testData', testData);
      const retrieved = variableStore.get('testData');
      
      expect(retrieved.users).to.have.length(2);
      expect(retrieved.config.apiUrl).to.equal('https://test-api.com');
    });
  });
});