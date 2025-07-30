/**
 * K6 Faker Integration Examples
 * Demonstrating realistic test data generation with K6 and RestifiedTS
 * Similar to xk6-faker but with TypeScript support and extended features
 */

import { K6Integration } from '../src/performance/K6Integration';
import { PerformanceEngine } from '../src/performance/PerformanceEngine';
import { K6FakerScenario, K6UserJourney, K6FakerTemplates } from '../src/performance/K6FakerIntegration';

// =============================================
// EXAMPLE 1: Basic Faker Integration
// =============================================

async function basicFakerExample() {
  console.log('🎭 K6 Faker Integration Example');
  
  const k6 = new K6Integration({
    fakerConfig: {
      locale: 'en', // or 'de', 'fr', 'es', etc.
      seed: 12345  // for reproducible data
    }
  });

  // Define test scenarios with faker data
  const scenarios: K6FakerScenario[] = [
    {
      name: 'User Registration',
      endpoint: '/api/users',
      method: 'POST',
      dataFields: [
        { name: 'user', type: 'person' },
        { name: 'address', type: 'address' }
      ],
      validations: [
        { description: 'user created successfully', check: 'r.status === 201' },
        { description: 'user ID returned', check: 'r.json("id") !== undefined' }
      ]
    },
    {
      name: 'Product Creation',
      endpoint: '/api/products',
      method: 'POST',
      dataFields: [
        { name: 'product', type: 'product' },
        { name: 'company', type: 'company' }
      ]
    }
  ];

  // Generate TypeScript K6 script with faker data
  const script = k6.generateK6TestWithFaker(scenarios);
  console.log('Generated K6 Script with Faker:');
  console.log(script);
}

// =============================================
// EXAMPLE 2: E-commerce Load Testing
// =============================================

async function ecommerceLoadTest() {
  console.log('🛒 E-commerce Load Test with Faker Data');
  
  const performanceEngine = new PerformanceEngine();
  
  // Generate realistic e-commerce scenario
  const { script, config } = performanceEngine.generateEcommerceTest('https://api.shopify.example.com');
  
  console.log('E-commerce Test Script:');
  console.log(script);
  
  // Run the test
  const testId = await performanceEngine.runFakerTest({
    baseUrl: 'https://api.shopify.example.com',
    scenarios: [
      K6FakerTemplates.ecommerce.userRegistration,
      K6FakerTemplates.ecommerce.productPurchase
    ],
    users: 50,
    duration: '5m'
  });
  
  console.log(`🚀 Started e-commerce load test: ${testId}`);
}

// =============================================
// EXAMPLE 3: Financial Services Testing
// =============================================

async function financialServicesTest() {
  console.log('💳 Financial Services API Testing');
  
  const k6 = new K6Integration({
    fakerConfig: {
      locale: 'en_US',
      seed: 98765
    }
  });

  const financialScenarios: K6FakerScenario[] = [
    {
      name: 'Account Creation',
      endpoint: '/api/accounts',
      method: 'POST',
      dataFields: [
        { name: 'customer', type: 'person' },
        { name: 'financialInfo', type: 'financial' }
      ],
      validations: [
        { description: 'account created', check: 'r.status === 201' },
        { description: 'account number generated', check: 'r.json("accountNumber") !== undefined' }
      ]
    },
    {
      name: 'Transaction Processing',
      endpoint: '/api/transactions',
      method: 'POST',
      dataFields: [
        { name: 'transaction', type: 'financial' },
        { name: 'sender', type: 'person' },
        { name: 'receiver', type: 'person' }
      ],
      validations: [
        { description: 'transaction processed', check: 'r.status === 200' },
        { description: 'transaction ID returned', check: 'r.json("transactionId") !== undefined' }
      ]
    }
  ];

  const script = k6.generateFakerLoadTest({
    baseUrl: 'https://api.banking.example.com',
    scenarios: financialScenarios,
    users: 25,
    duration: '3m'
  });

  console.log('Financial Services Test Script:');
  console.log(script);
}

// =============================================
// EXAMPLE 4: User Journey Testing
// =============================================

async function userJourneyTest() {
  console.log('👤 User Journey Testing with Faker');
  
  const k6 = new K6Integration();

  // Define a complete user journey
  const userJourney: K6UserJourney = {
    name: 'Complete Shopping Journey',
    description: 'End-to-end user experience from registration to purchase',
    steps: [
      {
        name: 'User Registration',
        endpoint: '/api/auth/register',
        method: 'POST',
        dataFields: [
          { name: 'user', type: 'person' }
        ],
        thinkTime: 2
      },
      {
        name: 'Browse Products',
        endpoint: '/api/products',
        method: 'GET',
        thinkTime: 3
      },
      {
        name: 'Add to Cart',
        endpoint: '/api/cart/items',
        method: 'POST',
        dataFields: [
          { name: 'product', type: 'product' }
        ],
        thinkTime: 1
      },
      {
        name: 'Update Profile',
        endpoint: '/api/users/profile',
        method: 'PUT',
        dataFields: [
          { name: 'address', type: 'address' }
        ],
        thinkTime: 2
      },
      {
        name: 'Checkout',
        endpoint: '/api/orders',
        method: 'POST',
        dataFields: [
          { name: 'payment', type: 'financial' }
        ],
        thinkTime: 1
      }
    ]
  };

  const journeyScript = k6.generateUserJourneyTest(userJourney, 'https://api.example.com');
  console.log('User Journey Script:');
  console.log(journeyScript);
}

// =============================================
// EXAMPLE 5: Custom Data Providers
// =============================================

async function customDataProviders() {
  console.log('🔧 Custom Faker Data Providers');
  
  const k6 = new K6Integration();

  // Get available faker providers
  const providers = k6.getFakerProviders();
  console.log('Available Faker Providers:');
  Object.entries(providers).forEach(([category, fields]) => {
    console.log(`  ${category}: ${fields.join(', ')}`);
  });

  // Create scenarios with custom data generation
  const customScenarios: K6FakerScenario[] = [
    {
      name: 'Custom API Test',
      endpoint: '/api/custom',
      method: 'POST',
      dataFields: [
        {
          name: 'customData',
          type: 'custom',
          generator: `
            return {
              customId: faker.datatype.uuid(),
              timestamp: new Date().toISOString(),
              randomScore: faker.datatype.number({ min: 1, max: 100 }),
              category: faker.random.arrayElement(['A', 'B', 'C']),
              metadata: {
                source: 'k6-faker-test',
                version: '1.0.0'
              }
            };
          `
        }
      ]
    }
  ];

  const customScript = k6.generateK6TestWithFaker(customScenarios);
  console.log('Custom Data Generation Script:');
  console.log(customScript);
}

// =============================================
// EXAMPLE 6: Stress Testing with Realistic Data
// =============================================

async function stressTestWithFaker() {
  console.log('⚡ Stress Testing with Realistic Data');
  
  const performanceEngine = new PerformanceEngine();

  // High-load scenarios with varied data
  const stressScenarios: K6FakerScenario[] = [
    {
      name: 'Heavy User Creation',
      endpoint: '/api/users/bulk',
      method: 'POST',
      dataFields: [
        { name: 'users', type: 'person' },
        { name: 'companies', type: 'company' }
      ]
    },
    {
      name: 'Mass Product Upload',
      endpoint: '/api/products/batch',
      method: 'POST',
      dataFields: [
        { name: 'products', type: 'product' }
      ]
    },
    {
      name: 'Financial Transactions',
      endpoint: '/api/transactions/process',
      method: 'POST',
      dataFields: [
        { name: 'transactions', type: 'financial' }
      ]
    }
  ];

  const testId = await performanceEngine.runFakerTest({
    baseUrl: 'https://api.example.com',
    scenarios: stressScenarios,
    users: 100,
    duration: '10m',
    engine: 'k6'
  });

  console.log(`🚀 Started stress test with faker data: ${testId}`);
}

// =============================================
// EXAMPLE 7: Multi-Locale Testing
// =============================================

async function multiLocaleTest() {
  console.log('🌍 Multi-Locale Testing');
  
  const locales = ['en', 'de', 'fr', 'es', 'ja'];
  
  for (const locale of locales) {
    console.log(`\n--- Testing with locale: ${locale} ---`);
    
    const k6 = new K6Integration({
      fakerConfig: {
        locale,
        seed: 12345 // same seed for consistent comparison
      }
    });

    const scenarios: K6FakerScenario[] = [
      {
        name: `User Registration (${locale})`,
        endpoint: `/api/users/${locale}`,
        method: 'POST',
        dataFields: [
          { name: 'user', type: 'person' },
          { name: 'address', type: 'address' }
        ]
      }
    ];

    const script = k6.generateK6TestWithFaker(scenarios);
    console.log(`Generated script for ${locale}:`);
    console.log(script.substring(0, 500) + '...');
  }
}

// =============================================
// EXAMPLE 8: Performance Comparison
// =============================================

async function performanceComparison() {
  console.log('📊 Performance Comparison: Real vs Fake Data');
  
  const performanceEngine = new PerformanceEngine();

  // Test with static data
  console.log('Testing with static data...');
  const staticTestId = await performanceEngine.runPerformanceTest({
    name: 'Static Data Test',
    baseUrl: 'https://api.example.com',
    endpoints: [
      {
        path: '/api/users',
        method: 'POST',
        body: { name: 'John Doe', email: 'john@example.com' }
      }
    ],
    scenarios: { load: true }
  });

  // Test with faker data
  console.log('Testing with faker data...');
  const fakerTestId = await performanceEngine.runFakerTest({
    baseUrl: 'https://api.example.com',
    scenarios: [
      {
        name: 'Dynamic User Creation',
        endpoint: '/api/users',
        method: 'POST',
        dataFields: [
          { name: 'user', type: 'person' }
        ]
      }
    ],
    users: 20,
    duration: '2m'
  });

  console.log(`Static data test: ${staticTestId}`);
  console.log(`Faker data test: ${fakerTestId}`);
}

// =============================================
// Run Examples
// =============================================

async function runFakerExamples() {
  console.log('🎭 K6 Faker Integration Examples\n');
  
  try {
    await basicFakerExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await ecommerceLoadTest();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await financialServicesTest();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await userJourneyTest();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await customDataProviders();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await stressTestWithFaker();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await multiLocaleTest();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await performanceComparison();
    
  } catch (error) {
    console.error('Error running faker examples:', error);
  }
}

// Export examples
export {
  basicFakerExample,
  ecommerceLoadTest,
  financialServicesTest,
  userJourneyTest,
  customDataProviders,
  stressTestWithFaker,
  multiLocaleTest,
  performanceComparison,
  runFakerExamples
};

// Run if called directly
if (require.main === module) {
  runFakerExamples();
}