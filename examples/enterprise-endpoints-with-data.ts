/**
 * Enterprise Testing Examples - Endpoints with Query Params, Request Bodies, and Headers
 * 
 * This example demonstrates how to test REST APIs with complex data requirements
 * including query parameters, request bodies, headers, and path parameters
 * across multiple roles and services.
 */

import { RestifiedTS } from '../src/index';
import { 
  EndpointDefinition, 
  BatchTestConfig,
  DataGenerationConfig,
  EndpointTestCase 
} from '../src/core/enterprise';

async function runEnterpriseTestingWithData() {
  const restified = new RestifiedTS();

  // === STEP 1: Define roles with different authentication methods ===
  console.log('🔐 Setting up roles...');
  
  restified.createRole({
    name: 'admin',
    description: 'Administrator with full access',
    auth: {
      type: 'bearer',
      token: process.env.ADMIN_TOKEN || 'admin-secret-token'
    }
  });

  restified.createRole({
    name: 'manager',
    description: 'Manager with limited access',
    auth: {
      type: 'bearer',
      token: process.env.MANAGER_TOKEN || 'manager-secret-token'
    }
  });

  restified.createRole({
    name: 'user',
    description: 'Regular user with read access',
    auth: {
      type: 'bearer',
      token: process.env.USER_TOKEN || 'user-secret-token'
    }
  });

  restified.createRole({
    name: 'api-client',
    description: 'API client with API key authentication',
    auth: {
      type: 'apikey',
      apiKey: process.env.API_KEY || 'api-key-12345',
      headerName: 'X-API-Key'
    }
  });

  // === STEP 2: Define endpoints with comprehensive data requirements ===
  console.log('📊 Defining endpoints with data requirements...');

  const endpoints: EndpointDefinition[] = [
    // GET endpoint with query parameters
    {
      service: 'userService',
      path: '/api/v1/users',
      method: 'GET',
      description: 'Get users with filtering and pagination',
      queryParams: {
        required: {
          page: {
            type: 'number',
            min: 1,
            max: 100,
            default: 1,
            description: 'Page number for pagination'
          }
        },
        optional: {
          limit: {
            type: 'number',
            min: 10,
            max: 100,
            default: 20,
            description: 'Number of items per page'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
            description: 'User status filter'
          },
          search: {
            type: 'string',
            faker: 'person.fullName',
            description: 'Search query for user names'
          },
          created_after: {
            type: 'date',
            generator: 'timestamp',
            description: 'Filter users created after this date'
          }
        },
        examples: [
          { page: 1, limit: 10, status: 'active' },
          { page: 2, limit: 20, search: 'john' },
          { page: 1, status: 'pending', created_after: '2024-01-01T00:00:00Z' }
        ]
      },
      headers: {
        optional: {
          'Accept-Language': {
            type: 'string',
            enum: ['en-US', 'fr-FR', 'es-ES'],
            default: 'en-US'
          },
          'X-Client-Version': {
            type: 'string',
            default: '1.0.0'
          }
        }
      },
      tags: ['users', 'public']
    },

    // GET endpoint with path parameters
    {
      service: 'userService',
      path: '/api/v1/users/{userId}',
      method: 'GET',
      description: 'Get specific user by ID',
      pathParams: {
        required: {
          userId: {
            type: 'uuid',
            generator: 'uuid',
            description: 'User ID'
          }
        }
      },
      // Predefined test cases with specific user IDs
      testCases: [
        {
          name: 'Valid user ID',
          description: 'Test with a known valid user ID',
          data: {
            pathParams: { userId: '{{$faker.string.uuid}}' }
          },
          expectedStatusCodes: [200, 404], // May or may not exist
          roleOverrides: {
            'admin': [200], // Admin should always see the user
            'user': [200, 403] // User might not have access
          }
        },
        {
          name: 'Invalid user ID format',
          description: 'Test with invalid UUID format',
          data: {
            pathParams: { userId: 'invalid-id' }
          },
          expectedStatusCodes: [400, 404]
        }
      ],
      tags: ['users', 'details']
    },

    // POST endpoint with request body
    {
      service: 'userService',
      path: '/api/v1/users',
      method: 'POST',
      description: 'Create a new user',
      headers: {
        required: {
          'Content-Type': {
            type: 'string',
            default: 'application/json'
          }
        }
      },
      requestBody: {
        required: {
          email: {
            type: 'email',
            faker: 'internet.email',
            description: 'User email address'
          },
          firstName: {
            type: 'string',
            faker: 'person.firstName',
            description: 'User first name'
          },
          lastName: {
            type: 'string',
            faker: 'person.lastName',
            description: 'User last name'
          }
        },
        optional: {
          phone: {
            type: 'string',
            faker: 'phone.number',
            description: 'User phone number'
          },
          age: {
            type: 'number',
            min: 18,
            max: 120,
            description: 'User age'
          },
          department: {
            type: 'string',
            enum: ['engineering', 'marketing', 'sales', 'hr'],
            description: 'User department'
          },
          preferences: {
            type: 'object',
            description: 'User preferences object'
          }
        },
        examples: [
          {
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            department: 'engineering',
            age: 30
          },
          {
            email: '{{$faker.internet.email}}',
            firstName: '{{$faker.person.firstName}}',
            lastName: '{{$faker.person.lastName}}',
            phone: '{{$faker.phone.number}}',
            preferences: {
              theme: 'dark',
              notifications: true
            }
          }
        ]
      },
      tags: ['users', 'creation']
    },

    // PUT endpoint with both path params and request body
    {
      service: 'userService',
      path: '/api/v1/users/{userId}',
      method: 'PUT',
      description: 'Update user information',
      pathParams: {
        required: {
          userId: {
            type: 'uuid',
            generator: 'uuid',
            description: 'User ID to update'
          }
        }
      },
      headers: {
        required: {
          'Content-Type': {
            type: 'string',
            default: 'application/json'
          }
        },
        optional: {
          'If-Match': {
            type: 'string',
            faker: 'string.alphanumeric',
            description: 'ETag for optimistic locking'
          }
        }
      },
      requestBody: {
        optional: {
          firstName: {
            type: 'string',
            faker: 'person.firstName'
          },
          lastName: {
            type: 'string',
            faker: 'person.lastName'
          },
          email: {
            type: 'email',
            faker: 'internet.email'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'suspended']
          }
        }
      },
      tags: ['users', 'update']
    },

    // Complex endpoint with nested query parameters
    {
      service: 'reportService',
      path: '/api/v1/reports/analytics',
      method: 'GET',
      description: 'Get analytics report with complex filtering',
      queryParams: {
        required: {
          dateFrom: {
            type: 'date',
            description: 'Start date for report'
          },
          dateTo: {
            type: 'date',
            description: 'End date for report'
          }
        },
        optional: {
          metrics: {
            type: 'array',
            description: 'Metrics to include in report'
          },
          groupBy: {
            type: 'string',
            enum: ['day', 'week', 'month'],
            default: 'day'
          },
          filters: {
            type: 'object',
            description: 'Additional filters as JSON object'
          }
        },
        templates: [
          'dateFrom={{$date.now}}&dateTo={{$date.now}}&groupBy=day',
          'dateFrom=2024-01-01&dateTo=2024-12-31&metrics=revenue,users&groupBy=month'
        ]
      },
      tags: ['reports', 'analytics']
    }
  ];

  // === STEP 3: Configure data generation ===
  console.log('🎯 Configuring data generation...');

  const dataGenerationConfig: DataGenerationConfig = {
    enableFaker: true,
    enableBoundaryTesting: true,
    testDataVariations: 3, // Generate 3 variations per endpoint
    customVariables: {
      companyId: '12345',
      tenantId: 'acme-corp',
      version: 'v1',
      currentUser: 'test@example.com'
    },
    cacheTestData: true
  };

  // === STEP 4: Configure batch testing ===
  console.log('⚙️ Setting up batch test configuration...');

  const batchConfig: BatchTestConfig = {
    name: 'Enterprise API Testing with Data Requirements',
    description: 'Comprehensive testing of all endpoints with various data combinations across all roles',
    services: [
      {
        name: 'userService',
        baseUrl: process.env.USER_SERVICE_URL || 'https://api.example.com',
        timeout: 30000,
        headers: {
          'X-Service-Version': '1.0',
          'Accept': 'application/json'
        }
      },
      {
        name: 'reportService',
        baseUrl: process.env.REPORT_SERVICE_URL || 'https://reports.example.com',
        timeout: 45000
      }
    ],
    roles: ['admin', 'manager', 'user', 'api-client'],
    endpoints,
    execution: {
      parallelism: 8, // Use 8 parallel workers
      timeout: 60000,
      retries: 2,
      continueOnFailure: true,
      loadBalancing: 'round-robin',
      rateLimiting: {
        requestsPerSecond: 10,
        burstSize: 20
      }
    },
    reporting: {
      formats: ['json', 'html'],
      outputDir: './reports/enterprise-data-tests',
      includeMetrics: true,
      includeResponses: true,
      realTimeUpdates: true
    },
    dataGeneration: dataGenerationConfig,
    filters: {
      includeMethods: ['GET', 'POST', 'PUT'],
      includeTags: ['users', 'reports']
    }
  };

  // === STEP 5: Execute comprehensive testing ===
  console.log('🚀 Starting enterprise testing with data requirements...');

  try {
    const result = await restified.executeBatchTests(batchConfig);

    console.log('\n📊 Test Results Summary:');
    console.log(`Total tests executed: ${result.summary.total}`);
    console.log(`Success rate: ${result.summary.passRate.toFixed(2)}%`);
    console.log(`Tests passed: ${result.summary.passed}`);
    console.log(`Tests failed: ${result.summary.failed}`);
    console.log(`Average response time: ${result.summary.averageResponseTime.toFixed(2)}ms`);

    console.log('\n📈 Data Generation Analysis:');
    const dataGenerationStats = result.results.reduce((stats, test) => {
      if (test.testData?.generationMethod) {
        stats[test.testData.generationMethod] = (stats[test.testData.generationMethod] || 0) + 1;
      }
      if (test.metadata.testType) {
        stats[`testType_${test.metadata.testType}`] = (stats[`testType_${test.metadata.testType}`] || 0) + 1;
      }
      return stats;
    }, {} as Record<string, number>);

    console.log('Data generation methods used:');
    Object.entries(dataGenerationStats).forEach(([method, count]) => {
      console.log(`  ${method}: ${count} tests`);
    });

    console.log('\n🎭 Role-based Analysis:');
    Object.entries(result.roleAnalysis.byRole).forEach(([role, stats]) => {
      console.log(`${role}:`);
      console.log(`  Total tests: ${stats.total}`);
      console.log(`  Success rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
      console.log(`  Access granted: ${stats.accessGranted}`);
      console.log(`  Access denied: ${stats.accessDenied}`);
      console.log(`  Avg response time: ${stats.averageResponseTime.toFixed(2)}ms`);
    });

    console.log('\n🔍 Service Analysis:');
    Object.entries(result.serviceAnalysis.byService).forEach(([service, stats]) => {
      console.log(`${service}:`);
      console.log(`  Total tests: ${stats.total}`);
      console.log(`  Success rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
      console.log(`  Endpoints covered: ${stats.endpointsCovered}`);
      console.log(`  Avg response time: ${stats.averageResponseTime.toFixed(2)}ms`);
    });

    console.log('\n📋 Sample Test Results with Data:');
    result.results.slice(0, 5).forEach((test, index) => {
      console.log(`\nTest ${index + 1}:`);
      console.log(`  Endpoint: ${test.method} ${test.endpoint}`);
      console.log(`  Role: ${test.role}`);
      console.log(`  Status: ${test.success ? '✅ PASS' : '❌ FAIL'} (${test.statusCode})`);
      console.log(`  Test type: ${test.metadata.testType}`);
      console.log(`  Data variation: ${test.metadata.dataVariation || 'N/A'}`);
      
      if (test.testData) {
        console.log(`  Test data:`);
        if (test.testData.queryParams) {
          console.log(`    Query params: ${JSON.stringify(test.testData.queryParams)}`);
        }
        if (test.testData.requestBody) {
          console.log(`    Request body: ${JSON.stringify(test.testData.requestBody)}`);
        }
        if (test.testData.pathParams) {
          console.log(`    Path params: ${JSON.stringify(test.testData.pathParams)}`);
        }
        if (test.testData.headers) {
          console.log(`    Headers: ${JSON.stringify(test.testData.headers)}`);
        }
      }
    });

    console.log(`\n✅ Enterprise testing completed successfully!`);
    console.log(`📁 Detailed reports available in: ${batchConfig.reporting.outputDir}`);

  } catch (error) {
    console.error('❌ Enterprise testing failed:', error.message);
    throw error;
  }

  // === STEP 6: Cleanup ===
  await restified.cleanup();
}

// === STEP 7: Specialized examples for different data scenarios ===

async function runBoundaryTestingExample() {
  console.log('\n🧪 Running boundary testing example...');
  
  const restified = new RestifiedTS();
  
  // Create a role for boundary testing
  restified.createRole({
    name: 'boundary-tester',
    auth: { type: 'bearer', token: 'boundary-test-token' }
  });

  // Define endpoint with strict validation requirements
  const strictEndpoint: EndpointDefinition = {
    service: 'validationService',
    path: '/api/v1/validate',
    method: 'POST',
    requestBody: {
      required: {
        username: {
          type: 'string',
          min: 3,
          max: 20,
          pattern: 'alphanumeric'
        },
        age: {
          type: 'number',
          min: 0,
          max: 150
        },
        tags: {
          type: 'array',
          min: 1,
          max: 5
        }
      }
    }
  };

  const boundaryConfig: BatchTestConfig = {
    name: 'Boundary Testing Example',
    description: 'Test edge cases and boundary conditions',
    services: [{
      name: 'validationService',
      baseUrl: 'https://validation.example.com'
    }],
    roles: ['boundary-tester'],
    endpoints: [strictEndpoint],
    execution: {
      parallelism: 2,
      timeout: 30000,
      retries: 1,
      continueOnFailure: true,
      loadBalancing: 'round-robin'
    },
    reporting: {
      formats: ['json'],
      outputDir: './reports/boundary-tests',
      includeMetrics: true,
      includeResponses: false,
      realTimeUpdates: false
    },
    dataGeneration: {
      enableFaker: false, // Use only boundary values
      enableBoundaryTesting: true,
      testDataVariations: 1,
      cacheTestData: false
    }
  };

  try {
    const result = await restified.executeBatchTests(boundaryConfig);
    console.log(`Boundary tests completed: ${result.summary.total} tests executed`);
    
    // Find tests that caught validation errors
    const validationErrors = result.results.filter(test => 
      test.statusCode === 400 || test.statusCode === 422
    );
    
    console.log(`Found ${validationErrors.length} validation errors - this is expected for boundary testing!`);
    
  } catch (error) {
    console.error('Boundary testing failed:', error.message);
  }

  await restified.cleanup();
}

// Export for use in other files
export {
  runEnterpriseTestingWithData,
  runBoundaryTestingExample
};

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      await runEnterpriseTestingWithData();
      await runBoundaryTestingExample();
    } catch (error) {
      console.error('Examples failed:', error);
      process.exit(1);
    }
  })();
}