/**
 * xk6-faker Pattern Integration Examples
 * Demonstrating how RestifiedTS follows the exact same pattern as xk6-faker
 * but with enhanced TypeScript support
 */

import { K6Integration, K6FakerScenario } from '../src/performance/K6Integration';

// =============================================
// EXAMPLE 1: xk6-faker Compatible Script Generation
// =============================================

async function generateXk6FakerCompatibleScript() {
  console.log('🎭 Generating xk6-faker Compatible K6 Script');
  
  const k6 = new K6Integration();

  const scenarios: K6FakerScenario[] = [
    {
      name: 'User Registration',
      endpoint: '/api/users',
      method: 'POST',
      dataFields: [
        { name: 'user', type: 'person' },
        { name: 'address', type: 'address' }
      ]
    }
  ];

  const script = k6.generateK6TestWithFaker(scenarios);
  
  console.log('Generated xk6-faker compatible script:');
  console.log(script);
  
  // This generates a script like:
  /*
  import http from 'k6/http';
  import { check, sleep } from 'k6';
  import { Rate, Trend, Counter } from 'k6/metrics';
  import { Options } from 'k6/options';
  
  // RestifiedTS Faker Integration - xk6-faker compatible
  // Makes faker globally available like xk6-faker extension
  import { faker } from '@faker-js/faker';
  globalThis.faker = faker;
  
  function generateUser() {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      avatar: faker.image.avatar()
    };
  }
  
  function generateAddress() {
    return {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country()
    };
  }
  
  export function userRegistrationScenario() {
    const user = generateUser();
    const address = generateAddress();
    
    const payload = {
      ...user,
      ...address
    };
    
    const response = http.post('/api/users', JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    check(response, {
      'User Registration status is 200': (r) => r.status === 200,
      'User Registration response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    sleep(Math.random() * 2 + 1);
  }
  */
}

// =============================================
// EXAMPLE 2: Direct faker Usage (xk6-faker style)
// =============================================

function showXk6FakerPattern() {
  console.log('\n🔧 xk6-faker Pattern Comparison');
  
  console.log('\n--- With xk6-faker extension ---');
  console.log(`
// In xk6-faker, you would write:
export default function() {
  const user = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email()
  };
  
  http.post('/api/users', JSON.stringify(user));
}
  `);

  console.log('\n--- With RestifiedTS (same pattern!) ---');
  console.log(`
// RestifiedTS generates the exact same pattern:
import { faker } from '@faker-js/faker';
globalThis.faker = faker;

export default function() {
  const user = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(), 
    email: faker.internet.email()
  };
  
  http.post('/api/users', JSON.stringify(user));
}
  `);

  console.log('\n✅ Key Differences:');
  console.log('  xk6-faker: Binary extension, JavaScript only');
  console.log('  RestifiedTS: TypeScript support, no binary extension needed');
  console.log('  Both: Same faker API, same global availability');
}

// =============================================
// EXAMPLE 3: Advanced xk6-faker Patterns
// =============================================

async function advancedXk6FakerPatterns() {
  console.log('\n🚀 Advanced xk6-faker Compatible Patterns');
  
  const k6 = new K6Integration();

  // Complex scenario matching xk6-faker capabilities
  const advancedScenarios: K6FakerScenario[] = [
    {
      name: 'E-commerce Order',
      endpoint: '/api/orders',
      method: 'POST',
      dataFields: [
        { name: 'customer', type: 'person' },
        { name: 'product', type: 'product' },
        { name: 'payment', type: 'financial' },
        { name: 'shipping', type: 'address' }
      ],
      validations: [
        { description: 'order created', check: 'r.status === 201' },
        { description: 'order ID returned', check: 'r.json("orderId") !== undefined' }
      ]
    }
  ];

  const script = k6.generateComprehensiveFakerTest({
    baseUrl: 'https://api.ecommerce.example.com',
    scenarios: advancedScenarios,
    users: 50,
    duration: '5m'
  });

  console.log('Advanced xk6-faker pattern script generated!');
  console.log('Features included:');
  console.log('  ✅ Global faker object (like xk6-faker)');
  console.log('  ✅ TypeScript support (beyond xk6-faker)');
  console.log('  ✅ Complex data generation');
  console.log('  ✅ Realistic user flows');
  console.log('  ✅ Performance metrics');
  console.log('  ✅ Custom validations');
}

// =============================================
// EXAMPLE 4: Migration from xk6-faker
// =============================================

function migrationGuide() {
  console.log('\n📦 Migration from xk6-faker to RestifiedTS');
  
  console.log('\n--- Current xk6-faker setup ---');
  console.log(`
# Build K6 with xk6-faker extension
xk6 build --with github.com/grafana/xk6-faker

# Run test
./k6 run test.js
  `);

  console.log('\n--- RestifiedTS equivalent ---');
  console.log(`
# Generate TypeScript test with faker
npx restifiedts faker-test -t ecommerce --users 50 --duration 5m

# Run with K6 (no extension needed!)
k6 run --compatibility-mode=experimental_enhanced generated-test.ts
  `);

  console.log('\n🎯 Benefits of RestifiedTS approach:');
  console.log('  ✅ No binary compilation needed');
  console.log('  ✅ Native TypeScript support');
  console.log('  ✅ Integrated with existing test framework');
  console.log('  ✅ More data types and templates');
  console.log('  ✅ CLI generation tools');
  console.log('  ✅ Same faker API as xk6-faker');
}

// =============================================
// EXAMPLE 5: Real-world Comparison
// =============================================

async function realWorldComparison() {
  console.log('\n🌍 Real-world Usage Comparison');
  
  // Show what actual generated code looks like
  const k6 = new K6Integration();
  
  const realWorldScenario: K6FakerScenario[] = [
    {
      name: 'Financial Transaction',
      endpoint: '/api/transactions',
      method: 'POST',
      dataFields: [
        { name: 'transaction', type: 'financial' },
        { name: 'sender', type: 'person' },
        { name: 'receiver', type: 'person' }
      ]
    }
  ];

  const generatedScript = k6.generateK6TestWithFaker(realWorldScenario);
  
  console.log('\n📄 Generated Script Sample:');
  console.log(generatedScript.substring(0, 800) + '...');
  
  console.log('\n🔍 Key Features:');
  console.log('  • Global faker object (just like xk6-faker)');
  console.log('  • TypeScript types and interfaces');
  console.log('  • Modern faker.js API');
  console.log('  • K6 v0.52+ compatibility');
  console.log('  • No extensions required');
}

// Export examples
export {
  generateXk6FakerCompatibleScript,
  showXk6FakerPattern,
  advancedXk6FakerPatterns,
  migrationGuide,
  realWorldComparison
};

// Run examples if called directly
if (require.main === module) {
  async function runExamples() {
    await generateXk6FakerCompatibleScript();
    showXk6FakerPattern();
    await advancedXk6FakerPatterns();
    migrationGuide();
    await realWorldComparison();
  }
  
  runExamples().catch(console.error);
}