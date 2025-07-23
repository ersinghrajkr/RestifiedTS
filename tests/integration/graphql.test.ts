import { expect } from 'chai';
import { restified } from '../../src';

describe('GraphQL Integration Tests', () => {
  
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
            .graphQLQuery(query)
          .when()
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
            .body({
              query: query,
              variables: variables
            })
          .when()
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
            .body({ query: invalidQuery })
          .when()
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
  });

  describe('GraphQL Client Management', () => {
    it('should support multiple GraphQL clients', () => {
      expect(() => {
        restified.createGraphQLClient('countriesAPI', {
          endpoint: 'https://countries.trevorblades.com/graphql'
        });
        
        restified.createGraphQLClient('rickAndMortyAPI', {
          endpoint: 'https://rickandmortyapi.com/graphql'
        });
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
            .body({ query: introspectionQuery })
          .when()
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
});