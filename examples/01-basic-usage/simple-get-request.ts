/**
 * Simple GET Request Example
 * 
 * This example demonstrates the most basic usage of RestifiedTS
 * for making GET requests and validating responses.
 */

import { RestifiedTS } from '../../src';

async function simpleGetRequest() {
  console.log('🚀 Starting Simple GET Request Example...\n');

  try {
    // Basic GET request to JSONPlaceholder API
    const result = await RestifiedTS
      .given()
        .baseUrl('https://jsonplaceholder.typicode.com')
        .header('Accept', 'application/json')
      .when()
        .get('/posts/1')
      .then()
        .statusCode(200)
        .header('Content-Type', 'application/json; charset=utf-8')
        .jsonPath('$.userId', 1)
        .jsonPath('$.id', 1)
        .jsonPath('$.title', 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit')
      .execute();

    console.log('✅ Test passed! Response received:', result.response.statusCode);
    console.log('📄 Response body:', JSON.stringify(result.response.body, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

async function getWithQueryParameters() {
  console.log('\n🔍 GET Request with Query Parameters Example...\n');

  try {
    const result = await RestifiedTS
      .given()
        .baseUrl('https://jsonplaceholder.typicode.com')
        .queryParam('userId', 1)
        .queryParam('_limit', 5)
      .when()
        .get('/posts')
      .then()
        .statusCode(200)
        .jsonArray('$', (posts) => posts.length <= 5)
        .jsonPath('$[0].userId', 1)
        .responseTime(lessThan(2000))
      .execute();

    console.log('✅ Query parameters test passed!');
    console.log(`📊 Received ${result.response.body.length} posts`);

  } catch (error) {
    console.error('❌ Query parameters test failed:', error.message);
    throw error;
  }
}

async function getWithPathParameters() {
  console.log('\n🛤️ GET Request with Path Parameters Example...\n');

  try {
    const userId = 2;
    const postId = 15;

    const result = await RestifiedTS
      .given()
        .baseUrl('https://jsonplaceholder.typicode.com')
        .pathParam('userId', userId)
        .pathParam('postId', postId)
      .when()
        .get('/users/{userId}/posts/{postId}') // This would be a custom endpoint
      .then()
        .statusCode(404) // Expected 404 since this endpoint doesn't exist
      .execute();

    console.log('✅ Path parameters test completed (expected 404)');

  } catch (error) {
    // For demonstration, we'll try a real endpoint instead
    console.log('📝 Trying real endpoint instead...');
    
    const result = await RestifiedTS
      .given()
        .baseUrl('https://jsonplaceholder.typicode.com')
        .pathParam('postId', postId)
      .when()
        .get('/posts/{postId}')
      .then()
        .statusCode(200)
        .jsonPath('$.id', postId)
        .jsonPath('$.userId', greaterThan(0))
      .execute();

    console.log('✅ Real endpoint test passed!');
  }
}

async function getWithCustomHeaders() {
  console.log('\n📋 GET Request with Custom Headers Example...\n');

  try {
    const result = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .header('X-Custom-Header', 'RestifiedTS-Example')
        .header('X-API-Version', 'v1')
        .header('User-Agent', 'RestifiedTS/1.0')
      .when()
        .get('/headers')
      .then()
        .statusCode(200)
        .jsonPath('$.headers.X-Custom-Header', 'RestifiedTS-Example')
        .jsonPath('$.headers.X-Api-Version', 'v1')
        .jsonPath('$.headers.User-Agent', 'RestifiedTS/1.0')
      .execute();

    console.log('✅ Custom headers test passed!');
    console.log('📋 Request headers were properly sent and echoed back');

  } catch (error) {
    console.error('❌ Custom headers test failed:', error.message);
    throw error;
  }
}

async function getWithResponseValidation() {
  console.log('\n✅ GET Request with Comprehensive Response Validation...\n');

  try {
    const result = await RestifiedTS
      .given()
        .baseUrl('https://jsonplaceholder.typicode.com')
      .when()
        .get('/posts/1')
      .then()
        // Status validation
        .statusCode(200)
        .statusText('OK')
        
        // Header validation
        .header('Content-Type', containsString('application/json'))
        .header('Server', notNullValue())
        
        // Response time validation
        .responseTime(lessThan(3000))
        
        // JSON structure validation
        .jsonPath('$.userId', instanceOf('number'))
        .jsonPath('$.id', instanceOf('number'))
        .jsonPath('$.title', instanceOf('string'))
        .jsonPath('$.body', instanceOf('string'))
        
        // Value validation
        .jsonPath('$.userId', greaterThan(0))
        .jsonPath('$.id', equalTo(1))
        .jsonPath('$.title', hasLength(greaterThan(10)))
        .jsonPath('$.body', hasLength(greaterThan(50)))
        
        // Custom validation
        .body((responseBody) => {
          const post = JSON.parse(responseBody);
          return post.userId && post.id && post.title && post.body;
        })
      .execute();

    console.log('✅ Comprehensive validation test passed!');
    console.log(`⏱️ Response time: ${result.metrics.responseTime}ms`);

  } catch (error) {
    console.error('❌ Comprehensive validation test failed:', error.message);
    throw error;
  }
}

// Helper functions (these would be imported from RestifiedTS matchers)
function lessThan(value: number) {
  return (actual: number) => actual < value;
}

function greaterThan(value: number) {
  return (actual: number) => actual > value;
}

function containsString(substring: string) {
  return (actual: string) => actual.includes(substring);
}

function notNullValue() {
  return (actual: any) => actual !== null && actual !== undefined;
}

function instanceOf(type: string) {
  return (actual: any) => typeof actual === type;
}

function equalTo(expected: any) {
  return (actual: any) => actual === expected;
}

function hasLength(matcher: (length: number) => boolean) {
  return (actual: string | any[]) => matcher(actual.length);
}

// Run all examples
async function runAllExamples() {
  console.log('🎯 Running Simple GET Request Examples\n');
  console.log('=' .repeat(50));

  try {
    await simpleGetRequest();
    await getWithQueryParameters();
    await getWithPathParameters();
    await getWithCustomHeaders();
    await getWithResponseValidation();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 All Simple GET Request Examples completed successfully!');

  } catch (error) {
    console.error('\n💥 Examples failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runAllExamples();
}

export {
  simpleGetRequest,
  getWithQueryParameters,
  getWithPathParameters,
  getWithCustomHeaders,
  getWithResponseValidation
};