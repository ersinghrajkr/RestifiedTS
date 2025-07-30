/**
 * RestifiedTS Configuration Generator
 * Generates Playwright-style configuration files
 */

import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';

export interface ConfigGenerationOptions {
  /** Output directory */
  outputDir?: string;
  /** Configuration type */
  type?: 'basic' | 'enterprise' | 'microservices';
  /** Include example projects */
  includeProjects?: boolean;
  /** Include enterprise features */
  includeEnterprise?: boolean;
  /** Include performance testing */
  includePerformance?: boolean;
  /** Include security testing */
  includeSecurity?: boolean;
}

export class RestifiedConfigGenerator {
  
  async generateConfig(options: ConfigGenerationOptions = {}): Promise<string> {
    console.log('🔧 RestifiedTS Configuration Generator');
    console.log('====================================\n');
    
    const config = await this.promptForConfig(options);
    const configContent = this.generateConfigContent(config);
    const outputPath = path.join(options.outputDir || process.cwd(), 'restified.config.ts');
    
    fs.writeFileSync(outputPath, configContent);
    
    console.log(`✅ Configuration generated: ${outputPath}`);
    return outputPath;
  }
  
  private async promptForConfig(options: ConfigGenerationOptions): Promise<any> {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Configuration type:',
        choices: [
          { name: '🟢 Basic - Simple API testing setup', value: 'basic' },
          { name: '🟡 Enterprise - Multi-service with advanced features', value: 'enterprise' },
          { name: '🔴 Microservices - Large-scale multi-project setup', value: 'microservices' }
        ],
        default: options.type
      },
      {
        type: 'input',
        name: 'testDir',
        message: 'Test directory:',
        default: './tests'
      },
      {
        type: 'confirm',
        name: 'fullyParallel',
        message: 'Enable fully parallel execution?',
        default: true
      },
      {
        type: 'input',
        name: 'workers',
        message: 'Number of workers (number or percentage):',
        default: 'auto',
        filter: (input: string) => {
          if (input === 'auto') return process.env.CI ? '4' : '50%';
          return input;
        }
      },
      {
        type: 'input',
        name: 'timeout',
        message: 'Global timeout (ms):',
        default: 30000,
        filter: (input: string) => parseInt(input)
      },
      {
        type: 'input',
        name: 'retries',
        message: 'Number of retries on failure:',
        default: 0,
        filter: (input: string) => parseInt(input)
      },
      {
        type: 'checkbox',
        name: 'reporters',
        message: 'Select reporters:',
        choices: [
          { name: 'HTML Report', value: 'html', checked: true },
          { name: 'JSON Report', value: 'json' },
          { name: 'JUnit XML', value: 'junit' },
          { name: 'Console List', value: 'list', checked: true },
          { name: 'GitHub Actions', value: 'github' }
        ]
      }
    ]);
    
    // Additional prompts based on type
    if (answers.type !== 'basic') {
      const advancedAnswers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'includeProjects',
          message: 'Include multiple service projects?',
          default: true
        },
        {
          type: 'input',
          name: 'services',
          message: 'Service names (comma-separated):',
          default: 'user-service,auth-service,order-service',
          when: (answers: any) => answers.includeProjects,
          filter: (input: string) => input.split(',').map(s => s.trim())
        },
        {
          type: 'checkbox',
          name: 'enterpriseFeatures',
          message: 'Select enterprise features:',
          choices: [
            { name: 'Role-based Testing', value: 'roles' },
            { name: 'Data Generation (Faker.js)', value: 'dataGeneration', checked: true },
            { name: 'Boundary Testing', value: 'boundaryTesting' },
            { name: 'Performance Tracking', value: 'performanceTracking' },
            { name: 'Security Testing', value: 'securityTesting' },
            { name: 'Circuit Breaker', value: 'circuitBreaker' }
          ]
        },
        {
          type: 'confirm',
          name: 'includeDatabase',
          message: 'Include database testing configuration?',
          default: false
        },
        {
          type: 'confirm',
          name: 'includeGraphQL',
          message: 'Include GraphQL testing configuration?',
          default: false
        },
        {
          type: 'confirm',
          name: 'includeWebSocket',
          message: 'Include WebSocket testing configuration?',
          default: false
        }
      ]);
      
      Object.assign(answers, advancedAnswers);
    }
    
    return answers;
  }
  
  private generateConfigContent(config: any): string {
    const imports = ['import { defineConfig } from \'restifiedts\';'];
    
    let configContent = `/**
 * RestifiedTS Configuration
 * Generated configuration for ${config.type} API testing
 */

${imports.join('\n')}

export default defineConfig({
  // Test Discovery
  testDir: '${config.testDir}',
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  testIgnore: ['**/node_modules/**', '**/dist/**'],
  
  // Execution Settings
  fullyParallel: ${config.fullyParallel},
  workers: ${typeof config.workers === 'string' && config.workers.includes('%') ? `'${config.workers}'` : config.workers},
  timeout: ${config.timeout},
  retries: process.env.CI ? ${Math.max(config.retries, 1)} : ${config.retries},
  forbidOnly: !!process.env.CI,
  
  // Global Setup/Teardown
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  
  // Reporting
  reporter: [
    ${this.generateReporterConfig(config.reporters)}
  ],`;

    // Add base URL if basic configuration
    if (config.type === 'basic') {
      configContent += `
  
  // Base Configuration
  baseURL: process.env.API_BASE_URL || 'https://api.example.com',
  
  // Default Authentication
  auth: {
    type: 'bearer',
    token: process.env.API_TOKEN
  },`;
    }

    // Add projects for enterprise/microservices
    if (config.includeProjects && config.services) {
      configContent += `
  
  // Multiple Service Projects
  projects: [
    ${config.services.map((service: string) => this.generateProjectConfig(service)).join(',\n    ')}
  ],`;
    }

    // Add enterprise features
    if (config.enterpriseFeatures && config.enterpriseFeatures.length > 0) {
      configContent += `
  
  // Enterprise Features
  enterprise: {
    ${this.generateEnterpriseConfig(config.enterpriseFeatures)}
  },`;
    }

    // Add advanced configurations
    if (config.includeDatabase || config.includeGraphQL || config.includeWebSocket) {
      configContent += this.generateAdvancedConfigs(config);
    }

    // Add use configuration
    configContent += `
  
  // Advanced Options
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    variables: {
      environment: process.env.NODE_ENV || 'test'
    }
  },
  
  // Expect Configuration
  expect: {
    timeout: 5000,
    interval: 100
  }`;

    configContent += '\n});';

    return configContent;
  }
  
  private generateReporterConfig(reporters: string[]): string {
    return reporters.map(reporter => {
      switch (reporter) {
        case 'html':
          return `['html', { outputFolder: 'reports/html', open: !process.env.CI }]`;
        case 'json':
          return `['json', { outputFile: 'reports/results.json' }]`;
        case 'junit':
          return `['junit', { outputFile: 'reports/junit.xml' }]`;
        case 'github':
          return `process.env.CI ? ['github'] : null`;
        case 'list':
        default:
          return `['list']`;
      }
    }).filter(Boolean).join(',\n    ');
  }
  
  private generateProjectConfig(serviceName: string): string {
    const cleanName = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `{
      name: '${cleanName}',
      baseURL: process.env.${serviceName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_URL || 'https://${cleanName}.example.com',
      testMatch: '**/${cleanName}/**/*.test.ts',
      auth: {
        type: 'bearer',
        token: process.env.${serviceName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_TOKEN
      },
      timeout: 30000,
      retries: 1
    }`;
  }
  
  private generateEnterpriseConfig(features: string[]): string {
    const configs: string[] = [];
    
    if (features.includes('roles')) {
      configs.push(`roles: ['admin', 'manager', 'user', 'guest']`);
    }
    if (features.includes('dataGeneration')) {
      configs.push(`dataGeneration: true`);
    }
    if (features.includes('boundaryTesting')) {
      configs.push(`boundaryTesting: true`);
    }
    if (features.includes('performanceTracking')) {
      configs.push(`performanceTracking: true`);
    }
    if (features.includes('securityTesting')) {
      configs.push(`securityTesting: true`);
    }
    if (features.includes('circuitBreaker')) {
      configs.push(`circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 60000
    }`);
    }
    
    return configs.join(',\n    ');
  }
  
  private generateAdvancedConfigs(config: any): string {
    let advanced = '';
    
    if (config.includeDatabase) {
      advanced += `
  
  // Database Configuration
  database: {
    connections: {
      primary: {
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME || 'test_db',
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
    }
  },`;
    }
    
    if (config.includeGraphQL) {
      advanced += `
  
  // GraphQL Configuration
  graphql: {
    endpoint: process.env.GRAPHQL_ENDPOINT || '/graphql',
    timeout: 30000,
    introspection: process.env.NODE_ENV !== 'production'
  },`;
    }
    
    if (config.includeWebSocket) {
      advanced += `
  
  // WebSocket Configuration
  webSocket: {
    timeout: 10000,
    pingInterval: 30000
  },`;
    }
    
    return advanced;
  }
}

// CLI function
export async function generateRestifiedConfig(options: ConfigGenerationOptions = {}): Promise<string> {
  const generator = new RestifiedConfigGenerator();
  return await generator.generateConfig(options);
}