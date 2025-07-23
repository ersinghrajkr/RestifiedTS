import * as fs from 'fs';
import * as path from 'path';
import { TestGenerator } from './TestGenerator';

export interface ScaffoldOptions {
  serviceName: string;
  outputDir: string;
  baseURL?: string;
  includeGraphQL?: boolean;
  includeWebSocket?: boolean;
}

export class ProjectScaffolder {
  private testGenerator: TestGenerator;

  constructor() {
    this.testGenerator = new TestGenerator();
  }

  /**
   * Initialize RestifiedTS project structure
   */
  async initializeProject(projectRoot: string, force: boolean = false): Promise<void> {
    console.log('📁 Creating project structure...');

    // Create directory structure
    const directories = [
      'tests',
      'tests/unit',
      'tests/integration',
      'tests/setup',
      'tests/fixtures',
      'config'
    ];

    for (const dir of directories) {
      const dirPath = path.join(projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    }

    // Create package.json if it doesn't exist
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath) || force) {
      await this.createPackageJson(packageJsonPath);
    }

    // Create configuration files
    await this.createDefaultConfig(path.join(projectRoot, 'config'));

    // Create sample test files
    await this.createSampleTests(path.join(projectRoot, 'tests'));

    // Create setup files
    await this.createSetupFiles(path.join(projectRoot, 'tests/setup'));

    // Create .gitignore
    await this.createGitIgnore(projectRoot, force);

    // Create TypeScript config
    await this.createTSConfig(projectRoot, force);

    // Create README
    await this.createProjectReadme(projectRoot, force);
  }

  /**
   * Scaffold complete service test suite
   */
  async scaffoldService(options: ScaffoldOptions): Promise<string[]> {
    const generatedFiles: string[] = [];
    const serviceName = options.serviceName;
    const outputDir = options.outputDir;

    console.log(`🏗️  Scaffolding ${serviceName} service tests...`);

    // Generate API tests
    const apiTestPath = await this.testGenerator.generateTest({
      type: 'api',
      name: `${serviceName}API`,
      outputDir: path.join(outputDir, 'integration'),
      baseURL: options.baseURL,
      includeSuite: true
    });
    generatedFiles.push(apiTestPath);

    // Generate setup/teardown for service
    const setupTestPath = await this.testGenerator.generateTest({
      type: 'setup',
      name: `${serviceName}Setup`,
      outputDir: path.join(outputDir, 'setup'),
      includeSuite: true
    });
    generatedFiles.push(setupTestPath);

    // Generate GraphQL tests if requested
    if (options.includeGraphQL) {
      const graphqlTestPath = await this.testGenerator.generateTest({
        type: 'graphql',
        name: `${serviceName}GraphQL`,
        outputDir: path.join(outputDir, 'integration'),
        baseURL: options.baseURL,
        includeSuite: true
      });
      generatedFiles.push(graphqlTestPath);
    }

    // Generate WebSocket tests if requested
    if (options.includeWebSocket) {
      const wsTestPath = await this.testGenerator.generateTest({
        type: 'websocket',
        name: `${serviceName}WebSocket`,
        outputDir: path.join(outputDir, 'integration'),
        baseURL: options.baseURL,
        includeSuite: true
      });
      generatedFiles.push(wsTestPath);
    }

    // Create service-specific configuration
    const configPath = await this.createServiceConfig(serviceName, options);
    if (configPath) {
      generatedFiles.push(configPath);
    }

    return generatedFiles;
  }

  private async createPackageJson(packageJsonPath: string): Promise<void> {
    const packageJson = {
      "name": "restifiedts-project",
      "version": "1.0.0",
      "description": "RestifiedTS API Testing Project",
      "main": "index.js",
      "scripts": {
        "test": "mocha --require ts-node/register tests/**/*.test.ts",
        "test:unit": "mocha --require ts-node/register tests/unit/**/*.test.ts",
        "test:integration": "mocha --require ts-node/register tests/integration/**/*.test.ts",
        "test:smoke": "mocha --require ts-node/register tests/**/*.test.ts --grep \"@smoke\"",
        "test:regression": "mocha --require ts-node/register tests/**/*.test.ts --grep \"@regression\"",
        "test:coverage": "nyc npm test",
        "lint": "eslint src tests --ext .ts",
        "build": "tsc",
        "clean": "rimraf dist"
      },
      "dependencies": {
        "restifiedts": "^1.0.0"
      },
      "devDependencies": {
        "@types/chai": "^4.3.0",
        "@types/mocha": "^10.0.0",
        "@types/node": "^18.0.0",
        "chai": "^4.3.0",
        "mocha": "^10.0.0",
        "nyc": "^15.1.0",
        "ts-node": "^10.9.0",
        "typescript": "^4.9.0",
        "eslint": "^8.0.0",
        "@typescript-eslint/eslint-plugin": "^5.0.0",
        "@typescript-eslint/parser": "^5.0.0",
        "rimraf": "^3.0.2"
      },
      "keywords": ["api-testing", "rest", "testing", "automation"],
      "author": "",
      "license": "MIT"
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Created package.json');
  }

  private async createDefaultConfig(configDir: string): Promise<void> {
    const defaultConfig = {
      "timeout": 30000,
      "retries": 3,
      "baseURL": "https://api.example.com",
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      "auth": {
        "type": "bearer",
        "token": "${API_TOKEN}"
      },
      "logging": {
        "level": "info",
        "requests": true,
        "responses": true
      },
      "reporting": {
        "formats": ["html", "json"],
        "directory": "reports"
      }
    };

    const configPath = path.join(configDir, 'default.json');
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log('✅ Created default configuration');
  }

  private async createSampleTests(testsDir: string): Promise<void> {
    // Create a simple sample API test
    const sampleApiTest = `import { expect } from 'chai';
import { restified } from 'restifiedts';

describe('Sample API Tests @integration @smoke', () => {
  
  it('should get user information', async function() {
    this.timeout(10000);

    const result = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
      .when()
        .get('/users/1')
      .then()
        .statusCode(200)
        .jsonPath('$.name', 'Leanne Graham')
        .jsonPath('$.email', 'Sincere@april.biz')
      .execute();

    expect(result.data).to.have.property('id', 1);
    expect(result.data).to.have.property('name');
    expect(result.data).to.have.property('email');
  });

  it('should create new user', async function() {
    this.timeout(10000);

    const newUser = {
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com'
    };

    const result = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
        .body(newUser)
      .when()
        .post('/users')
      .then()
        .statusCode(201)
        .jsonPath('$.name', 'John Doe')
      .execute();

    expect(result.data).to.have.property('id');
    expect(result.data.name).to.equal('John Doe');
  });
});
`;

    const sampleTestPath = path.join(testsDir, 'integration', 'sample-api.test.ts');
    fs.writeFileSync(sampleTestPath, sampleApiTest);
    console.log('✅ Created sample API test');
  }

  private async createSetupFiles(setupDir: string): Promise<void> {
    const setupFile = `import { expect } from 'chai';
import { restified } from 'restifiedts';

describe('Global Test Setup @setup', () => {
  
  before(async function() {
    this.timeout(30000);
    console.log('🚀 Starting Global Test Setup...');
    
    // Environment verification
    if (!process.env.API_BASE_URL) {
      console.warn('⚠️  API_BASE_URL not set, using default');
    }
    
    // Global configuration
    restified.configure({
      timeout: 10000,
      retries: 2
    });
    
    console.log('✅ Global setup completed successfully');
  });

  after(async function() {
    this.timeout(10000);
    console.log('🧹 Starting Global Test Cleanup...');
    
    // Cleanup any global resources
    restified.reset();
    
    console.log('✅ Global cleanup completed successfully');
  });

  it('should verify test environment is ready', async function() {
    // Basic connectivity test
    try {
      await restified
        .given()
          .baseURL('https://httpbin.org')
        .when()
          .get('/status/200')
        .then()
          .statusCode(200)
        .execute();
        
      console.log('✅ Test environment connectivity verified');
    } catch (error) {
      console.warn('⚠️  Test environment connectivity issue:', error);
      this.skip();
    }
  });
});
`;

    const setupPath = path.join(setupDir, 'global-setup.test.ts');
    fs.writeFileSync(setupPath, setupFile);
    console.log('✅ Created global setup file');
  }

  private async createGitIgnore(projectRoot: string, force: boolean): Promise<void> {
    const gitIgnorePath = path.join(projectRoot, '.gitignore');
    
    if (fs.existsSync(gitIgnorePath) && !force) {
      return;
    }

    const gitIgnoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Test outputs
coverage/
reports/
*.log

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# RestifiedTS specific
snapshots/
test-data/
`;

    fs.writeFileSync(gitIgnorePath, gitIgnoreContent);
    console.log('✅ Created .gitignore');
  }

  private async createTSConfig(projectRoot: string, force: boolean): Promise<void> {
    const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
    
    if (fs.existsSync(tsConfigPath) && !force) {
      return;
    }

    const tsConfig = {
      "compilerOptions": {
        "target": "es2020",
        "module": "commonjs",
        "lib": ["es2020"],
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "resolveJsonModule": true,
        "baseUrl": ".",
        "paths": {
          "@/*": ["src/*"],
          "@tests/*": ["tests/*"]
        }
      },
      "include": [
        "src/**/*",
        "tests/**/*"
      ],
      "exclude": [
        "node_modules",
        "dist"
      ]
    };

    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log('✅ Created tsconfig.json');
  }

  private async createProjectReadme(projectRoot: string, force: boolean): Promise<void> {
    const readmePath = path.join(projectRoot, 'README.md');
    
    if (fs.existsSync(readmePath) && !force) {
      return;
    }

    const readmeContent = `# RestifiedTS Project

This project was initialized with RestifiedTS CLI for API testing.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Update configuration in \`config/default.json\` with your API settings.

3. Run the sample tests:
   \`\`\`bash
   npm test
   \`\`\`

## Project Structure

- \`tests/integration/\` - Integration tests for APIs
- \`tests/unit/\` - Unit tests
- \`tests/setup/\` - Global setup and teardown
- \`tests/fixtures/\` - Test data and utilities
- \`config/\` - Environment-specific configurations

## Commands

- \`npm test\` - Run all tests
- \`npm run test:unit\` - Run unit tests only
- \`npm run test:integration\` - Run integration tests only
- \`npm run test:smoke\` - Run smoke tests (@smoke tagged)
- \`npm run test:regression\` - Run regression tests (@regression tagged)
- \`npm run test:coverage\` - Run tests with coverage report

## Generating New Tests

Use RestifiedTS CLI to generate new test files:

\`\`\`bash
# Generate API test
npx restifiedts generate --type api --name UserAPI

# Generate GraphQL test
npx restifiedts generate --type graphql --name UserGraphQL

# Scaffold complete service
npx restifiedts scaffold --service UserService --include-graphql
\`\`\`

## Documentation

- [RestifiedTS Documentation](https://github.com/restifiedts)
- [API Testing Best Practices](https://github.com/restifiedts/docs)

## License

MIT
`;

    fs.writeFileSync(readmePath, readmeContent);
    console.log('✅ Created README.md');
  }

  private async createServiceConfig(serviceName: string, options: ScaffoldOptions): Promise<string | null> {
    if (!options.baseURL) {
      return null;
    }

    const configDir = path.join(process.cwd(), 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const serviceConfig = {
      "service": serviceName.toLowerCase(),
      "baseURL": options.baseURL,
      "timeout": 30000,
      "retries": 3,
      "headers": {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      "features": {
        "graphql": options.includeGraphQL || false,
        "websocket": options.includeWebSocket || false
      }
    };

    const configPath = path.join(configDir, `${serviceName.toLowerCase()}.json`);
    fs.writeFileSync(configPath, JSON.stringify(serviceConfig, null, 2));
    console.log(`✅ Created ${serviceName} service configuration`);
    
    return configPath;
  }
}