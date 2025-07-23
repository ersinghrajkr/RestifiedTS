import { expect } from 'chai';
import { VariableStore } from '../../src/core/stores/VariableStore';

describe('Variable Store and Templating Tests', () => {
  let variableStore: VariableStore;

  beforeEach(() => {
    variableStore = new VariableStore();
  });

  describe('Variable Store Basic Operations', () => {
    it('should initialize variable store without errors', () => {
      expect(variableStore).to.be.instanceOf(VariableStore);
    });

    it('should set and get variables', () => {
      variableStore.set('testVar', 'testValue');
      const value = variableStore.get('testVar');
      
      expect(value).to.equal('testValue');
    });

    it('should handle different data types', () => {
      variableStore.set('stringVar', 'string value');
      variableStore.set('numberVar', 42);
      variableStore.set('booleanVar', true);
      variableStore.set('objectVar', { key: 'value' });
      variableStore.set('arrayVar', [1, 2, 3]);
      
      expect(variableStore.get('stringVar')).to.equal('string value');
      expect(variableStore.get('numberVar')).to.equal(42);
      expect(variableStore.get('booleanVar')).to.equal(true);
      expect(variableStore.get('objectVar')).to.deep.equal({ key: 'value' });
      expect(variableStore.get('arrayVar')).to.deep.equal([1, 2, 3]);
    });

    it('should return undefined for non-existent variables', () => {
      const value = variableStore.get('nonExistentVar');
      expect(value).to.be.undefined;
    });

    it('should check if variables exist', () => {
      variableStore.set('existingVar', 'value');
      
      expect(variableStore.has('existingVar')).to.be.true;
      expect(variableStore.has('nonExistentVar')).to.be.false;
    });

    it('should delete variables', () => {
      variableStore.set('tempVar', 'temporary');
      expect(variableStore.has('tempVar')).to.be.true;
      
      variableStore.delete('tempVar');
      expect(variableStore.has('tempVar')).to.be.false;
    });

    it('should clear all variables', () => {
      variableStore.set('var1', 'value1');
      variableStore.set('var2', 'value2');
      
      expect(variableStore.has('var1')).to.be.true;
      expect(variableStore.has('var2')).to.be.true;
      
      variableStore.clearAll();
      
      expect(variableStore.has('var1')).to.be.false;
      expect(variableStore.has('var2')).to.be.false;
    });

    it('should get all variable names', () => {
      variableStore.set('var1', 'value1');
      variableStore.set('var2', 'value2');
      variableStore.set('var3', 'value3');
      
      const keys = variableStore.getKeys();
      expect(keys).to.include('var1');
      expect(keys).to.include('var2');
      expect(keys).to.include('var3');
      expect(keys).to.have.length(3);
    });
  });

  describe('Variable Scoping', () => {
    it('should support global and local scopes', () => {
      // Global scope
      variableStore.setGlobal('globalVar', 'globalValue');
      
      // Local scope
      variableStore.setLocal('localVar', 'localValue');
      
      expect(variableStore.getGlobal('globalVar')).to.equal('globalValue');
      expect(variableStore.getLocal('localVar')).to.equal('localValue');
    });

    it('should prioritize local over global variables', () => {
      variableStore.setGlobal('conflictVar', 'globalValue');
      variableStore.setLocal('conflictVar', 'localValue');
      
      // get() should return local value when both exist
      expect(variableStore.get('conflictVar')).to.equal('localValue');
    });

    it('should fall back to global when local not found', () => {
      variableStore.setGlobal('fallbackVar', 'globalValue');
      
      // get() should return global value when local doesn't exist  
      expect(variableStore.get('fallbackVar')).to.equal('globalValue');
    });

    it('should clear local scope only', () => {
      variableStore.setGlobal('globalVar', 'globalValue');
      variableStore.setLocal('localVar', 'localValue');
      
      variableStore.clearLocal();
      
      expect(variableStore.getGlobal('globalVar')).to.equal('globalValue');
      expect(variableStore.getLocal('localVar')).to.be.undefined;
    });

    it('should clear global scope only', () => {
      variableStore.setGlobal('globalVar', 'globalValue');
      variableStore.setLocal('localVar', 'localValue');
      
      variableStore.clearGlobal();
      
      expect(variableStore.getGlobal('globalVar')).to.be.undefined;
      expect(variableStore.getLocal('localVar')).to.equal('localValue');
    });
  });

  describe('Template Variable Resolution', () => {
    it('should resolve simple template variables', () => {
      variableStore.set('name', 'RestifiedTS');
      variableStore.set('version', '1.0.0');
      
      const template = 'Welcome to {{name}} version {{version}}';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.equal('Welcome to RestifiedTS version 1.0.0');
    });

    it('should handle multiple occurrences of same variable', () => {
      variableStore.set('api', 'RestAPI');
      
      const template = '{{api}} testing with {{api}} framework';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.equal('RestAPI testing with RestAPI framework');
    });

    it('should handle nested object variable access', () => {
      variableStore.set('user', {
        profile: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        id: 123
      });
      
      const template = 'User: {{user.profile.name}} ({{user.profile.email}}) ID: {{user.id}}';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.equal('User: John Doe (john@example.com) ID: 123');
    });

    it('should handle array access in templates', () => {
      variableStore.set('colors', ['red', 'green', 'blue']);
      
      const template = 'Primary: {{colors.0}}, Secondary: {{colors.1}}, Tertiary: {{colors.2}}';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.equal('Primary: red, Secondary: green, Tertiary: blue');
    });

    it('should leave unresolved variables unchanged', () => {
      variableStore.set('knownVar', 'known');
      
      const template = 'Known: {{knownVar}}, Unknown: {{unknownVar}}';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.equal('Known: known, Unknown: {{unknownVar}}');
    });

    it('should handle empty template strings', () => {
      const resolved = variableStore.resolve('');
      expect(resolved).to.equal('');
    });

    it('should handle templates with no variables', () => {
      const template = 'This is a plain string with no variables';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.equal(template);
    });
  });

  describe('Built-in Variable Functions', () => {
    it('should support Faker.js integration', () => {
      const template = 'Name: {{$faker.name.fullName}}, Email: {{$faker.internet.email}}';
      const resolved = variableStore.resolve(template);
      
      // Should not contain the original template syntax
      expect(resolved).to.not.include('{{$faker');
      expect(resolved).to.not.include('}}');
      
      // Should contain generated values
      expect(resolved).to.include('Name: ');
      expect(resolved).to.include('Email: ');
    });

    it('should support random UUID generation', () => {
      const template = 'Request ID: {{$random.uuid}}';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.match(/Request ID: [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
    });

    it('should support date/time functions', () => {
      const template = 'Timestamp: {{$date.now}}, ISO: {{$date.iso}}';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.include('Timestamp: ');
      expect(resolved).to.include('ISO: ');
      expect(resolved).to.not.include('{{$date');
    });

    it('should support math functions', () => {
      const template = 'Random: {{$math.random(1,100)}}, Pi: {{$math.pi}}';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.include('Random: ');
      expect(resolved).to.include('Pi: 3.14');
      expect(resolved).to.not.include('{{$math');
    });

    it('should support environment variables', () => {
      // Set a test environment variable
      process.env.TEST_VAR = 'test_environment_value';
      
      const template = 'Env: {{$env.TEST_VAR}}, Node: {{$env.NODE_ENV}}';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.include('Env: test_environment_value');
      
      // Clean up
      delete process.env.TEST_VAR;
    });

    it('should support string manipulation functions', () => {
      variableStore.set('text', 'hello world');
      
      const template = 'Upper: {{$string.upper(text)}}, Lower: {{$string.lower(text)}}';
      const resolved = variableStore.resolve(template);
      
      expect(resolved).to.include('Upper: HELLO WORLD');
      expect(resolved).to.include('Lower: hello world');
    });
  });

  describe('Variable Persistence and Import/Export', () => {
    it('should export variables to JSON', () => {
      variableStore.set('var1', 'value1');
      variableStore.set('var2', 42);
      variableStore.set('var3', { nested: 'object' });
      
      const exported = variableStore.exportToJson();
      const parsed = JSON.parse(exported);
      
      expect(parsed).to.have.property('local');
      expect(parsed.local).to.have.property('var1', 'value1');
      expect(parsed.local).to.have.property('var2', 42);
      expect(parsed.local).to.have.property('var3');
      expect(parsed.local.var3).to.deep.equal({ nested: 'object' });
    });

    it('should import variables from JSON', () => {
      const importData = JSON.stringify({
        local: {
          importVar1: 'importValue1',
          importVar2: 100,
          importVar3: { imported: true }
        }
      });
      
      variableStore.importFromJson(importData);
      
      expect(variableStore.get('importVar1')).to.equal('importValue1');
      expect(variableStore.get('importVar2')).to.equal(100);
      expect(variableStore.get('importVar3')).to.deep.equal({ imported: true });
    });

    it('should handle merge strategy during import', () => {
      variableStore.set('existingVar', 'original');
      
      const importData = JSON.stringify({
        local: {
          existingVar: 'updated',
          newVar: 'new'
        }
      });
      
      // Import (should update existing)
      variableStore.importFromJson(importData);
      
      expect(variableStore.get('existingVar')).to.equal('updated');
      expect(variableStore.get('newVar')).to.equal('new');
    });

    it('should handle replace strategy during import', () => {
      variableStore.set('existingVar', 'original');
      variableStore.set('toBeRemoved', 'removed');
      
      const importData = JSON.stringify({
        local: {
          existingVar: 'updated',
          newVar: 'new'
        }
      });
      
      // Import (replaces existing variables)
      variableStore.importFromJson(importData);
      
      expect(variableStore.get('existingVar')).to.equal('updated');
      expect(variableStore.get('newVar')).to.equal('new');
      expect(variableStore.get('toBeRemoved')).to.equal('removed'); // Import doesn't clear existing
    });
  });
});