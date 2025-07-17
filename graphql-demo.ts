/**
 * GraphQL Demo for RestifiedTS
 */

import { RestifiedTS, GraphQLManager, GraphQLClient } from './src';

// Sample GraphQL queries for testing
const SAMPLE_QUERIES = {
  // Simple introspection query
  introspection: `
    query {
      __schema {
        queryType {
          name
        }
        mutationType {
          name
        }
      }
    }
  `,
  
  // User query with variables
  getUser: `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
        posts {
          id
          title
          content
        }
      }
    }
  `,
  
  // Posts query with pagination
  getPosts: `
    query GetPosts($first: Int, $after: String) {
      posts(first: $first, after: $after) {
        edges {
          node {
            id
            title
            author {
              name
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  
  // Create user mutation
  createUser: `
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        id
        name
        email
        createdAt
      }
    }
  `,
  
  // Update post mutation
  updatePost: `
    mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
      updatePost(id: $id, input: $input) {
        id
        title
        content
        updatedAt
      }
    }
  `
};

async function runGraphQLDemo() {
  console.log('🚀 Starting RestifiedTS GraphQL Demo\n');
  
  try {
    // 1. Basic GraphQL Manager Demo
    console.log('1. Testing GraphQL Manager');
    const graphqlManager = new GraphQLManager();
    
    // Add multiple GraphQL endpoints
    graphqlManager.addEndpoint({
      name: 'main-api',
      endpoint: 'https://api.github.com/graphql',
      headers: {
        'User-Agent': 'RestifiedTS-Demo'
      },
      introspection: false
    });
    
    graphqlManager.addEndpoint({
      name: 'local-api',
      endpoint: 'http://localhost:4000/graphql',
      introspection: true,
      defaultVariables: {
        limit: 10
      }
    });
    
    console.log('GraphQL endpoints added:', graphqlManager.getEndpoints());
    console.log('GraphQL stats:', graphqlManager.getStats());
    console.log();
    
    // 2. Query Templates Demo
    console.log('2. Testing Query Templates');
    
    // Add sample templates
    graphqlManager.addTemplate({
      name: 'user-profile',
      query: SAMPLE_QUERIES.getUser,
      variables: { id: '1' },
      description: 'Get user profile with posts',
      tags: ['user', 'profile']
    });
    
    graphqlManager.addTemplate({
      name: 'posts-list',
      query: SAMPLE_QUERIES.getPosts,
      variables: { first: 10 },
      description: 'Get paginated posts list',
      tags: ['posts', 'pagination']
    });
    
    graphqlManager.createCommonTemplates();
    
    console.log('Available templates:', graphqlManager.getTemplateNames());
    
    const userTemplate = graphqlManager.getTemplate('user-profile');
    console.log('User template:', JSON.stringify(userTemplate, null, 2));
    console.log();
    
    // 3. Query Analysis Demo
    console.log('3. Testing Query Analysis');
    
    const analysisResults = [
      graphqlManager.analyzeQuery(SAMPLE_QUERIES.getUser),
      graphqlManager.analyzeQuery(SAMPLE_QUERIES.createUser),
      graphqlManager.analyzeQuery(SAMPLE_QUERIES.introspection)
    ];
    
    analysisResults.forEach((result, index) => {
      console.log(`Query ${index + 1} analysis:`, result);
    });
    console.log();
    
    // 4. Query Validation Demo
    console.log('4. Testing Query Validation');
    
    const validationTests = [
      { name: 'Valid query', query: SAMPLE_QUERIES.getUser },
      { name: 'Invalid query (unbalanced braces)', query: 'query { user { name }' },
      { name: 'Empty query', query: '' },
      { name: 'Invalid syntax', query: 'this is not graphql' }
    ];
    
    validationTests.forEach(test => {
      const validation = graphqlManager.validateQuery(test.query);
      console.log(`${test.name}:`, validation.valid ? 'Valid' : `Invalid - ${validation.errors.join(', ')}`);
    });
    console.log();
    
    // 5. Query Builder Demo
    console.log('5. Testing Query Builder');
    
    const builder = graphqlManager.queryBuilder();
    
    // Build a user query
    builder
      .query('GetUserWithPosts')
      .variable('userId', 'ID!', '123')
      .field('user', { id: '$userId' }, [
        'id',
        'name',
        'email',
        'posts { id title content }'
      ])
      .field('stats', {}, [
        'totalUsers',
        'totalPosts'
      ]);
    
    const builtQuery = builder.build();
    console.log('Built query:');
    console.log(builtQuery);
    console.log();
    
    // 6. RestifiedTS Integration Demo
    console.log('6. Testing RestifiedTS GraphQL Integration');
    
    const restified = new RestifiedTS({
      graphql: {
        endpoint: 'https://countries.trevorblades.com/graphql',
        introspection: true
      }
    });
    
    // Add additional GraphQL endpoint
    restified.addGraphQLEndpoint({
      name: 'countries-api',
      endpoint: 'https://countries.trevorblades.com/graphql',
      introspection: true
    });
    
    console.log('RestifiedTS GraphQL manager stats:', restified.getGraphQLManager().getStats());
    
    // Simple GraphQL query using RestifiedTS
    const countriesQuery = `
      query {
        countries(filter: { continent: { eq: "NA" } }) {
          code
          name
          capital
          emoji
        }
      }
    `;
    
    try {
      console.log('Executing countries query...');
      const response = await restified.graphqlQuery(countriesQuery);
      console.log('Query successful! Response status:', response.status);
      console.log('Countries found:', response.data?.data?.countries?.length || 0);
      
      // Show first few countries
      const countries = response.data?.data?.countries?.slice(0, 3) || [];
      console.log('Sample countries:', countries);
      
    } catch (error) {
      console.log('GraphQL query failed (this is expected if no internet):', error instanceof Error ? error.message : String(error));
    }
    console.log();
    
    // 7. DSL Integration Demo
    console.log('7. Testing DSL Integration with GraphQL');
    
    try {
      const thenStep = await restified
        .given()
          .header('X-Test-Header', 'GraphQL-Demo')
          .variable('continent', 'AS')
        .when()
          .graphql(`
            query GetCountriesByContinent($continent: String!) {
              countries(filter: { continent: { eq: $continent } }) {
                code
                name
                capital
              }
            }
          `, { continent: '{{continent}}' })
          .execute();
      
      const dslResult = await thenStep
        .statusCode(200)
        .jsonPath('$.data.countries[0].name', (name: string) => typeof name === 'string')
        .extract('$.data.countries', 'asianCountries')
        .execute();
      
      console.log('DSL GraphQL query successful!');
      console.log('Response status:', dslResult.status);
      console.log('Asian countries found:', dslResult.data?.data?.countries?.length || 0);
      
    } catch (error) {
      console.log('DSL GraphQL query failed (this is expected if no internet):', error instanceof Error ? error.message : String(error));
    }
    console.log();
    
    // 8. Batch Operations Demo
    console.log('8. Testing Batch GraphQL Operations');
    
    const batchOperations = [
      {
        query: 'query { __schema { queryType { name } } }',
        operationName: 'SchemaInfo'
      },
      {
        query: 'query { countries { code } }',
        operationName: 'AllCountries'
      }
    ];
    
    try {
      console.log('Executing batch operations...');
      const batchResults = await restified.getGraphQLManager().batchExecute(batchOperations);
      console.log('Batch operations completed:', batchResults.length);
      
      batchResults.forEach((result, index) => {
        console.log(`Operation ${index + 1} status:`, result.status);
      });
      
    } catch (error) {
      console.log('Batch operations failed (this is expected if no internet):', error instanceof Error ? error.message : String(error));
    }
    console.log();
    
    // 9. Template Export/Import Demo
    console.log('9. Testing Template Export/Import');
    
    const exportedTemplates = graphqlManager.exportTemplates();
    console.log('Exported templates count:', Object.keys(exportedTemplates).length);
    
    // Clear templates and import them back
    graphqlManager.getTemplateNames().forEach(name => {
      graphqlManager.removeTemplate(name);
    });
    
    console.log('Templates after clearing:', graphqlManager.getTemplateNames().length);
    
    graphqlManager.importTemplates(exportedTemplates);
    console.log('Templates after import:', graphqlManager.getTemplateNames().length);
    console.log();
    
    // 10. Advanced Features Demo
    console.log('10. Testing Advanced Features');
    
    // Find templates by tag
    const userTemplates = graphqlManager.findTemplatesByTag('user');
    console.log('User-related templates:', userTemplates.map(t => t.name));
    
    // GraphQL validation
    const complexQuery = `
      query ComplexQuery($filters: UserFilter!) {
        users(filter: $filters) {
          edges {
            node {
              id
              profile {
                firstName
                lastName
                avatar
              }
              posts(first: 5) {
                edges {
                  node {
                    title
                    publishedAt
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const complexValidation = graphqlManager.validateQuery(complexQuery);
    console.log('Complex query validation:', complexValidation.valid ? 'Valid' : `Invalid - ${complexValidation.errors.join(', ')}`);
    
    const complexAnalysis = graphqlManager.analyzeQuery(complexQuery);
    console.log('Complex query analysis:', complexAnalysis);
    console.log();
    
    console.log('✅ GraphQL Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ GraphQL Demo failed:', error);
  }
}

// Run the demo
runGraphQLDemo();