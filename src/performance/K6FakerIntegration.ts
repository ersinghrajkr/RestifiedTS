/**
 * K6 Faker Integration for RestifiedTS
 * 
 * Provides comprehensive fake data generation capabilities for K6 performance tests
 * Similar to xk6-faker but with TypeScript support and RestifiedTS integration
 * 
 * @see https://github.com/grafana/xk6-faker
 */

import { faker, Faker } from '@faker-js/faker';

export interface K6FakerConfig {
  locale?: string;
  seed?: number;
  // Custom data sets
  customProviders?: Record<string, () => any>;
}

/**
 * K6 Faker Integration Class
 * Generates realistic test data for performance testing scenarios
 */
export class K6FakerIntegration {
  private fakerInstance: Faker;
  private config: K6FakerConfig;

  constructor(config: K6FakerConfig = {}) {
    this.config = config;
    this.fakerInstance = faker;
    
    // Set seed for reproducible data
    if (config.seed !== undefined) {
      this.fakerInstance.seed(config.seed);
    }
    
    // Note: Locale setting in generated K6 scripts, not here
  }

  /**
   * Generate K6 TypeScript code with faker data generation
   */
  generateK6FakerScript(scenarios: K6FakerScenario[]): string {
    const imports = [
      "import http from 'k6/http';",
      "import { check, sleep } from 'k6';",
      "import { Rate, Trend, Counter } from 'k6/metrics';",
      "",
      "// RestifiedTS Faker Integration - xk6-faker compatible",
      "// Makes faker globally available like xk6-faker extension",
      "import { faker } from '@faker-js/faker';",
      "globalThis.faker = faker;"
    ];

    const fakerSetup = this.generateFakerSetup();
    const dataGenerators = this.generateXk6StyleDataGenerators(scenarios);
    const testScenarios = scenarios.map(scenario => this.generateXk6StyleScenarioCode(scenario)).join('\n\n');

    return [
      ...imports,
      '',
      fakerSetup,
      '',
      dataGenerators,
      '',
      testScenarios
    ].join('\n');
  }

  /**
   * Generate faker setup code
   */
  private generateFakerSetup(): string {
    let setup = `// Faker configuration`;
    
    if (this.config.locale) {
      setup += `\n// Note: Set locale in K6 script initialization if needed`;
    }
    
    if (this.config.seed !== undefined) {
      setup += `\nfaker.seed(${this.config.seed});`;
    }

    return setup;
  }

  /**
   * Generate xk6-faker style data generators (using global faker object)
   */
  private generateXk6StyleDataGenerators(scenarios: K6FakerScenario[]): string {
    const generators = new Set<string>();
    
    scenarios.forEach(scenario => {
      scenario.dataFields?.forEach(field => {
        generators.add(this.generateXk6StyleFieldGenerator(field));
      });
    });

    return Array.from(generators).join('\n');
  }

  /**
   * Generate data generator functions (legacy method)
   */
  private generateDataGenerators(scenarios: K6FakerScenario[]): string {
    const generators = new Set<string>();
    
    scenarios.forEach(scenario => {
      scenario.dataFields?.forEach(field => {
        generators.add(this.generateFieldGenerator(field));
      });
    });

    return Array.from(generators).join('\n');
  }

  /**
   * Generate xk6-faker style field generator (using global faker)
   */
  private generateXk6StyleFieldGenerator(field: K6DataField): string {
    switch (field.type) {
      case 'person':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    avatar: faker.image.avatar()
  };
}`;

      case 'address':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zipCode: faker.location.zipCode(),
    country: faker.location.country()
  };
}`;

      case 'company':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    name: faker.company.name(),
    catchPhrase: faker.company.catchPhrase(),
    bs: faker.company.buzzPhrase(),
    ein: faker.string.numeric(9)
  };
}`;

      case 'product':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price()),
    category: faker.commerce.department(),
    sku: faker.string.alphanumeric(8).toUpperCase(),
    inStock: faker.datatype.boolean()
  };
}`;

      case 'financial':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    creditCardNumber: faker.finance.creditCardNumber(),
    creditCardCVV: faker.finance.creditCardCVV(),
    iban: faker.finance.iban(),
    bic: faker.finance.bic(),
    amount: parseFloat(faker.finance.amount())
  };
}`;

      case 'internet':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    email: faker.internet.email(),
    url: faker.internet.url(),
    domainName: faker.internet.domainName(),
    userName: faker.internet.userName(),
    password: faker.internet.password(),
    ipAddress: faker.internet.ip()
  };
}`;

      case 'custom':
        if (field.generator) {
          return `
function generate${this.capitalize(field.name)}() {
  ${field.generator}
}`;
        }
        break;

      default:
        return `
function generate${this.capitalize(field.name)}() {
  return faker.lorem.word();
}`;
    }
    
    return '';
  }

  /**
   * Generate field-specific data generator (legacy)
   */
  private generateFieldGenerator(field: K6DataField): string {
    switch (field.type) {
      case 'person':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    avatar: faker.image.avatar()
  };
}`;

      case 'address':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    street: faker.address.streetAddress(),
    city: faker.address.city(),
    state: faker.address.state(),
    zipCode: faker.address.zipCode(),
    country: faker.address.country()
  };
}`;

      case 'company':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    name: faker.company.name(),
    catchPhrase: faker.company.catchPhrase(),
    bs: faker.company.bs(),
    ein: faker.datatype.number({ min: 100000000, max: 999999999 }).toString()
  };
}`;

      case 'product':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    id: faker.datatype.uuid(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price()),
    category: faker.commerce.department(),
    sku: faker.random.alphaNumeric(8).toUpperCase(),
    inStock: faker.datatype.boolean()
  };
}`;

      case 'financial':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    creditCardNumber: faker.finance.creditCardNumber(),
    creditCardCVV: faker.finance.creditCardCVV(),
    iban: faker.finance.iban(),
    bic: faker.finance.bic(),
    amount: parseFloat(faker.finance.amount())
  };
}`;

      case 'internet':
        return `
function generate${this.capitalize(field.name)}() {
  return {
    email: faker.internet.email(),
    url: faker.internet.url(),
    domainName: faker.internet.domainName(),
    userName: faker.internet.userName(),
    password: faker.internet.password(),
    ipAddress: faker.internet.ip()
  };
}`;

      case 'custom':
        if (field.generator) {
          return `
function generate${this.capitalize(field.name)}() {
  ${field.generator}
}`;
        }
        break;

      default:
        return `
function generate${this.capitalize(field.name)}() {
  return faker.random.word();
}`;
    }
    
    return '';
  }

  /**
   * Generate xk6-faker style scenario code
   */
  private generateXk6StyleScenarioCode(scenario: K6FakerScenario): string {
    const dataGeneration = scenario.dataFields?.map(field => 
      `  const ${field.name} = generate${this.capitalize(field.name)}();`
    ).join('\n') || '';

    const requestBody = this.generateXk6StyleRequestBody(scenario);

    return `
// ${scenario.name} scenario with xk6-faker style data generation
export function ${this.camelCase(scenario.name)}Scenario() {
${dataGeneration}
  
  const payload = ${requestBody};
  
  const response = http.${scenario.method.toLowerCase()}('${scenario.endpoint}', JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  
  check(response, {
    '${scenario.name} status is ${scenario.expectedStatus || 200}': (r) => r.status === ${scenario.expectedStatus || 200},
    '${scenario.name} response time < 2s': (r) => r.timings.duration < 2000,
    ${scenario.validations?.map(v => `'${v.description}': (r) => ${v.check}`).join(',\n    ') || ''}
  });
  
  sleep(Math.random() * 2 + 1);
}`;
  }

  /**
   * Generate xk6-faker style request body
   */
  private generateXk6StyleRequestBody(scenario: K6FakerScenario): string {
    if (!scenario.dataFields || scenario.dataFields.length === 0) {
      return '{}';
    }

    const fields = scenario.dataFields.map(field => {
      if (field.mapping) {
        return field.mapping.map(m => `    ${m.target}: ${field.name}.${m.source}`).join(',\n');
      } else {
        return `    ...${field.name}`;
      }
    }).join(',\n');

    return `{\n${fields}\n  }`;
  }

  /**
   * Generate scenario code with faker integration (legacy)
   */
  private generateScenarioCode(scenario: K6FakerScenario): string {
    const dataGeneration = scenario.dataFields?.map(field => 
      `  const ${field.name} = generate${this.capitalize(field.name)}();`
    ).join('\n') || '';

    const requestBody = this.generateRequestBody(scenario);

    return `
// ${scenario.name} scenario with faker data
export function ${this.camelCase(scenario.name)}Scenario() {
${dataGeneration}
  
  const payload = ${requestBody};
  
  const response = http.${scenario.method.toLowerCase()}('${scenario.endpoint}', JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  
  check(response, {
    '${scenario.name} status is ${scenario.expectedStatus || 200}': (r) => r.status === ${scenario.expectedStatus || 200},
    '${scenario.name} response time < 2s': (r) => r.timings.duration < 2000,
    ${scenario.validations?.map(v => `'${v.description}': (r) => ${v.check}`).join(',\n    ') || ''}
  });
  
  sleep(Math.random() * 2 + 1);
}`;
  }

  /**
   * Generate request body with faker data
   */
  private generateRequestBody(scenario: K6FakerScenario): string {
    if (!scenario.dataFields || scenario.dataFields.length === 0) {
      return '{}';
    }

    const fields = scenario.dataFields.map(field => {
      if (field.mapping) {
        return field.mapping.map(m => `    ${m.target}: ${field.name}.${m.source}`).join(',\n');
      } else {
        return `    ...${field.name}`;
      }
    }).join(',\n');

    return `{\n${fields}\n  }`;
  }

  /**
   * Generate comprehensive faker-based load test
   */
  generateComprehensiveFakerTest(config: {
    baseUrl: string;
    scenarios: K6FakerScenario[];
    users?: number;
    duration?: string;
  }): string {
    const scenarioFunctions = config.scenarios.map(s => this.generateXk6StyleScenarioCode(s)).join('\n');
    const scenarioSelectors = config.scenarios.map((s, i) => 
      `    case ${i}: ${this.camelCase(s.name)}Scenario(); break;`
    ).join('\n');

    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { Options } from 'k6/options';

// RestifiedTS xk6-faker Integration
// Makes faker globally available exactly like xk6-faker extension
import { faker } from '@faker-js/faker';
globalThis.faker = faker;

// Custom metrics
const errorRate = new Rate('faker_errors');
const responseTime = new Trend('faker_response_time');
const dataGenTime = new Trend('data_generation_time');
const requestCount = new Counter('faker_requests');

// K6 Options
export const options: Options = {
  stages: [
    { duration: '30s', target: ${config.users || 10} },
    { duration: '${config.duration || '2m'}', target: ${config.users || 10} },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    faker_errors: ['rate<0.005'],
    data_generation_time: ['p(95)<100']
  }
};

${this.generateFakerSetup()}

${this.generateDataGenerators(config.scenarios)}

${scenarioFunctions}

// Main test function
export default function() {
  const startTime = Date.now();
  requestCount.add(1);
  
  // Randomly select a scenario to execute
  const scenarioIndex = Math.floor(Math.random() * ${config.scenarios.length});
  
  const dataGenStart = Date.now();
  
  switch(scenarioIndex) {
${scenarioSelectors}
    default: 
      console.log('No scenario selected');
  }
  
  const dataGenEnd = Date.now();
  dataGenTime.add(dataGenEnd - dataGenStart);
  
  const endTime = Date.now();
  responseTime.add(endTime - startTime);
}

// Setup function for shared data
export function setup() {
  console.log('🎭 Starting Faker-powered K6 performance test');
  console.log(\`📊 Scenarios: \${${config.scenarios.length}}\`);
  console.log(\`👥 Target Users: \${${config.users || 10}}\`);
  console.log(\`⏱️  Duration: \${${JSON.stringify(config.duration || '2m')}}\`);
  
  return {
    baseUrl: '${config.baseUrl}',
    startTime: new Date().toISOString()
  };
}

// Teardown function
export function teardown(data: any) {
  console.log('✅ Faker K6 test completed');
  console.log(\`Started at: \${data.startTime}\`);
  console.log(\`Completed at: \${new Date().toISOString()}\`);
}
`;
  }

  /**
   * Generate realistic user journey with faker data
   */
  generateUserJourney(journey: K6UserJourney): string {
    const steps = journey.steps.map((step, index) => {
      const dataGen = step.dataFields?.map(field => 
        `    const ${field.name} = generate${this.capitalize(field.name)}();`
      ).join('\n') || '';

      return `
  // Step ${index + 1}: ${step.name}
${dataGen}
  
  const step${index}Response = http.${step.method.toLowerCase()}(\`\${baseUrl}${step.endpoint}\`, ${step.body ? 'JSON.stringify(payload)' : 'null'}, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(step${index}Response, {
    '${step.name} successful': (r) => r.status === ${step.expectedStatus || 200}
  });
  
  sleep(${step.thinkTime || 1});`;
    }).join('\n');

    return `
export function ${this.camelCase(journey.name)}Journey(baseUrl: string) {
  console.log('🚀 Starting user journey: ${journey.name}');
  
${steps}
  
  console.log('✅ Completed user journey: ${journey.name}');
}`;
  }

  /**
   * Get available faker providers
   */
  getAvailableProviders(): Record<string, string[]> {
    return {
      person: ['firstName', 'lastName', 'fullName', 'email', 'phone', 'avatar'],
      address: ['street', 'city', 'state', 'zipCode', 'country', 'coordinates'],
      company: ['name', 'catchPhrase', 'bs', 'ein', 'industry'],
      product: ['name', 'description', 'price', 'category', 'sku', 'barcode'],
      financial: ['creditCard', 'iban', 'bic', 'amount', 'currency'],
      internet: ['email', 'url', 'domain', 'username', 'password', 'ip'],
      date: ['past', 'future', 'between', 'recent', 'soon'],
      lorem: ['word', 'words', 'sentence', 'paragraph', 'text'],
      random: ['uuid', 'number', 'boolean', 'arrayElement', 'objectElement']
    };
  }

  /**
   * Utility methods
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private camelCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
  }
}

// Type definitions
export interface K6FakerScenario {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  expectedStatus?: number;
  dataFields?: K6DataField[];
  validations?: K6Validation[];
}

export interface K6DataField {
  name: string;
  type: 'person' | 'address' | 'company' | 'product' | 'financial' | 'internet' | 'custom';
  generator?: string; // Custom generator code
  mapping?: K6FieldMapping[]; // How to map generated data to request
}

export interface K6FieldMapping {
  source: string; // Field in generated data
  target: string; // Field in request payload
}

export interface K6Validation {
  description: string;
  check: string; // K6 check expression
}

export interface K6UserJourney {
  name: string;
  description?: string;
  steps: K6JourneyStep[];
}

export interface K6JourneyStep {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  expectedStatus?: number;
  dataFields?: K6DataField[];
  body?: any;
  thinkTime?: number; // seconds
}

// Pre-built scenario templates
export const K6FakerTemplates = {
  ecommerce: {
    userRegistration: {
      name: 'User Registration',
      endpoint: '/api/users/register',
      method: 'POST' as const,
      dataFields: [
        { name: 'user', type: 'person' as const },
        { name: 'address', type: 'address' as const }
      ]
    },
    productPurchase: {
      name: 'Product Purchase',
      endpoint: '/api/orders',
      method: 'POST' as const,
      dataFields: [
        { name: 'product', type: 'product' as const },
        { name: 'payment', type: 'financial' as const }
      ]
    }
  },
  
  social: {
    userProfile: {
      name: 'Create User Profile',
      endpoint: '/api/profiles',
      method: 'POST' as const,
      dataFields: [
        { name: 'user', type: 'person' as const },
        { name: 'company', type: 'company' as const }
      ]
    }
  },
  
  financial: {
    transaction: {
      name: 'Financial Transaction',
      endpoint: '/api/transactions',
      method: 'POST' as const,
      dataFields: [
        { name: 'transaction', type: 'financial' as const },
        { name: 'user', type: 'person' as const }
      ]
    }
  }
};