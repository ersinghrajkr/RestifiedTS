/**
 * POST Request with JSON Example
 * 
 * This example demonstrates how to send POST requests with JSON payloads
 * and validate the responses using RestifiedTS.
 */

import { RestifiedTS } from '../../src';

async function simplePostRequest() {
  console.log('🚀 Starting Simple POST Request Example...\n');

  try {
    const newPost = {
      title: 'RestifiedTS Test Post',
      body: 'This is a test post created using RestifiedTS',
      userId: 1
    };

    const result = await RestifiedTS
      .given()
        .baseUrl('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
        .jsonBody(newPost)
      .when()
        .post('/posts')
      .then()
        .statusCode(201)
        .header('Content-Type', 'application/json; charset=utf-8')
        .jsonPath('$.title', newPost.title)
        .jsonPath('$.body', newPost.body)
        .jsonPath('$.userId', newPost.userId)
        .jsonPath('$.id', notNullValue())
        .responseTime(lessThan(3000))
      .execute();

    console.log('✅ POST request successful!');
    console.log('🆔 Created post ID:', result.response.body.id);
    console.log('📄 Response body:', JSON.stringify(result.response.body, null, 2));

  } catch (error) {
    console.error('❌ POST request failed:', error.message);
    throw error;
  }
}

async function postWithDynamicData() {
  console.log('\n🔄 POST Request with Dynamic Data Example...\n');

  try {
    const timestamp = Date.now();
    const dynamicPost = {
      title: `Dynamic Post ${timestamp}`,
      body: `This post was created at ${new Date().toISOString()}`,
      userId: Math.floor(Math.random() * 10) + 1,
      metadata: {
        created: timestamp,
        source: 'RestifiedTS',
        version: '1.0.0'
      }
    };

    const result = await RestifiedTS
      .given()
        .baseUrl('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
        .header('X-Test-Id', `test-${timestamp}`)
        .jsonBody(dynamicPost)
      .when()
        .post('/posts')
      .then()
        .statusCode(201)
        .jsonPath('$.title', dynamicPost.title)
        .jsonPath('$.body', dynamicPost.body)
        .jsonPath('$.userId', dynamicPost.userId)
        .jsonPath('$.id', greaterThan(0))
        .jsonPath('$.metadata', equalTo(dynamicPost.metadata))
        .extract('$.id', 'createdPostId')
      .execute();

    console.log('✅ Dynamic POST request successful!');
    console.log('🆔 Created post ID:', result.extractedVariables.createdPostId);
    console.log('📊 Post title:', result.response.body.title);

  } catch (error) {
    console.error('❌ Dynamic POST request failed:', error.message);
    throw error;
  }
}

async function postWithNestedJson() {
  console.log('\n🏗️ POST Request with Nested JSON Example...\n');

  try {
    const complexPost = {
      title: 'Complex Post Structure',
      body: 'This post demonstrates nested JSON handling',
      userId: 1,
      metadata: {
        tags: ['api', 'testing', 'restified'],
        category: 'technical',
        priority: 'high',
        author: {
          name: 'John Doe',
          email: 'john@example.com',
          profile: {
            bio: 'API Testing Expert',
            location: 'San Francisco',
            skills: ['REST', 'GraphQL', 'Testing']
          }
        },
        settings: {
          public: true,
          comments: true,
          notifications: {
            email: true,
            push: false,
            sms: false
          }
        }
      }
    };

    const result = await RestifiedTS
      .given()
        .baseUrl('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
        .jsonBody(complexPost)
      .when()
        .post('/posts')
      .then()
        .statusCode(201)
        
        // Validate top-level properties
        .jsonPath('$.title', complexPost.title)
        .jsonPath('$.body', complexPost.body)
        .jsonPath('$.userId', complexPost.userId)
        
        // Validate nested metadata
        .jsonPath('$.metadata.tags', hasSize(3))
        .jsonPath('$.metadata.category', 'technical')
        .jsonPath('$.metadata.priority', 'high')
        
        // Validate deeply nested author information
        .jsonPath('$.metadata.author.name', 'John Doe')
        .jsonPath('$.metadata.author.email', 'john@example.com')
        .jsonPath('$.metadata.author.profile.bio', 'API Testing Expert')
        .jsonPath('$.metadata.author.profile.skills', hasSize(3))
        .jsonPath('$.metadata.author.profile.skills[0]', 'REST')
        
        // Validate settings
        .jsonPath('$.metadata.settings.public', true)
        .jsonPath('$.metadata.settings.notifications.email', true)
        .jsonPath('$.metadata.settings.notifications.push', false)
        
        // Extract nested values
        .extract('$.metadata.author.name', 'authorName')
        .extract('$.metadata.tags', 'postTags')
      .execute();

    console.log('✅ Nested JSON POST request successful!');
    console.log('👤 Author:', result.extractedVariables.authorName);
    console.log('🏷️ Tags:', result.extractedVariables.postTags);

  } catch (error) {
    console.error('❌ Nested JSON POST request failed:', error.message);
    throw error;
  }
}

async function postWithFormData() {
  console.log('\n📝 POST Request with Form Data Example...\n');

  try {
    const formData = new FormData();
    formData.append('title', 'Form Data Post');
    formData.append('body', 'This post was created using form data');
    formData.append('userId', '1');

    const result = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .header('Content-Type', 'application/x-www-form-urlencoded')
        .formData('title', 'Form Data Post')
        .formData('body', 'This post was created using form data')
        .formData('userId', '1')
      .when()
        .post('/post')
      .then()
        .statusCode(200)
        .jsonPath('$.form.title', 'Form Data Post')
        .jsonPath('$.form.body', 'This post was created using form data')
        .jsonPath('$.form.userId', '1')
        .jsonPath('$.headers.Content-Type', containsString('application/x-www-form-urlencoded'))
      .execute();

    console.log('✅ Form data POST request successful!');
    console.log('📋 Form data submitted:', result.response.body.form);

  } catch (error) {
    console.error('❌ Form data POST request failed:', error.message);
    throw error;
  }
}

async function postWithFileUpload() {
  console.log('\n📁 POST Request with File Upload Example...\n');

  try {
    // Create a sample file content
    const fileContent = JSON.stringify({
      name: 'sample-data.json',
      data: [1, 2, 3, 4, 5],
      timestamp: new Date().toISOString()
    }, null, 2);

    const result = await RestifiedTS
      .given()
        .baseUrl('https://httpbin.org')
        .multipartForm()
        .file('upload', fileContent, 'sample-data.json', 'application/json')
        .field('description', 'Sample JSON file upload')
        .field('category', 'test-data')
      .when()
        .post('/post')
      .then()
        .statusCode(200)
        .jsonPath('$.files.upload', containsString('sample-data.json'))
        .jsonPath('$.form.description', 'Sample JSON file upload')
        .jsonPath('$.form.category', 'test-data')
      .execute();

    console.log('✅ File upload POST request successful!');
    console.log('📁 Uploaded file info:', result.response.body.files);

  } catch (error) {
    console.error('❌ File upload POST request failed:', error.message);
    throw error;
  }
}

async function postWithValidation() {
  console.log('\n🔍 POST Request with Comprehensive Validation Example...\n');

  try {
    const validationPost = {
      title: 'Validation Test Post',
      body: 'This post tests comprehensive validation features',
      userId: 1,
      publishedAt: new Date().toISOString(),
      status: 'published'
    };

    const result = await RestifiedTS
      .given()
        .baseUrl('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
        .jsonBody(validationPost)
      .when()
        .post('/posts')
      .then()
        // Status and header validation
        .statusCode(201)
        .statusText('Created')
        .header('Content-Type', containsString('application/json'))
        
        // Response time validation
        .responseTime(lessThan(5000))
        
        // JSON structure validation
        .jsonPath('$', hasKey('id'))
        .jsonPath('$', hasKey('title'))
        .jsonPath('$', hasKey('body'))
        .jsonPath('$', hasKey('userId'))
        
        // Type validation
        .jsonPath('$.id', instanceOf('number'))
        .jsonPath('$.title', instanceOf('string'))
        .jsonPath('$.body', instanceOf('string'))
        .jsonPath('$.userId', instanceOf('number'))
        
        // Value validation
        .jsonPath('$.title', equalTo(validationPost.title))
        .jsonPath('$.body', equalTo(validationPost.body))
        .jsonPath('$.userId', equalTo(validationPost.userId))
        .jsonPath('$.id', greaterThan(0))
        
        // Custom validation
        .body((responseBody) => {
          const post = JSON.parse(responseBody);
          return post.title.length > 0 && post.body.length > 0;
        })
        
        // Extract for further use
        .extract('$.id', 'newPostId')
        .extract('$.title', 'newPostTitle')
      .execute();

    console.log('✅ Comprehensive validation POST request successful!');
    console.log('🆔 New post ID:', result.extractedVariables.newPostId);
    console.log('📝 New post title:', result.extractedVariables.newPostTitle);

  } catch (error) {
    console.error('❌ Comprehensive validation POST request failed:', error.message);
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

function hasSize(expectedSize: number) {
  return (actual: any[]) => actual.length === expectedSize;
}

function hasKey(key: string) {
  return (actual: any) => actual.hasOwnProperty(key);
}

// Run all examples
async function runAllExamples() {
  console.log('🎯 Running POST Request with JSON Examples\n');
  console.log('=' .repeat(50));

  try {
    await simplePostRequest();
    await postWithDynamicData();
    await postWithNestedJson();
    await postWithFormData();
    await postWithFileUpload();
    await postWithValidation();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 All POST Request Examples completed successfully!');

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
  simplePostRequest,
  postWithDynamicData,
  postWithNestedJson,
  postWithFormData,
  postWithFileUpload,
  postWithValidation
};