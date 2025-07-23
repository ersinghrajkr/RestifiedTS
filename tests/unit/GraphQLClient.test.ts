import { expect } from 'chai';
import { GraphQLClient, GraphQLManager } from '../../src/core/clients';
import { Config } from '../../src/core/config/Config';

describe('GraphQL Client Tests @unit @integration', () => {
  let config: Config;
  let graphQLClient: GraphQLClient;
  let graphQLManager: GraphQLManager;

  beforeEach(() => {
    config = new Config();
    graphQLClient = new GraphQLClient({ 
      endpoint: 'https://api.example.com/graphql',
      introspection: false 
    });
    graphQLManager = new GraphQLManager();
  });

  describe('GraphQLClient Initialization', () => {
    it('should initialize GraphQL client without errors', () => {
      expect(graphQLClient).to.be.instanceOf(GraphQLClient);
    });

    it('should have query method', () => {
      expect(graphQLClient).to.have.property('query');
      expect(typeof graphQLClient.query).to.equal('function');
    });

    it('should have mutation method', () => {
      expect(graphQLClient).to.have.property('mutation');
      expect(typeof graphQLClient.mutation).to.equal('function');
    });

    it('should have subscription method', () => {
      expect(graphQLClient).to.have.property('subscription');
      expect(typeof graphQLClient.subscription).to.equal('function');
    });

    it('should have execute method', () => {
      expect(graphQLClient).to.have.property('execute');
      expect(typeof graphQLClient.execute).to.equal('function');
    });

    it('should have validateQuery method', () => {
      expect(graphQLClient).to.have.property('validateQuery');
      expect(typeof graphQLClient.validateQuery).to.equal('function');
    });

    it('should have analyzeQuery method', () => {
      expect(graphQLClient).to.have.property('analyzeQuery');
      expect(typeof graphQLClient.analyzeQuery).to.equal('function');
    });

    it('should have queryBuilder method', () => {
      expect(graphQLClient).to.have.property('queryBuilder');
      expect(typeof graphQLClient.queryBuilder).to.equal('function');
    });
  });

  describe('GraphQLManager', () => {
    it('should initialize GraphQL manager without errors', () => {
      expect(graphQLManager).to.be.instanceOf(GraphQLManager);
    });

    it('should support endpoint registration', () => {
      expect(() => {
        graphQLManager.addEndpoint({
          name: 'testClient',
          endpoint: 'https://api.example.com/graphql'
        });
      }).to.not.throw();
    });

    it('should retrieve registered clients', () => {
      graphQLManager.addEndpoint({
        name: 'testClient',
        endpoint: 'https://api.example.com/graphql'
      });
      
      const client = graphQLManager.getClient('testClient');
      expect(client).to.exist;
    });

    it('should list endpoints', () => {
      graphQLManager.addEndpoint({
        name: 'testClient1',
        endpoint: 'https://api1.example.com/graphql'
      });
      
      graphQLManager.addEndpoint({
        name: 'testClient2',
        endpoint: 'https://api2.example.com/graphql'
      });

      const endpoints = graphQLManager.getEndpoints();
      expect(endpoints).to.include('testClient1');
      expect(endpoints).to.include('testClient2');
      expect(endpoints).to.have.length(2);
    });

    it('should set active endpoint', () => {
      graphQLManager.addEndpoint({
        name: 'testClient',
        endpoint: 'https://api.example.com/graphql'
      });

      graphQLManager.setActiveEndpoint('testClient');
      
      const activeClient = graphQLManager.getActiveClient();
      expect(activeClient).to.exist;
    });

    it('should remove endpoints', () => {
      graphQLManager.addEndpoint({
        name: 'testClient',
        endpoint: 'https://api.example.com/graphql'
      });

      expect(graphQLManager.getEndpoints()).to.include('testClient');
      
      const removed = graphQLManager.removeEndpoint('testClient');
      expect(removed).to.be.true;
      expect(graphQLManager.getEndpoints()).to.not.include('testClient');
    });
  });

  describe('GraphQL Query Validation', () => {
    it('should validate basic query structure', () => {
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
            email
          }
        }
      `;
      
      const validation = graphQLClient.validateQuery(query);
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.empty;
    });

    it('should validate basic mutation structure', () => {
      const mutation = `
        mutation CreateUser($input: UserInput!) {
          createUser(input: $input) {
            id
            name
            email
          }
        }
      `;
      
      const validation = graphQLClient.validateQuery(mutation);
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.empty;
    });

    it('should validate basic subscription structure', () => {
      const subscription = `
        subscription OnUserCreated {
          userCreated {
            id
            name
            email
          }
        }
      `;
      
      const validation = graphQLClient.validateQuery(subscription);
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.empty;
    });

    it('should detect invalid query syntax', () => {
      const invalidQuery = 'invalid graphql syntax {';
      
      const validation = graphQLClient.validateQuery(invalidQuery);
      expect(validation.valid).to.be.false;
      expect(validation.errors).to.not.be.empty;
    });

    it('should detect empty queries', () => {
      const emptyQuery = '';
      
      const validation = graphQLClient.validateQuery(emptyQuery);
      expect(validation.valid).to.be.false;
      expect(validation.errors).to.include('Query cannot be empty');
    });

    it('should detect unbalanced braces', () => {
      const unbalancedQuery = 'query { user { id name }';
      
      const validation = graphQLClient.validateQuery(unbalancedQuery);
      expect(validation.valid).to.be.false;
      expect(validation.errors).to.include('Unbalanced braces in query');
    });
  });

  describe('GraphQL Query Analysis', () => {
    it('should analyze query operation type', () => {
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
          }
        }
      `;
      
      const analysis = graphQLClient.analyzeQuery(query);
      expect(analysis.operationType).to.equal('query');
      expect(analysis.operationName).to.equal('GetUser');
    });

    it('should analyze mutation operation type', () => {
      const mutation = `
        mutation CreateUser($input: UserInput!) {
          createUser(input: $input) {
            id
            name
          }
        }
      `;
      
      const analysis = graphQLClient.analyzeQuery(mutation);
      expect(analysis.operationType).to.equal('mutation');
      expect(analysis.operationName).to.equal('CreateUser');
    });

    it('should extract variables from query', () => {
      const query = `
        query GetUser($id: ID!, $includeEmail: Boolean) {
          user(id: $id) {
            id
            name
            email @include(if: $includeEmail)
          }
        }
      `;
      
      const analysis = graphQLClient.analyzeQuery(query);
      expect(analysis.variables).to.include('id');
      expect(analysis.variables).to.include('includeEmail');
    });

    it('should handle shorthand queries', () => {
      const query = `{ user { id name } }`;
      
      const analysis = graphQLClient.analyzeQuery(query);
      expect(analysis.operationType).to.equal('query');
      expect(analysis.operationName).to.be.undefined;
    });
  });

  describe('GraphQL Configuration', () => {
    it('should get current configuration', () => {
      const config = graphQLClient.getConfig();
      expect(config).to.have.property('endpoint');
      expect(config.endpoint).to.equal('https://api.example.com/graphql');
    });

    it('should update configuration', () => {
      graphQLClient.updateConfig({
        headers: { 'Authorization': 'Bearer token123' },
        introspection: true
      });

      const config = graphQLClient.getConfig();
      expect(config.headers).to.have.property('Authorization');
      expect(config.introspection).to.be.true;
    });
  });

  describe('GraphQL Query Builder', () => {
    it('should create query builder', () => {
      const builder = graphQLClient.queryBuilder();
      expect(builder).to.exist;
      expect(typeof builder.query).to.equal('function');
      expect(typeof builder.mutation).to.equal('function');
      expect(typeof builder.field).to.equal('function');
      expect(typeof builder.variable).to.equal('function');
      expect(typeof builder.build).to.equal('function');
    });

    it('should build basic query', () => {
      const builder = graphQLClient.queryBuilder();
      const queryString = builder
        .query('GetUser')
        .contextVariable('id', 'ID!', '123')
        .field('user', { id: '$id' }, ['id', 'name', 'email'])
        .build();

      expect(queryString).to.include('query GetUser');
      expect(queryString).to.include('$id: ID!');
      expect(queryString).to.include('user(id: $id)');
    });

    it('should build basic mutation', () => {
      const builder = graphQLClient.queryBuilder();
      const mutationString = builder
        .mutation('CreateUser')
        .contextVariable('input', 'UserInput!', { name: 'Test', email: 'test@example.com' })
        .field('createUser', { input: '$input' }, ['id', 'name'])
        .build();

      expect(mutationString).to.include('mutation CreateUser');
      expect(mutationString).to.include('$input: UserInput!');
      expect(mutationString).to.include('createUser(input: $input)');
    });
  });

  describe('GraphQL Template Management', () => {
    it('should add query templates', () => {
      expect(() => {
        graphQLManager.addTemplate({
          name: 'getUserTemplate',
          query: 'query GetUser($id: ID!) { user(id: $id) { id name } }',
          variables: { id: '123' },
          description: 'Get user by ID'
        });
      }).to.not.throw();
    });

    it('should retrieve query templates', () => {
      graphQLManager.addTemplate({
        name: 'getUserTemplate',
        query: 'query GetUser($id: ID!) { user(id: $id) { id name } }',
        variables: { id: '123' }
      });

      const template = graphQLManager.getTemplate('getUserTemplate');
      expect(template).to.exist;
      expect(template!.name).to.equal('getUserTemplate');
    });

    it('should list template names', () => {
      graphQLManager.addTemplate({
        name: 'template1',
        query: 'query { users { id } }'
      });
      
      graphQLManager.addTemplate({
        name: 'template2',
        query: 'query { posts { id } }'
      });

      const templateNames = graphQLManager.getTemplateNames();
      expect(templateNames).to.include('template1');
      expect(templateNames).to.include('template2');
    });

    it('should remove templates', () => {
      graphQLManager.addTemplate({
        name: 'tempTemplate',
        query: 'query { temp }'
      });

      expect(graphQLManager.getTemplateNames()).to.include('tempTemplate');

      const removed = graphQLManager.removeTemplate('tempTemplate');
      expect(removed).to.be.true;
      expect(graphQLManager.getTemplateNames()).to.not.include('tempTemplate');
    });

    it('should create common templates', () => {
      graphQLManager.createCommonTemplates();

      const templateNames = graphQLManager.getTemplateNames();
      expect(templateNames).to.include('introspection');
      expect(templateNames).to.include('health');
      expect(templateNames).to.include('typeInfo');
    });
  });

  describe('GraphQL Manager Statistics', () => {
    it('should provide manager statistics', () => {
      graphQLManager.addEndpoint({
        name: 'endpoint1',
        endpoint: 'https://api1.example.com/graphql'
      });

      graphQLManager.addTemplate({
        name: 'template1',
        query: 'query { test }'
      });

      const stats = graphQLManager.getStats();
      expect(stats.endpointCount).to.equal(1);
      expect(stats.templateCount).to.equal(1);
      expect(stats.activeEndpoint).to.equal('endpoint1');
    });

    it('should clear all endpoints and templates', () => {
      graphQLManager.addEndpoint({
        name: 'endpoint1',
        endpoint: 'https://api1.example.com/graphql'
      });

      graphQLManager.addTemplate({
        name: 'template1',
        query: 'query { test }'
      });

      graphQLManager.clear();

      const stats = graphQLManager.getStats();
      expect(stats.endpointCount).to.equal(0);
      expect(stats.templateCount).to.equal(0);
      expect(stats.activeEndpoint).to.be.undefined;
    });
  });
});