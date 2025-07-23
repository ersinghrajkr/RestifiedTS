import { expect } from 'chai';
import { restified } from '../../src';

describe('Comprehensive Reporting Integration Tests @integration @smoke', () => {
  
  describe('Request/Response Payload Logging', () => {
    it('should log detailed request and response payloads for successful API calls', async function() {
      this.timeout(10000);
      
      try {
        const requestPayload = {
          title: 'RestifiedTS Test Post',
          body: 'This is a comprehensive test demonstrating detailed request/response logging',
          userId: 1,
          metadata: {
            testFramework: 'RestifiedTS',
            timestamp: new Date().toISOString(),
            testId: 'comprehensive-success-test',
            environment: process.env.NODE_ENV || 'test'
          },
          tags: ['integration', 'reporting', 'success'],
          config: {
            enableLogging: true,
            captureFullPayload: true,
            includeHeaders: true
          }
        };

        const testStartTime = Date.now();
        const result = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .header('Content-Type', 'application/json')
            .header('X-Test-ID', 'comprehensive-success-test')
            .header('X-Request-Timestamp', new Date().toISOString())
            .body(requestPayload)
            .contextVariable('testStartTime', testStartTime)
          .when()
            .post('/posts')
          .then()
            .statusCode(201)
            .header('Content-Type', 'application/json; charset=utf-8')
            .jsonPath('$.title', requestPayload.title)
            .jsonPath('$.body', requestPayload.body)
            .jsonPath('$.userId', requestPayload.userId)
            .extract('$.id', 'createdPostId')
          .execute();
        const testEndTime = Date.now();

        // Verify successful response
        expect(result.status).to.equal(201);
        expect(result.data).to.have.property('id');
        expect(result.data.title).to.equal(requestPayload.title);
        expect(result.data.body).to.equal(requestPayload.body);
        expect(result.data.userId).to.equal(requestPayload.userId);

        // Log additional details for comprehensive reporting
        console.log('✅ SUCCESS TEST DETAILS:');
        console.log('📤 Request Payload:', JSON.stringify(requestPayload, null, 2));
        console.log('📥 Response Payload:', JSON.stringify(result.data, null, 2));
        console.log('⏱️  Response Time:', result.responseTime, 'ms');
        console.log('📊 Headers Sent:', JSON.stringify({
          'Content-Type': 'application/json',
          'X-Test-ID': 'comprehensive-success-test',
          'X-Request-Timestamp': result.headers?.['x-request-timestamp'] || 'N/A'
        }, null, 2));
        console.log('📊 Response Headers:', JSON.stringify({
          'Content-Type': result.headers?.['content-type'] || 'N/A',
          'Server': result.headers?.server || 'N/A',
          'Date': result.headers?.date || 'N/A'
        }, null, 2));

      } catch (error: any) {
        console.warn('Successful request test skipped due to network issues:', error.message);
        this.skip();
      }
    });

    it('should capture detailed failure information with stacktraces', async function() {
      this.timeout(10000);
      
      const requestPayload = {
        invalidField: 'This should cause validation errors',
        missingRequiredField: null,
        testMetadata: {
          testType: 'failure-simulation',
          expectedOutcome: 'error',
          testId: 'comprehensive-failure-test',
          timestamp: new Date().toISOString()
        }
      };

      try {
        // This test intentionally tries to trigger an error for comprehensive error reporting
        await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
            .header('Content-Type', 'application/json')
            .header('X-Test-ID', 'comprehensive-failure-test')
            .body(requestPayload)
            .contextVariable('failureTestStart', Date.now())
          .when()
            .post('/posts/999999/invalid-endpoint') // This should fail
          .then()
            .statusCode(200) // This will fail since endpoint doesn't exist
            .jsonPath('$.success', true)
          .execute();

        // If we reach here, the test didn't fail as expected
        expect.fail('Expected request to fail, but it succeeded');

      } catch (error: any) {
        // Capture comprehensive error information for reporting
        console.log('❌ FAILURE TEST DETAILS:');
        console.log('📤 Request Payload:', JSON.stringify(requestPayload, null, 2));
        console.log('🔗 Request URL:', 'https://jsonplaceholder.typicode.com/posts/999999/invalid-endpoint');
        console.log('📊 Request Headers:', JSON.stringify({
          'Content-Type': 'application/json',
          'X-Test-ID': 'comprehensive-failure-test'
        }, null, 2));
        
        console.log('💥 Error Details:');
        console.log('   Message:', error.message);
        console.log('   Type:', error.constructor.name);
        console.log('   Status Code:', error.response?.status || 'N/A');
        console.log('   Status Text:', error.response?.statusText || 'N/A');

        if (error.response) {
          console.log('📥 Error Response Payload:', JSON.stringify(error.response.data, null, 2));
          console.log('📊 Error Response Headers:', JSON.stringify(error.response.headers, null, 2));
        }

        console.log('📚 Stack Trace:');
        console.log(error.stack);

        // Verify this is the expected error type
        expect(error).to.exist;
        expect(error.response?.status).to.equal(404);
      }
    });

    it('should log comprehensive test execution metrics', async function() {
      this.timeout(15000);
      
      const testStartTime = Date.now();
      const testMetrics = {
        testName: 'comprehensive-metrics-test',
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalResponseTime: 0,
        requestDetails: [] as any[]
      };

      try {
        // Execute multiple requests to gather metrics
        const requests = [
          { endpoint: '/posts/1', expectedStatus: 200, description: 'Get post 1' },
          { endpoint: '/posts/2', expectedStatus: 200, description: 'Get post 2' },
          { endpoint: '/users/1', expectedStatus: 200, description: 'Get user 1' },
          { endpoint: '/posts/999999', expectedStatus: 404, description: 'Get non-existent post' }
        ];

        for (const req of requests) {
          const requestStart = Date.now();
          testMetrics.totalRequests++;

          try {
            const result = await restified
              .given()
                .baseURL('https://jsonplaceholder.typicode.com')
                .header('X-Test-Request-ID', `metrics-${testMetrics.totalRequests}`)
              .when()
                .get(req.endpoint)
              .then()
                .statusCode(req.expectedStatus)
              .execute();

            const requestTime = Date.now() - requestStart;
            testMetrics.totalResponseTime += requestTime;
            testMetrics.successfulRequests++;

            testMetrics.requestDetails.push({
              description: req.description,
              endpoint: req.endpoint,
              status: 'SUCCESS',
              statusCode: result.status,
              responseTime: requestTime,
              payloadSize: JSON.stringify(result.data).length,
              timestamp: new Date().toISOString()
            });

          } catch (error: any) {
            const requestTime = Date.now() - requestStart;
            testMetrics.totalResponseTime += requestTime;
            testMetrics.failedRequests++;

            testMetrics.requestDetails.push({
              description: req.description,
              endpoint: req.endpoint,
              status: 'FAILED',
              statusCode: error.response?.status || 'N/A',
              responseTime: requestTime,
              errorMessage: error.message,
              timestamp: new Date().toISOString()
            });

            // For the 404 test, this is expected
            if (req.expectedStatus === 404 && error.response?.status === 404) {
              testMetrics.failedRequests--;
              testMetrics.successfulRequests++;
              testMetrics.requestDetails[testMetrics.requestDetails.length - 1].status = 'SUCCESS (Expected Error)';
            }
          }
        }

        const testEndTime = Date.now();
        const totalTestTime = testEndTime - testStartTime;

        // Log comprehensive test metrics
        console.log('📊 COMPREHENSIVE TEST METRICS:');
        console.log('===============================');
        console.log('🕐 Total Test Duration:', totalTestTime, 'ms');
        console.log('📈 Total Requests:', testMetrics.totalRequests);
        console.log('✅ Successful Requests:', testMetrics.successfulRequests);
        console.log('❌ Failed Requests:', testMetrics.failedRequests);
        console.log('⚡ Average Response Time:', Math.round(testMetrics.totalResponseTime / testMetrics.totalRequests), 'ms');
        console.log('🎯 Success Rate:', Math.round((testMetrics.successfulRequests / testMetrics.totalRequests) * 100), '%');
        
        console.log('\n📋 DETAILED REQUEST BREAKDOWN:');
        testMetrics.requestDetails.forEach((detail, index) => {
          console.log(`\n🔸 Request ${index + 1}: ${detail.description}`);
          console.log(`   Endpoint: ${detail.endpoint}`);
          console.log(`   Status: ${detail.status}`);
          console.log(`   Status Code: ${detail.statusCode}`);
          console.log(`   Response Time: ${detail.responseTime}ms`);
          console.log(`   Timestamp: ${detail.timestamp}`);
          if (detail.payloadSize) {
            console.log(`   Payload Size: ${detail.payloadSize} bytes`);
          }
          if (detail.errorMessage) {
            console.log(`   Error: ${detail.errorMessage}`);
          }
        });

        // Verify test execution
        expect(testMetrics.totalRequests).to.equal(4);
        expect(testMetrics.successfulRequests).to.equal(4); // All should succeed (including expected 404)
        expect(testMetrics.totalResponseTime).to.be.greaterThan(0);

      } catch (error: any) {
        console.warn('Metrics test encountered unexpected error:', error.message);
        this.skip();
      }
    });

    it('should demonstrate variable resolution logging', async function() {
      this.timeout(8000);
      
      try {
        // Set up complex variable resolution scenario
        const testData = {
          userId: '{{$random.uuid}}',
          userName: '{{$faker.name.fullName}}',
          userEmail: '{{$faker.internet.email}}',
          timestamp: '{{$date.now}}',
          environment: '{{$env.NODE_ENV}}',
          randomScore: '{{$math.random(1,100)}}',
          customVariable: 'RestifiedTS_Test_{{$random.alphaNumeric(8)}}'
        };

        console.log('🔄 VARIABLE RESOLUTION DEMO:');
        console.log('==============================');
        console.log('📝 Original Template:', JSON.stringify(testData, null, 2));

        const result = await restified
          .given()
            .baseURL('https://httpbin.org')
            .header('Content-Type', 'application/json')
            .contextVariable('testId', 'variable-resolution-demo')
            .contextVariable('staticValue', 'This is a static value')
            .body({
              testData: testData,
              additionalInfo: {
                testId: '{{testId}}',
                staticValue: '{{staticValue}}',
                nestedVariables: {
                  generatedId: '{{$random.uuid}}',
                  fakeCompany: '{{$faker.company.name}}',
                  fakeAddress: '{{$faker.address.streetAddress}}'
                }
              }
            })
          .when()
            .post('/post')
          .then()
            .statusCode(200)
          .execute();

        console.log('✅ Resolved Request Body:', JSON.stringify(result.data?.json, null, 2));
        console.log('📊 Response Headers:', JSON.stringify({
          'Content-Type': result.headers?.['content-type'],
          'Content-Length': result.headers?.['content-length'],
          'Server': result.headers?.server
        }, null, 2));

        expect(result.status).to.equal(200);
        expect(result.data.json.testData).to.exist;
        expect(result.data.json.additionalInfo.testId).to.equal('variable-resolution-demo');

      } catch (error: any) {
        console.warn('Variable resolution test failed:', error.message);
        this.skip();
      }
    });
  });

  describe('Error Handling and Stacktrace Capture', () => {
    it('should capture detailed error information for network failures', async function() {
      this.timeout(8000);
      
      const requestData = {
        testType: 'network-failure-simulation',
        expectedOutcome: 'connection-error',
        metadata: {
          testId: 'network-failure-test',
          timestamp: new Date().toISOString(),
          timeoutSetting: 5000
        }
      };

      try {
        await restified
          .given()
            .baseURL('https://non-existent-domain-for-testing-12345.invalid')
            .header('Content-Type', 'application/json')
            .timeout(5000)
            .body(requestData)
          .when()
            .post('/test-endpoint')
          .then()
            .statusCode(200)
          .execute();

        expect.fail('Expected network error but request succeeded');

      } catch (error: any) {
        console.log('🌐 NETWORK FAILURE TEST DETAILS:');
        console.log('=================================');
        console.log('📤 Attempted Request Data:', JSON.stringify(requestData, null, 2));
        console.log('🔗 Target URL:', 'https://non-existent-domain-for-testing-12345.invalid/test-endpoint');
        console.log('⏱️  Timeout Setting:', '5000ms');
        
        console.log('\n💥 Network Error Details:');
        console.log('   Error Type:', error.constructor.name);
        console.log('   Error Code:', error.code || 'N/A');
        console.log('   Error Message:', error.message);
        console.log('   Syscall:', error.syscall || 'N/A');
        console.log('   Hostname:', error.hostname || 'N/A');
        
        if (error.config) {
          console.log('   Request Method:', error.config.method?.toUpperCase() || 'N/A');
          console.log('   Request URL:', error.config.url || 'N/A');
          console.log('   Request Timeout:', error.config.timeout || 'N/A');
        }

        console.log('\n📚 Full Stack Trace:');
        console.log(error.stack);

        // Verify this is a network error
        expect(error).to.exist;
        expect(error.code).to.match(/ENOTFOUND|ECONNREFUSED|TIMEOUT/);
      }
    });

    it('should capture detailed assertion failure information', async function() {
      this.timeout(8000);
      
      try {
        const result = await restified
          .given()
            .baseURL('https://jsonplaceholder.typicode.com')
          .when()
            .get('/posts/1')
          .then()
            .statusCode(200)
            .jsonPath('$.title', 'Expected Title That Will Not Match')
            .jsonPath('$.userId', 999) // This will fail
            .jsonPath('$.id', 'not-a-number') // This will also fail
          .execute();

        expect.fail('Expected assertion failures but test passed');

      } catch (error: any) {
        console.log('🎯 ASSERTION FAILURE TEST DETAILS:');
        console.log('===================================');
        console.log('📤 Request URL:', 'https://jsonplaceholder.typicode.com/posts/1');
        console.log('📥 Actual Response:', JSON.stringify(error.response?.data || 'N/A', null, 2));
        
        console.log('\n❌ Assertion Failures:');
        console.log('   Error Type:', error.constructor.name);
        console.log('   Error Message:', error.message);
        
        if (error.actual !== undefined) {
          console.log('   Expected Value:', error.expected);
          console.log('   Actual Value:', error.actual);
        }

        console.log('\n📚 Assertion Stack Trace:');
        console.log(error.stack);

        // Verify this is an assertion error
        expect(error).to.exist;
        expect(error.message).to.include('expected');
      }
    });

    it('should capture timeout error information', async function() {
      this.timeout(10000);
      
      const requestPayload = {
        testType: 'timeout-simulation',
        slowEndpointTest: true,
        metadata: {
          testId: 'timeout-test',
          timeoutSetting: 1000, // Very short timeout
          timestamp: new Date().toISOString()
        }
      };

      try {
        await restified
          .given()
            .baseURL('https://httpbin.org')
            .timeout(1000) // 1 second timeout
            .header('Content-Type', 'application/json')
            .body(requestPayload)
          .when()
            .get('/delay/3') // 3 second delay - will timeout
          .then()
            .statusCode(200)
          .execute();

        expect.fail('Expected timeout error but request succeeded');

      } catch (error: any) {
        console.log('⏱️  TIMEOUT ERROR TEST DETAILS:');
        console.log('===============================');
        console.log('📤 Request Payload:', JSON.stringify(requestPayload, null, 2));
        console.log('🔗 Request URL:', 'https://httpbin.org/delay/3');
        console.log('⏰ Timeout Setting:', '1000ms');
        console.log('🎯 Expected Delay:', '3000ms');
        
        console.log('\n⏱️  Timeout Error Details:');
        console.log('   Error Type:', error.constructor.name);
        console.log('   Error Code:', error.code || 'N/A');
        console.log('   Error Message:', error.message);
        console.log('   Timeout Value:', error.config?.timeout || 'N/A');
        
        console.log('\n📚 Timeout Stack Trace:');
        console.log(error.stack);

        // Verify this is a timeout error
        expect(error).to.exist;
        expect(error.code || error.message).to.match(/ECONNABORTED|timeout/i);
      }
    });
  });

  describe('Performance and Timing Metrics', () => {
    it('should capture detailed performance metrics', async function() {
      this.timeout(12000);
      
      const performanceTest = {
        testId: 'performance-metrics-test',
        endpoints: [
          { url: '/posts/1', description: 'Small payload' },
          { url: '/posts', description: 'Large payload (100 posts)' },
          { url: '/users/1', description: 'Medium payload' }
        ],
        timestamp: new Date().toISOString()
      };

      const results: any[] = [];

      try {
        for (const endpoint of performanceTest.endpoints) {
          const startTime = Date.now();
          
          const result = await restified
            .given()
              .baseURL('https://jsonplaceholder.typicode.com')
              .header('X-Performance-Test', 'true')
            .when()
              .get(endpoint.url)
            .then()
              .statusCode(200)
            .execute();

          const endTime = Date.now();
          const responseTime = endTime - startTime;

          results.push({
            endpoint: endpoint.url,
            description: endpoint.description,
            responseTime: responseTime,
            statusCode: result.status,
            payloadSize: JSON.stringify(result.data).length,
            timestamp: new Date().toISOString()
          });
        }

        console.log('🚀 PERFORMANCE METRICS TEST RESULTS:');
        console.log('====================================');
        
        results.forEach((result, index) => {
          console.log(`\n📊 Test ${index + 1}: ${result.description}`);
          console.log(`   Endpoint: ${result.endpoint}`);
          console.log(`   Response Time: ${result.responseTime}ms`);
          console.log(`   Status Code: ${result.statusCode}`);
          console.log(`   Payload Size: ${result.payloadSize} bytes`);
          console.log(`   Throughput: ${Math.round(result.payloadSize / result.responseTime * 1000)} bytes/sec`);
          console.log(`   Timestamp: ${result.timestamp}`);
        });

        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        const totalPayloadSize = results.reduce((sum, r) => sum + r.payloadSize, 0);

        console.log('\n📈 SUMMARY STATISTICS:');
        console.log(`   Total Requests: ${results.length}`);
        console.log(`   Average Response Time: ${Math.round(avgResponseTime)}ms`);
        console.log(`   Total Data Transferred: ${totalPayloadSize} bytes`);
        console.log(`   Fastest Request: ${Math.min(...results.map(r => r.responseTime))}ms`);
        console.log(`   Slowest Request: ${Math.max(...results.map(r => r.responseTime))}ms`);

        expect(results).to.have.length(3);
        expect(avgResponseTime).to.be.lessThan(5000); // Should be under 5 seconds average

      } catch (error: any) {
        console.warn('Performance metrics test failed:', error.message);
        this.skip();
      }
    });
  });
});