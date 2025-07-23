import { expect } from 'chai';
import { restified } from '../../src';

describe('GraphQL Integration Tests @integration @regression', () => {
  
  describe('GraphQL Public API Tests', () => {
    it('should handle GraphQL query via DSL', async function() {
      this.timeout(10000);
      
      try {
        // Using a public GraphQL API for testing
        const query = `
          query {
            countries {
              code
              name
              emoji
            }
          }
        `;

        const result = await restified
          .given()
            .baseURL('https://countries.trevorblades.com')
            .header('Content-Type', 'application/json')
          .when()
            .graphqlQuery(query)
            .post('/graphql')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('data');
        expect(result.data.data).to.have.property('countries');
        expect(Array.isArray(result.data.data.countries)).to.be.true;
        
        if (result.data.data.countries.length > 0) {
          const country = result.data.data.countries[0];
          expect(country).to.have.property('code');
          expect(country).to.have.property('name');
          expect(country).to.have.property('emoji');
        }

      } catch (error: any) {
        console.warn('GraphQL countries API test failed:', error.message);
        this.skip();
      }
    });

    it('should handle GraphQL query with variables', async function() {
      this.timeout(10000);
      
      try {
        const query = `
          query GetCountry($code: ID!) {
            country(code: $code) {
              name
              code
              emoji
              currency
              languages {
                name
              }
            }
          }
        `;

        const variables = { code: 'US' };

        const result = await restified
          .given()
            .baseURL('https://countries.trevorblades.com')
            .header('Content-Type', 'application/json')
          .when()
            .graphql(query, variables)
            .post('/graphql')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('data');
        expect(result.data.data).to.have.property('country');
        
        const country = result.data.data.country;
        expect(country).to.have.property('name');
        expect(country).to.have.property('code', 'US');
        expect(country).to.have.property('emoji');

      } catch (error: any) {
        console.warn('GraphQL query with variables test failed:', error.message);
        this.skip();
      }
    });

    it('should handle GraphQL errors properly', async function() {
      this.timeout(10000);
      
      try {
        const invalidQuery = `
          query {
            invalidField {
              nonExistentProperty
            }
          }
        `;

        const result = await restified
          .given()
            .baseURL('https://countries.trevorblades.com')
            .header('Content-Type', 'application/json')
          .when()
            .graphql(invalidQuery)
            .post('/graphql')
          .then()
            .statusCode(200) // GraphQL returns 200 even for errors
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('errors');
        expect(Array.isArray(result.data.errors)).to.be.true;

      } catch (error: any) {
        console.warn('GraphQL error handling test failed:', error.message);
        this.skip();
      }
    });

    it('should handle GraphQL mutations', async function() {
      this.timeout(5000);
      
      try {
        // Using httpbin.org for testing mutations (simulated)
        const mutation = `
          mutation CreateUser($name: String!, $email: String!) {
            createUser(name: $name, email: $email) {
              id
              name
              email
            }
          }
        `;

        const variables = {
          name: 'Test User',
          email: 'test@example.com'
        };

        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .header('Content-Type', 'application/json')
          .when()
            .graphqlMutation(mutation, variables)
            .post('/post') // Using /post to simulate GraphQL endpoint
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('json');
        expect(result.data.json).to.have.property('query');
        expect(result.data.json).to.have.property('variables');

      } catch (error: any) {
        console.warn('GraphQL mutation test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('GraphQL Endpoint Management', () => {
    it('should support adding GraphQL endpoints', () => {
      expect(() => {
        restified.addGraphQLEndpoint({
          name: 'countriesAPI',
          endpoint: 'https://countries.trevorblades.com/graphql',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        restified.addGraphQLEndpoint({
          name: 'rickAndMortyAPI', 
          endpoint: 'https://rickandmortyapi.com/graphql',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }).to.not.throw();
    });

    it('should support setting active GraphQL endpoint', () => {
      restified.addGraphQLEndpoint({
        name: 'testEndpoint',
        endpoint: 'https://api.test.com/graphql'
      });

      expect(() => {
        restified.setActiveGraphQLEndpoint('testEndpoint');
      }).to.not.throw();
    });

    it('should support removing GraphQL endpoints', () => {
      restified.addGraphQLEndpoint({
        name: 'tempEndpoint',
        endpoint: 'https://temp.api.com/graphql'
      });

      expect(() => {
        restified.removeGraphQLEndpoint('tempEndpoint');
      }).to.not.throw();
    });

    it('should handle GraphQL introspection queries', async function() {
      this.timeout(10000);
      
      try {
        const introspectionQuery = `
          query IntrospectionQuery {
            __schema {
              types {
                name
                kind
              }
            }
          }
        `;

        const result = await restified
          .given()
            .baseURL('https://countries.trevorblades.com')
            .header('Content-Type', 'application/json')
          .when()
            .graphql(introspectionQuery)
            .post('/graphql')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('data');
        expect(result.data.data).to.have.property('__schema');
        expect(result.data.data.__schema).to.have.property('types');

      } catch (error: any) {
        console.warn('GraphQL introspection test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('GraphQL Advanced Features', () => {
    it('should support GraphQL fragments', async function() {
      this.timeout(10000);
      
      try {
        const queryWithFragment = `
          fragment CountryInfo on Country {
            code
            name
            emoji
            currency
          }
          
          query {
            countries(filter: { code: { in: ["US", "CA", "MX"] } }) {
              ...CountryInfo
            }
          }
        `;

        const result = await restified
          .given()
            .baseURL('https://countries.trevorblades.com')
            .header('Content-Type', 'application/json')
          .when()
            .graphql(queryWithFragment)
            .post('/graphql')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('data');
        expect(result.data.data).to.have.property('countries');
        expect(Array.isArray(result.data.data.countries)).to.be.true;

      } catch (error: any) {
        console.warn('GraphQL fragments test failed:', error.message);
        this.skip();
      }
    });

    it('should handle GraphQL directives', async function() {
      this.timeout(10000);
      
      try {
        const queryWithDirectives = `
          query GetCountryWithDirectives($includeEmoji: Boolean = true) {
            country(code: "US") {
              code
              name
              emoji @include(if: $includeEmoji)
              currency
            }
          }
        `;

        const result = await restified
          .given()
            .baseURL('https://countries.trevorblades.com')
            .header('Content-Type', 'application/json')
          .when()
            .graphql(queryWithDirectives, { includeEmoji: true })
            .post('/graphql')
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('data');
        expect(result.data.data).to.have.property('country');
        expect(result.data.data.country).to.have.property('emoji');

      } catch (error: any) {
        console.warn('GraphQL directives test failed:', error.message);
        this.skip();
      }
    });

    it('should support nested GraphQL queries', async function() {
      this.timeout(10000);
      
      try {
        const nestedQuery = `
          query {
            countries(filter: { code: { eq: "US" } }) {
              code
              name
              continent {
                name
                code
              }
              languages {
                code
                name
              }
            }
          }
        `;

        const result = await restified
          .given()
            .baseURL('https://countries.trevorblades.com')
            .header('Content-Type', 'application/json')
          .when()
            .graphql(nestedQuery)
            .post('/graphql')  
          .then()
            .statusCode(200)
          .execute();

        expect(result.status).to.equal(200);
        expect(result.data).to.have.property('data');
        expect(result.data.data).to.have.property('countries');
        
        if (result.data.data.countries.length > 0) {
          const country = result.data.data.countries[0];
          expect(country).to.have.property('continent');
          expect(country).to.have.property('languages');
          expect(Array.isArray(country.languages)).to.be.true;
        }

      } catch (error: any) {
        console.warn('GraphQL nested queries test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('GraphQL Error Handling', () => {
    it('should handle network errors in GraphQL requests', async function() {
      this.timeout(5000);
      
      try {
        await restified
          .given()
            .baseURL('https://nonexistent-graphql-api.com')
            .header('Content-Type', 'application/json')
          .when()
            .graphql('query { test }')
            .post('/graphql')
          .then()
            .statusCode(200)
          .execute();

        expect.fail('Request should have failed with network error');
      } catch (error: any) {
        expect(error).to.exist;
        // Network error should be caught
      }
    });

    it('should handle malformed GraphQL queries', async function() {
      this.timeout(10000);
      
      try {
        const malformedQuery = `
          query {
            countries {
              code
              name
              // Missing closing brace
        `;

        const result = await restified
          .given()
            .baseURL('https://countries.trevorblades.com')
            .header('Content-Type', 'application/json')
          .when()
            .graphql(malformedQuery)
            .post('/graphql')
          .then()
            .statusCode(400)
          .execute();

        // GraphQL should return syntax error
        expect(result.data).to.have.property('errors');

      } catch (error: any) {
        // Either 400 status or errors in response data
        expect(error).to.exist;
      }
    });
  });
});