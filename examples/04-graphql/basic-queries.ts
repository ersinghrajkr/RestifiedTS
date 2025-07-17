/**
 * Basic GraphQL Queries Example
 *
 * This example demonstrates how to test GraphQL APIs using RestifiedTS,
 * including queries, mutations, subscriptions, and schema validation.
 */

import { RestifiedTS } from '../../src';

async function basicGraphQLQuery() {
  console.log('= Running Basic GraphQL Query Example');
  
  try {
    const query = `
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
    `;

    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com/graphql')
        .header('Content-Type', 'application/json')
        .body({
          query,
          variables: { id: '1' }
        })
      .when()
        .post('/')
      .then()
        .statusCode(200)
        .jsonPath('$.data.user.id', '1')
        .jsonPath('$.data.user.name', (name: string) => name.length > 0)
        .jsonPath('$.data.user.email', (email: string) => email.includes('@'))
        .jsonPath('$.data.user.posts', (posts: any[]) => posts.length >= 0)
      .execute();

    console.log(' Basic GraphQL query successful');
    console.log('User data:', response.data.data.user);
    
  } catch (error) {
    console.error('L Basic GraphQL query failed:', error);
  }
}

async function graphQLMutation() {
  console.log('= Running GraphQL Mutation Example');
  
  try {
    const mutation = `
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          id
          title
          content
          author {
            id
            name
          }
          createdAt
        }
      }
    `;

    const variables = {
      input: {
        title: 'New Post from RestifiedTS',
        content: 'This post was created using GraphQL mutation',
        authorId: '1'
      }
    };

    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com/graphql')
        .header('Content-Type', 'application/json')
        .header('Authorization', 'Bearer {{authToken}}')
        .variable('authToken', 'your-auth-token')
        .body({
          query: mutation,
          variables
        })
      .when()
        .post('/')
      .then()
        .statusCode(200)
        .jsonPath('$.data.createPost.id', (id: string) => id.length > 0)
        .jsonPath('$.data.createPost.title', variables.input.title)
        .jsonPath('$.data.createPost.content', variables.input.content)
        .jsonPath('$.data.createPost.author.id', variables.input.authorId)
        .jsonPath('$.data.createPost.createdAt', (date: string) => new Date(date).getTime() > 0)
        .extract('$.data.createPost.id', 'newPostId')
      .execute();

    console.log(' GraphQL mutation successful');
    console.log('Created post ID:', response.extractedData.newPostId);
    
  } catch (error) {
    console.error('L GraphQL mutation failed:', error);
  }
}

async function graphQLWithVariables() {
  console.log('= Running GraphQL with Variables Example');
  
  try {
    const query = `
      query GetPosts($first: Int, $after: String, $filter: PostFilter) {
        posts(first: $first, after: $after, filter: $filter) {
          edges {
            node {
              id
              title
              content
              author {
                name
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    const variables = {
      first: 10,
      after: null,
      filter: {
        status: 'PUBLISHED',
        category: 'TECHNOLOGY'
      }
    };

    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com/graphql')
        .header('Content-Type', 'application/json')
        .body({
          query,
          variables
        })
      .when()
        .post('/')
      .then()
        .statusCode(200)
        .jsonPath('$.data.posts.edges', (edges: any[]) => edges.length <= 10)
        .jsonPath('$.data.posts.pageInfo.hasNextPage', (hasNext: boolean) => typeof hasNext === 'boolean')
        .jsonPath('$.data.posts.edges[0].node.id', (id: string) => id.length > 0)
        .jsonPath('$.data.posts.edges[0].node.title', (title: string) => title.length > 0)
        .extract('$.data.posts.pageInfo.endCursor', 'lastCursor')
      .execute();

    console.log(' GraphQL with variables successful');
    console.log('Posts count:', response.data.data.posts.edges.length);
    console.log('Last cursor:', response.extractedData.lastCursor);
    
  } catch (error) {
    console.error('L GraphQL with variables failed:', error);
  }
}

async function graphQLErrorHandling() {
  console.log('= Running GraphQL Error Handling Example');
  
  try {
    const queryWithError = `
      query GetInvalidData {
        nonExistentField {
          id
          name
        }
      }
    `;

    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com/graphql')
        .header('Content-Type', 'application/json')
        .body({
          query: queryWithError
        })
      .when()
        .post('/')
      .then()
        .statusCode(200) // GraphQL returns 200 even with errors
        .jsonPath('$.errors', (errors: any[]) => errors.length > 0)
        .jsonPath('$.errors[0].message', (message: string) => message.length > 0)
        .jsonPath('$.errors[0].extensions.code', 'GRAPHQL_VALIDATION_FAILED')
        .jsonPath('$.data', null)
      .execute();

    console.log(' GraphQL error handling successful');
    console.log('Error message:', response.data.errors[0].message);
    
  } catch (error) {
    console.error('L GraphQL error handling failed:', error);
  }
}

async function graphQLIntrospection() {
  console.log('= Running GraphQL Introspection Example');
  
  try {
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType {
            name
            fields {
              name
              type {
                name
                kind
              }
            }
          }
          mutationType {
            name
            fields {
              name
              type {
                name
                kind
              }
            }
          }
          types {
            name
            kind
            description
          }
        }
      }
    `;

    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com/graphql')
        .header('Content-Type', 'application/json')
        .body({
          query: introspectionQuery
        })
      .when()
        .post('/')
      .then()
        .statusCode(200)
        .jsonPath('$.data.__schema.queryType.name', 'Query')
        .jsonPath('$.data.__schema.queryType.fields', (fields: any[]) => fields.length > 0)
        .jsonPath('$.data.__schema.mutationType.name', 'Mutation')
        .jsonPath('$.data.__schema.types', (types: any[]) => types.length > 0)
      .execute();

    console.log(' GraphQL introspection successful');
    console.log('Available query fields:', response.data.data.__schema.queryType.fields.length);
    console.log('Available types:', response.data.data.__schema.types.length);
    
  } catch (error) {
    console.error('L GraphQL introspection failed:', error);
  }
}

async function graphQLBatchQueries() {
  console.log('= Running GraphQL Batch Queries Example');
  
  try {
    const batchQueries = [
      {
        query: `
          query GetUser($id: ID!) {
            user(id: $id) {
              id
              name
              email
            }
          }
        `,
        variables: { id: '1' }
      },
      {
        query: `
          query GetPosts($authorId: ID!) {
            posts(filter: { authorId: $authorId }) {
              edges {
                node {
                  id
                  title
                }
              }
            }
          }
        `,
        variables: { authorId: '1' }
      }
    ];

    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com/graphql')
        .header('Content-Type', 'application/json')
        .body(batchQueries)
      .when()
        .post('/')
      .then()
        .statusCode(200)
        .jsonPath('$', (responses: any[]) => responses.length === 2)
        .jsonPath('$[0].data.user.id', '1')
        .jsonPath('$[1].data.posts.edges', (edges: any[]) => edges.length >= 0)
      .execute();

    console.log(' GraphQL batch queries successful');
    console.log('Batch responses:', response.data.length);
    
  } catch (error) {
    console.error('L GraphQL batch queries failed:', error);
  }
}

async function graphQLSubscription() {
  console.log('= Running GraphQL Subscription Example');
  
  try {
    // Note: This is a simplified example. Real subscriptions would use WebSocket
    const subscription = `
      subscription OnCommentAdded($postId: ID!) {
        commentAdded(postId: $postId) {
          id
          content
          author {
            name
          }
          createdAt
        }
      }
    `;

    // Initialize subscription
    const response = await RestifiedTS
      .given()
        .baseURL('wss://api.example.com/graphql')
        .header('Sec-WebSocket-Protocol', 'graphql-ws')
        .body({
          id: '1',
          type: 'start',
          payload: {
            query: subscription,
            variables: { postId: '123' }
          }
        })
      .when()
        .websocket()
      .then()
        .messageReceived((message: any) => {
          return message.type === 'data' && message.payload.data.commentAdded;
        })
        .jsonPath('$.payload.data.commentAdded.id', (id: string) => id.length > 0)
        .jsonPath('$.payload.data.commentAdded.content', (content: string) => content.length > 0)
      .execute();

    console.log(' GraphQL subscription successful');
    console.log('Received comment:', response.data.payload.data.commentAdded);
    
  } catch (error) {
    console.error('L GraphQL subscription failed:', error);
  }
}

async function graphQLWithAuthentication() {
  console.log('= Running GraphQL with Authentication Example');
  
  try {
    // First, authenticate to get a token
    const authResponse = await RestifiedTS
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .body({
          email: 'test@example.com',
          password: 'testpassword'
        })
      .when()
        .post('/auth/login')
      .then()
        .statusCode(200)
        .jsonPath('$.token', (token: string) => token.length > 0)
        .extract('$.token', 'authToken')
      .execute();

    const token = authResponse.extractedData.authToken;

    // Use the token for authenticated GraphQL query
    const query = `
      query GetPrivateUserData {
        me {
          id
          name
          email
          privateData {
            preferences
            settings
          }
        }
      }
    `;

    const response = await RestifiedTS
      .given()
        .baseURL('https://api.example.com/graphql')
        .header('Content-Type', 'application/json')
        .header('Authorization', `Bearer ${token}`)
        .body({
          query
        })
      .when()
        .post('/')
      .then()
        .statusCode(200)
        .jsonPath('$.data.me.id', (id: string) => id.length > 0)
        .jsonPath('$.data.me.privateData', (data: any) => data !== null)
        .jsonPath('$.data.me.privateData.preferences', (prefs: any) => prefs !== null)
      .execute();

    console.log(' GraphQL with authentication successful');
    console.log('Private user data retrieved');
    
  } catch (error) {
    console.error('L GraphQL with authentication failed:', error);
  }
}

// Run all examples
async function runAllExamples() {
  console.log('<¯ Starting GraphQL Examples\n');
  
  await basicGraphQLQuery();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await graphQLMutation();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await graphQLWithVariables();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await graphQLErrorHandling();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await graphQLIntrospection();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await graphQLBatchQueries();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await graphQLSubscription();
  console.log('\n' + ' '.repeat(50) + '\n');
  
  await graphQLWithAuthentication();
  
  console.log('\n<‰ All GraphQL Examples Completed!');
}

// Execute if run directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicGraphQLQuery,
  graphQLMutation,
  graphQLWithVariables,
  graphQLErrorHandling,
  graphQLIntrospection,
  graphQLBatchQueries,
  graphQLSubscription,
  graphQLWithAuthentication,
  runAllExamples
};