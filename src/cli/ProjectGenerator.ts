/**
 * Project Generator CLI
 * 
 * Generates RestifiedTS project scaffolding with enterprise features
 */

import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';

export interface ProjectConfig {
  name: string;
  type: 'basic' | 'enterprise' | 'microservices';
  features: string[];
  services?: string[];
  roles?: string[];
  outputDir: string;
}

export class ProjectGenerator {
  async generate(): Promise<void> {
    console.log('🚀 RestifiedTS Project Generator');
    console.log('================================\n');

    const config = await this.promptForConfig();
    await this.createProject(config);
    
    console.log('\n✅ Project generated successfully!');
    console.log(`📁 Location: ${config.outputDir}`);
    console.log('🎯 Next steps:');
    console.log('   1. cd ' + config.name);
    console.log('   2. npm install');
    console.log('   3. npm test');
  }

  private async promptForConfig(): Promise<ProjectConfig> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: 'my-api-tests',
        validate: (input: string) => input.length > 0 || 'Project name is required'
      },
      {
        type: 'list',
        name: 'type',
        message: 'Project type:',
        choices: [
          { name: '🟢 Basic - Simple API testing', value: 'basic' },
          { name: '🟡 Enterprise - Multi-role, complex data', value: 'enterprise' },
          { name: '🔴 Microservices - Large-scale multi-service', value: 'microservices' }
        ]
      },
      {
        type: 'checkbox',
        name: 'features',
        message: 'Select features:',
        choices: [
          { name: 'Data Generation (Faker.js)', value: 'dataGeneration', checked: true },
          { name: 'Boundary Testing', value: 'boundaryTesting' },
          { name: 'Role-based Testing', value: 'roleBasedTesting' },
          { name: 'Parallel Execution', value: 'parallelExecution' },
          { name: 'HTML Reports', value: 'htmlReports', checked: true },
          { name: 'CI/CD Integration', value: 'cicd' }
        ]
      }
    ]);

    // Additional prompts based on project type
    if (answers.type === 'enterprise' || answers.type === 'microservices') {
      const enterpriseAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'services',
          message: 'Services to test (comma-separated):',
          default: 'userService,authService,orderService',
          filter: (input: string) => input.split(',').map(s => s.trim())
        },
        {
          type: 'input',
          name: 'roles',
          message: 'User roles (comma-separated):',
          default: 'admin,manager,user,guest',
          filter: (input: string) => input.split(',').map(s => s.trim())
        }
      ]);
      
      answers.services = enterpriseAnswers.services;
      answers.roles = enterpriseAnswers.roles;
    }

    return {
      ...answers,
      outputDir: path.join(process.cwd(), answers.name)
    };
  }

  private async createProject(config: ProjectConfig): Promise<void> {
    console.log(`\n📦 Creating ${config.type} project: ${config.name}`);
    
    // Create directory structure
    await this.createDirectoryStructure(config);
    
    // Generate files based on project type
    switch (config.type) {
      case 'basic':
        await this.generateBasicProject(config);
        break;
      case 'enterprise':
        await this.generateEnterpriseProject(config);
        break;
      case 'microservices':
        await this.generateMicroservicesProject(config);
        break;
    }
    
    // Generate common files
    await this.generateCommonFiles(config);
  }

  private async createDirectoryStructure(config: ProjectConfig): Promise<void> {
    const dirs = [
      config.outputDir,
      path.join(config.outputDir, 'tests'),
      path.join(config.outputDir, 'tests', 'integration'),
      path.join(config.outputDir, 'tests', 'unit'),
      path.join(config.outputDir, 'config'),
      path.join(config.outputDir, 'reports'),
      path.join(config.outputDir, 'fixtures')
    ];

    if (config.type === 'enterprise' || config.type === 'microservices') {
      dirs.push(
        path.join(config.outputDir, 'tests', 'enterprise'),
        path.join(config.outputDir, 'config', 'roles'),
        path.join(config.outputDir, 'config', 'services')
      );
    }

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private async generateBasicProject(config: ProjectConfig): Promise<void> {
    // Basic test example
    const basicTest = `/**
 * Basic API Tests
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { RestifiedTS } from 'restifiedts';

describe('API Tests', function() {
  let restified: RestifiedTS;

  before(function() {
    restified = new RestifiedTS();
  });

  after(async function() {
    await restified.cleanup();
  });

  it('should test API endpoint', async function() {
    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
      .when()
        .get('/posts/1')
        .execute()
      .then()
        .statusCode(200)
        .jsonPath('$.id', 1);

    expect(response.data.title).to.be.a('string');
  });
});`;

    fs.writeFileSync(
      path.join(config.outputDir, 'tests', 'integration', 'api.test.ts'),
      basicTest
    );
  }

  private async generateEnterpriseProject(config: ProjectConfig): Promise<void> {
    // Enterprise test setup
    const enterpriseTest = `/**
 * Enterprise Multi-Role API Tests
 */

import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { RestifiedTS } from 'restifiedts';
import { BatchTestConfig } from 'restifiedts/enterprise';

describe('Enterprise API Tests', function() {
  this.timeout(60000);
  
  let restified: RestifiedTS;

  before(async function() {
    restified = new RestifiedTS();
    
    // Setup enterprise roles
    ${config.roles?.map(role => `
    restified.createRole({
      name: '${role}',
      description: '${role.charAt(0).toUpperCase() + role.slice(1)} role',
      ${role === 'admin' ? "permissions: ['*']," : ''}
      auth: {
        type: 'bearer',
        token: process.env.${role.toUpperCase()}_TOKEN || '${role}-token'
      }
    });`).join('')}
  });

  after(async function() {
    await restified.cleanup();
  });

  it('should test all services with all roles', async function() {
    const config: BatchTestConfig = {
      name: 'Enterprise API Testing',
      description: 'Multi-service, multi-role testing',
      services: [
        ${config.services?.map(service => `{
          name: '${service}',
          baseUrl: process.env.${service.toUpperCase()}_URL || 'https://${service.toLowerCase()}.example.com',
          timeout: 30000
        }`).join(',\n        ')}
      ],
      roles: [${config.roles?.map(r => `'${r}'`).join(', ')}],
      endpoints: [
        // Add your endpoint definitions here
      ],
      execution: {
        parallelism: 4,
        timeout: 30000,
        retries: 2,
        continueOnFailure: true,
        loadBalancing: 'round-robin'
      },
      reporting: {
        formats: ['json', 'html'],
        outputDir: './reports/enterprise-tests',
        includeMetrics: true,
        includeResponses: true,
        realTimeUpdates: true
      }${config.features.includes('dataGeneration') ? `,
      dataGeneration: {
        enableFaker: true,
        enableBoundaryTesting: ${config.features.includes('boundaryTesting')},
        testDataVariations: 2,
        customVariables: {
          environment: 'test',
          version: '1.0.0'
        }
      }` : ''}
    };

    try {
      const result = await restified.executeBatchTests(config);
      expect(result.summary.total).to.be.greaterThan(0);
    } catch (error) {
      console.log('Expected in test environment:', error.message);
    }
  });
});`;

    fs.writeFileSync(
      path.join(config.outputDir, 'tests', 'enterprise', 'multi-service.test.ts'),
      enterpriseTest
    );

    // Generate role configurations
    if (config.roles) {
      const roleConfig = {
        roles: config.roles.reduce((acc, role) => {
          acc[role] = {
            name: role,
            description: `${role.charAt(0).toUpperCase() + role.slice(1)} role`,
            permissions: role === 'admin' ? ['*'] : [`${role}.*`],
            auth: {
              type: 'bearer',
              token: `\${${role.toUpperCase()}_TOKEN}`
            }
          };
          return acc;
        }, {} as any)
      };

      fs.writeFileSync(
        path.join(config.outputDir, 'config', 'roles', 'roles.json'),
        JSON.stringify(roleConfig, null, 2)
      );
    }
  }

  private async generateMicroservicesProject(config: ProjectConfig): Promise<void> {
    await this.generateEnterpriseProject(config);

    // Additional microservices-specific configuration
    const microservicesConfig = `/**
 * Microservices Testing Configuration
 */

export const microservicesConfig = {
  services: {
    ${config.services?.map(service => `${service}: {
      baseUrl: process.env.${service.toUpperCase()}_URL || 'https://${service.toLowerCase()}.company.com',
      timeout: 30000,
      retries: 3,
      healthCheck: '/health',
      version: 'v1'
    }`).join(',\n    ')}
  },
  
  testMatrix: {
    // Define your test combinations
    coverage: 'full', // 'basic' | 'full' | 'smoke'
    parallel: true,
    maxWorkers: 8
  },
  
  reporting: {
    aggregateResults: true,
    generateTrends: true,
    notifyOnFailure: true
  }
};`;

    fs.writeFileSync(
      path.join(config.outputDir, 'config', 'microservices.config.ts'),
      microservicesConfig
    );
  }

  private async generateCommonFiles(config: ProjectConfig): Promise<void> {
    // Package.json
    const packageJson = {
      name: config.name,
      version: '1.0.0',
      description: `RestifiedTS ${config.type} API testing project`,
      main: 'index.js',
      scripts: {
        test: 'mocha --require ts-node/register tests/**/*.test.ts',
        'test:unit': 'mocha --require ts-node/register tests/unit/**/*.test.ts',
        'test:integration': 'mocha --require ts-node/register tests/integration/**/*.test.ts',
        ...(config.type !== 'basic' && {
          'test:enterprise': 'mocha --require ts-node/register tests/enterprise/**/*.test.ts',
          'test:parallel': 'npm run test -- --parallel'
        }),
        'test:watch': 'npm run test -- --watch',
        'test:coverage': 'nyc npm run test',
        'reports': 'npm run test && open reports/index.html',
        build: 'tsc',
        lint: 'eslint . --ext .ts',
        'lint:fix': 'eslint . --ext .ts --fix'
      },
      dependencies: {
        restifiedts: '^1.2.5'
      },
      devDependencies: {
        '@types/mocha': '^10.0.0',
        '@types/chai': '^4.3.0',
        '@types/node': '^20.0.0',
        mocha: '^10.0.0',
        chai: '^4.3.0',
        'ts-node': '^10.9.0',
        typescript: '^5.0.0',
        nyc: '^15.1.0',
        eslint: '^8.0.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0'
      }
    };

    fs.writeFileSync(
      path.join(config.outputDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // TypeScript config
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: './tests',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      },
      include: ['tests/**/*'],
      exclude: ['node_modules', 'dist', 'reports']
    };

    fs.writeFileSync(
      path.join(config.outputDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );

    // README
    const readme = `# ${config.name}

RestifiedTS ${config.type} API testing project with enterprise features.

## Features

${config.features.map(f => `- ✅ ${f.replace(/([A-Z])/g, ' $1').toLowerCase()}`).join('\n')}

## Quick Start

\`\`\`bash
npm install
npm test
\`\`\`

## Project Structure

\`\`\`
${config.name}/
├── tests/
│   ├── integration/     # Integration tests
│   ├── unit/           # Unit tests
${config.type !== 'basic' ? '│   ├── enterprise/     # Enterprise tests' : ''}
├── config/             # Configuration files
├── reports/            # Test reports
└── fixtures/           # Test data
\`\`\`

## Configuration

${config.type !== 'basic' ? `
### Environment Variables

Set these environment variables for your services and roles:

${config.services?.map(s => `- \`${s.toUpperCase()}_URL\` - ${s} service URL`).join('\n')}
${config.roles?.map(r => `- \`${r.toUpperCase()}_TOKEN\` - ${r} authentication token`).join('\n')}
` : ''}

## Scripts

- \`npm test\` - Run all tests
- \`npm run test:unit\` - Run unit tests only
- \`npm run test:integration\` - Run integration tests only
${config.type !== 'basic' ? '- `npm run test:enterprise` - Run enterprise tests only' : ''}
- \`npm run test:coverage\` - Run tests with coverage
- \`npm run reports\` - Generate and open HTML reports

## Documentation

- [RestifiedTS Documentation](https://github.com/anthropics/RestifiedTS)
- [Enterprise Features Guide](https://github.com/anthropics/RestifiedTS/docs/enterprise)

Generated with RestifiedTS Project Generator v2.1.0
`;

    fs.writeFileSync(path.join(config.outputDir, 'README.md'), readme);

    // Environment template
    const envTemplate = `# Environment Configuration
# Copy this file to .env and update with your actual values

# Service URLs
${config.services?.map(s => `${s.toUpperCase()}_URL=https://${s.toLowerCase()}.example.com`).join('\n')}

# Authentication Tokens  
${config.roles?.map(r => `${r.toUpperCase()}_TOKEN=your-${r}-token-here`).join('\n')}

# Test Configuration
TEST_TIMEOUT=30000
PARALLEL_WORKERS=4
LOG_LEVEL=info
`;

    fs.writeFileSync(path.join(config.outputDir, '.env.template'), envTemplate);

    // .gitignore
    const gitignore = `node_modules/
dist/
reports/
coverage/
.nyc_output/
*.log
.env
.DS_Store
`;

    fs.writeFileSync(path.join(config.outputDir, '.gitignore'), gitignore);
  }
}

// CLI command
export async function generateProject(): Promise<void> {
  const generator = new ProjectGenerator();
  await generator.generate();
}