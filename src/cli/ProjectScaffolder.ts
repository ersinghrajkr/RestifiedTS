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
    console.log('📁 Creating comprehensive project structure...');

    // Create directory structure
    const directories = [
      'tests',
      'tests/unit',
      'tests/integration',
      'tests/setup',
      'tests/fixtures',
      'config',
      'reports'
    ];

    for (const dir of directories) {
      const dirPath = path.join(projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    }

    // Get project name from directory
    const projectName = path.basename(projectRoot);

    // Create essential project files
    const filesToCreate = [
      { name: 'package.json', content: this.generatePackageJson(projectName) },
      { name: 'tsconfig.json', content: this.generateTsConfig() },
      { name: '.mocharc.json', content: this.generateMochaConfig() },
      { name: '.eslintrc.json', content: this.generateEslintConfig() },
      { name: '.prettierrc.json', content: this.generatePrettierConfig() },
      { name: '.env.example', content: this.generateEnvTemplate() },
      { name: '.gitignore', content: this.generateGitignore() },
      { name: 'README.md', content: this.generateReadme(projectName) }
    ];

    for (const file of filesToCreate) {
      const filePath = path.join(projectRoot, file.name);
      if (!fs.existsSync(filePath) || force) {
        fs.writeFileSync(filePath, file.content);
        console.log(`✅ Created file: ${file.name}`);
      }
    }

    // Copy config files from template
    await this.createConfigFiles(projectRoot, force);

    // Create sample test files
    await this.createSampleTests(projectRoot, force);

    console.log('\n🎉 Project initialized successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy .env.example to .env and update with your API settings');
    console.log('2. Run "npm install" to install dependencies');
    console.log('3. Run "npm test" to execute sample tests');
    console.log('4. Generate new tests: "npx restifiedts generate --type api --name MyAPI"');
  }

  /**
   * Create configuration files
   */
  private async createConfigFiles(projectRoot: string, force: boolean): Promise<void> {
    const configDir = path.join(projectRoot, 'config');
    
    // Copy our comprehensive config files
    const configFiles = [
      { name: 'default.json', sourceFile: '../../../config/default.json' },
      { name: 'development.json', sourceFile: '../../../config/development.json' },
      { name: 'production.json', sourceFile: '../../../config/production.json' }
    ];

    for (const config of configFiles) {
      const targetPath = path.join(configDir, config.name);
      const sourcePath = path.join(__dirname, config.sourceFile);
      
      if (!fs.existsSync(targetPath) || force) {
        try {
          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`✅ Created config: ${config.name}`);
          } else {
            // Fallback: create basic config
            fs.writeFileSync(targetPath, this.getBasicConfig(config.name));
            console.log(`✅ Created basic config: ${config.name}`);
          }
        } catch (error) {
          // If copy fails, create basic config
          fs.writeFileSync(targetPath, this.getBasicConfig(config.name));
          console.log(`✅ Created basic config: ${config.name}`);
        }
      }
    }
  }

  /**
   * Create sample test files
   */
  private async createSampleTests(projectRoot: string, force: boolean): Promise<void> {
    const testsDir = path.join(projectRoot, 'tests');
    
    // Create comprehensive fixtures
    await this.createFixtures(testsDir, force);
    
    // Create both setup examples
    const manualSetupFile = path.join(testsDir, 'setup', 'manual-setup.ts');
    if (!fs.existsSync(manualSetupFile) || force) {
      fs.writeFileSync(manualSetupFile, this.generateManualSetupFile());
      console.log('✅ Created manual setup example (class methods)');
    }

    const globalSetupFile = path.join(testsDir, 'setup', 'global-setup.ts');
    if (!fs.existsSync(globalSetupFile) || force) {
      fs.writeFileSync(globalSetupFile, this.generateGlobalSetupFile());
      console.log('✅ Created global setup example (automatic hooks)');
    }

    // Create comprehensive integration tests
    const apiTestFile = path.join(testsDir, 'integration', 'sample-api.test.ts');
    if (!fs.existsSync(apiTestFile) || force) {
      fs.writeFileSync(apiTestFile, this.generateSampleApiTest());
      console.log('✅ Created sample API test (manual setup)');
    }

    const globalApiTestFile = path.join(testsDir, 'integration', 'sample-api-global.test.ts');
    if (!fs.existsSync(globalApiTestFile) || force) {
      fs.writeFileSync(globalApiTestFile, this.generateGlobalApiTest());
      console.log('✅ Created sample API test (global setup)');
    }

    const fixturesTestFile = path.join(testsDir, 'integration', 'fixtures-example.test.ts');
    if (!fs.existsSync(fixturesTestFile) || force) {
      fs.writeFileSync(fixturesTestFile, this.generateFixturesExampleTest());
      console.log('✅ Created fixtures example test');
    }

    const authTestFile = path.join(testsDir, 'integration', 'real-world-auth.test.ts');
    if (!fs.existsSync(authTestFile) || force) {
      fs.writeFileSync(authTestFile, this.generateRealWorldAuthTest());
      console.log('✅ Created real-world authentication test');
    }

    // Create comprehensive unit tests
    const unitTestFile = path.join(testsDir, 'unit', 'sample-unit.test.ts');
    if (!fs.existsSync(unitTestFile) || force) {
      fs.writeFileSync(unitTestFile, this.generateSampleUnitTest());
      console.log('✅ Created sample unit test');
    }

    const fakerTestFile = path.join(testsDir, 'unit', 'faker-integration.test.ts');
    if (!fs.existsSync(fakerTestFile) || force) {
      fs.writeFileSync(fakerTestFile, this.generateFakerIntegrationTest());
      console.log('✅ Created Faker.js integration test');
    }

    const schemaTestFile = path.join(testsDir, 'unit', 'schema-validation.test.ts');
    if (!fs.existsSync(schemaTestFile) || force) {
      fs.writeFileSync(schemaTestFile, this.generateSchemaValidationTest());
      console.log('✅ Created schema validation test');
    }
  }

  /**
   * Get basic config for fallback
   */
  private getBasicConfig(configType: string): string {
    const basicConfigs: { [key: string]: any } = {
      'default.json': {
        "api": {
          "baseURL": "https://jsonplaceholder.typicode.com",
          "timeout": 30000
        },
        "reporting": {
          "enabled": true,
          "directory": "reports",
          "formats": ["html", "json"]
        }
      },
      'development.json': {
        "api": {
          "baseURL": "https://jsonplaceholder.typicode.com"
        },
        "logging": {
          "level": "debug",
          "console": true
        }
      },
      'production.json': {
        "logging": {
          "level": "warn",
          "console": false
        }
      }
    };

    return JSON.stringify(basicConfigs[configType] || {}, null, 2);
  }

  /**
   * Generate comprehensive project package.json with all dependencies
   */
  private generatePackageJson(projectName: string): string {
    return JSON.stringify({
      "name": projectName.toLowerCase().replace(/\s+/g, '-'),
      "version": "1.0.0",
      "description": `API testing project using RestifiedTS`,
      "main": "index.js",
      "scripts": {
        "test": "npm run test:clean && npx mocha --require ts-node/register --require tsconfig-paths/register 'tests/**/*.test.ts' --reporter mochawesome --reporter-options reportDir=reports,reportFilename=test-report,json=true,html=true,inline=true,charts=true,code=true",
        "test:unit": "npm run test:clean && npx mocha --require ts-node/register --require tsconfig-paths/register 'tests/unit/**/*.test.ts' --reporter mochawesome --reporter-options reportDir=reports,reportFilename=unit-report,json=true,html=true",
        "test:integration": "npm run test:clean && npx mocha --require ts-node/register --require tsconfig-paths/register 'tests/integration/**/*.test.ts' --reporter mochawesome --reporter-options reportDir=reports,reportFilename=integration-report,json=true,html=true",
        "test:smoke": "npm run test:clean && npx mocha --require ts-node/register --require tsconfig-paths/register --grep '@smoke' 'tests/**/*.test.ts' --reporter mochawesome --reporter-options reportDir=reports,reportFilename=smoke-report,json=true,html=true",
        "test:clean": "rimraf reports && mkdirp reports",
        "build": "tsc --noEmit",
        "setup": "npm install && npm run test:clean"
      },
      "keywords": ["api", "testing", "restifiedts", "automation"],
      "author": "Generated by RestifiedTS",
      "license": "MIT",
      "dependencies": {
        "restifiedts": "^1.1.0",
        "dotenv": "^16.3.1"
      },
      "devDependencies": {
        "@types/node": "^20.10.5",
        "typescript": "^5.3.3",
        "rimraf": "^5.0.5",
        "mkdirp": "^3.0.1"
      },
      "engines": {
        "node": ">=18.0.0"
      }
    }, null, 2);
  }

  /**
   * Generate Mocha configuration file
   */
  private generateMochaConfig(): string {
    return JSON.stringify({
      "require": [
        "ts-node/register",
        "tsconfig-paths/register"
        // Uncomment next line to use global setup (no manual setup/cleanup needed in tests):
        // "tests/setup/global-setup.ts"
      ],
      "extensions": ["ts"],
      "spec": "tests/**/*.test.ts",
      "timeout": 30000,
      "recursive": true,
      "exit": true,
      "bail": false,
      "reporter": "spec",
      "slow": 2000,
      "ui": "bdd",
      "color": true,
      "diff": true,
      "full-trace": true,
      "grep": "",
      "invert": false,
      "check-leaks": false,
      "globals": [
        "restified"
      ]
    }, null, 2);
  }

  /**
   * Generate TypeScript configuration
   */
  private generateTsConfig(): string {
    return JSON.stringify({
      "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": ["ES2020"],
        "outDir": "./dist",
        "rootDir": "./",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "baseUrl": "./",
        "paths": {
          "@tests/*": ["tests/*"],
          "@config/*": ["config/*"]
        }
      },
      "include": [
        "tests/**/*",
        "config/**/*"
      ],
      "exclude": [
        "node_modules",
        "dist",
        "reports"
      ]
    }, null, 2);
  }

  /**
   * Generate ESLint configuration
   */
  private generateEslintConfig(): string {
    return JSON.stringify({
      "parser": "@typescript-eslint/parser",
      "plugins": ["@typescript-eslint"],
      "extends": [
        "eslint:recommended",
        "@typescript-eslint/recommended"
      ],
      "parserOptions": {
        "ecmaVersion": 2020,
        "sourceType": "module"
      },
      "rules": {
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-vars": "error",
        "prefer-const": "error",
        "no-var": "error"
      },
      "env": {
        "node": true,
        "mocha": true,
        "es6": true
      }
    }, null, 2);
  }

  /**
   * Generate Prettier configuration
   */
  private generatePrettierConfig(): string {
    return JSON.stringify({
      "semi": true,
      "trailingComma": "es5",
      "singleQuote": true,
      "printWidth": 100,
      "tabWidth": 2,
      "useTabs": false
    }, null, 2);
  }

  /**
   * Generate environment file template
   */
  private generateEnvTemplate(): string {
    return `# ===========================================
# RestifiedTS Environment Configuration
# ===========================================
# Copy this file to .env and update with your values

# ===========================================
# CORE API CONFIGURATION
# ===========================================
# Primary API settings for your application under test
API_BASE_URL=https://jsonplaceholder.typicode.com
API_KEY=your-api-key-here
API_TIMEOUT=30000
API_RETRIES=3

# Environment Identifier
NODE_ENV=development

# ===========================================
# AUTHENTICATION CONFIGURATION
# ===========================================
# Various authentication methods supported by RestifiedTS

# Bearer Token Authentication
AUTH_TOKEN=your-auth-token-here
REFRESH_TOKEN=your-refresh-token-here

# Basic Authentication
BASIC_USERNAME=your-username
BASIC_PASSWORD=your-password

# OAuth2 Configuration
OAUTH2_CLIENT_ID=your-oauth2-client-id
OAUTH2_CLIENT_SECRET=your-oauth2-client-secret
OAUTH2_TOKEN_URL=https://auth.example.com/oauth/token
OAUTH2_SCOPE=read write

# API Key Authentication
X_API_KEY=your-x-api-key-here
API_SECRET=your-api-secret-here

# ===========================================
# DATABASE CONFIGURATION
# ===========================================
# Database integration testing settings

# PostgreSQL
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_db
DB_USER=test_user
DB_PASS=test_pass
DB_SSL=false

# MySQL Alternative
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=test_db
MYSQL_USER=root
MYSQL_PASS=password

# MongoDB Alternative
MONGO_URL=mongodb://localhost:27017/test_db
MONGO_DB=test_db

# SQLite Alternative
SQLITE_DB=./test.db

# ===========================================
# REPORTING & LOGGING CONFIGURATION
# ===========================================
# Control test reporting and logging behavior

REPORTS_DIR=reports
SNAPSHOTS_DIR=snapshots
LOGS_DIR=logs
LOG_LEVEL=info

# Report Generation Settings
REPORT_TITLE=RestifiedTS Test Report
REPORT_AUTO_OPEN=false
REPORT_INCLUDE_SCREENSHOTS=true
REPORT_INCLUDE_METRICS=true

# ===========================================
# PERFORMANCE TESTING CONFIGURATION
# ===========================================
# Artillery integration for load testing

ARTILLERY_ENABLED=false
ARTILLERY_HOST=localhost
ARTILLERY_PORT=8080
ARTILLERY_TIMEOUT=120000

# Performance Thresholds
PERFORMANCE_RESPONSE_TIME_MEDIAN=500
PERFORMANCE_RESPONSE_TIME_P95=1000
PERFORMANCE_RESPONSE_TIME_P99=2000
PERFORMANCE_ERROR_RATE_MAX=1
PERFORMANCE_THROUGHPUT_MIN=100

# ===========================================
# SECURITY TESTING CONFIGURATION
# ===========================================
# OWASP ZAP integration for security scanning

ZAP_ENABLED=false
ZAP_API_URL=http://localhost:8080
ZAP_PROXY_HOST=localhost
ZAP_PROXY_PORT=8081
ZAP_TIMEOUT=300000

# Security Policies
SECURITY_ALLOW_HIGH_RISK=false
SECURITY_MAX_MEDIUM_RISK=3
SECURITY_MAX_LOW_RISK=10

# ===========================================
# MULTI-SERVICE CONFIGURATION
# ===========================================
# Multiple service endpoints for integration testing

# Authentication Service
AUTH_SERVICE_URL=https://auth.example.com
AUTH_SERVICE_TIMEOUT=10000

# Payment Service
PAYMENT_SERVICE_URL=https://payments.example.com
PAYMENT_SERVICE_TIMEOUT=15000
PAYMENT_API_KEY=your-payment-api-key

# User Service
USER_SERVICE_URL=https://users.example.com
USER_SERVICE_TIMEOUT=10000

# Notification Service
NOTIFICATION_SERVICE_URL=https://notifications.example.com
NOTIFICATION_SERVICE_TIMEOUT=5000

# Order Service
ORDER_SERVICE_URL=https://orders.example.com
ORDER_SERVICE_TIMEOUT=20000

# ===========================================
# WEBSOCKET CONFIGURATION
# ===========================================
# WebSocket testing settings

WS_URL=wss://echo.websocket.org
WS_TIMEOUT=10000
WS_RECONNECT_ATTEMPTS=3
WS_PING_INTERVAL=30000

# ===========================================
# GRAPHQL CONFIGURATION
# ===========================================
# GraphQL testing settings

GRAPHQL_URL=https://api.example.com/graphql
GRAPHQL_TIMEOUT=15000
GRAPHQL_INTROSPECTION=true
GRAPHQL_PLAYGROUND=false

# ===========================================
# PROXY CONFIGURATION
# ===========================================
# HTTP/HTTPS proxy settings (optional)

HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=https://proxy.example.com:8080
NO_PROXY=localhost,127.0.0.1,*.local

# ===========================================
# SSL/TLS CONFIGURATION
# ===========================================
# SSL certificate settings

SSL_VERIFY=true
SSL_CERT_PATH=/path/to/client-cert.pem
SSL_KEY_PATH=/path/to/client-key.pem
SSL_CA_PATH=/path/to/ca-cert.pem

# ===========================================
# SCHEMA VALIDATION CONFIGURATION
# ===========================================
# Schema validation settings

SCHEMA_VALIDATION_ENABLED=true
SCHEMA_VALIDATORS=joi,zod,ajv
SCHEMA_STRICT_MODE=false

# ===========================================
# MOCK DATA CONFIGURATION
# ===========================================
# Test data generation settings

FAKER_LOCALE=en
MOCK_SERVER_PORT=3001
MOCK_DATA_SEED=12345

# ===========================================
# PARALLEL EXECUTION CONFIGURATION
# ===========================================
# Parallel test execution settings

MAX_PARALLEL_TESTS=5
TEST_TIMEOUT_GLOBAL=300000
TEST_RETRY_ATTEMPTS=2

# ===========================================
# DEVELOPMENT & DEBUG CONFIGURATION
# ===========================================
# Development and debugging settings

DEBUG_MODE=false
VERBOSE_LOGGING=false
CAPTURE_NETWORK_TRAFFIC=false
SAVE_FAILED_RESPONSES=true

# ===========================================
# CI/CD CONFIGURATION
# ===========================================
# Continuous Integration settings

CI=false
CI_BUILD_NUMBER=
CI_COMMIT_SHA=
CI_BRANCH=
CI_PULL_REQUEST=

# ===========================================
# CUSTOM APPLICATION SETTINGS
# ===========================================
# Add your application-specific environment variables below

# Custom API endpoints
CUSTOM_API_ENDPOINT_1=
CUSTOM_API_ENDPOINT_2=

# Custom authentication
CUSTOM_AUTH_HEADER=
CUSTOM_AUTH_VALUE=

# Custom timeouts
CUSTOM_TIMEOUT_1=
CUSTOM_TIMEOUT_2=
`;
  }

  /**
   * Generate .gitignore file
   */
  private generateGitignore(): string {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.*
!.env.example

# Compiled output
dist/
*.tsbuildinfo

# Reports and logs
reports/
*.log
output/

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Testing
coverage/
.nyc_output/
*.lcov

# Temporary files
tmp/
temp/
`;
  }

  /**
   * Generate comprehensive README
   */
  private generateReadme(projectName: string): string {
    return `# ${projectName}

API testing project built with RestifiedTS framework.

## 🚀 Quick Start

### Installation

This project comes with RestifiedTS and all necessary dependencies pre-configured. Just install:

\`\`\`bash
npm install
\`\`\`

### Run Tests

\`\`\`bash
# Run all tests and generate HTML report
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:smoke

# Run comprehensive test suite with merged report
npm run test:comprehensive

# Watch mode for development
npm run test:watch
\`\`\`

### Generate Reports

\`\`\`bash
# Basic HTML report (auto-generated after tests)
npm run test:report

# Comprehensive report with all test suites
npm run test:report:comprehensive

# Using RestifiedTS CLI directly
npx restifiedts report --comprehensive --open
\`\`\`

## 📁 Project Structure

\`\`\`
${projectName.toLowerCase().replace(/\s+/g, '-')}/
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── setup/          # Test setup and utilities
├── config/             # Configuration files
├── reports/            # Generated test reports
├── .env.example        # Environment variables template
├── tsconfig.json       # TypeScript configuration
├── package.json        # Dependencies and scripts
└── README.md          # This file
\`\`\`

## ⚙️ Configuration

### Environment Variables

Copy \`.env.example\` to \`.env\` and update with your API settings:

\`\`\`bash
cp .env.example .env
\`\`\`

### Configuration Files

- \`config/default.json\` - Base configuration
- \`config/development.json\` - Development overrides
- \`config/production.json\` - Production settings

## 🧪 Writing Tests

RestifiedTS provides two setup approaches for your tests:

### Option 1: Manual Setup (Explicit Control)

Use this approach when you want explicit control over setup/cleanup in each test file:

\`\`\`typescript
import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from './setup/manual-setup';

describe('API Tests', function() {
  before(async function() {
    await TestSetup.configure();
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  it('should test API endpoint', async function() {
    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .bearerToken('{{authToken}}') // Uses globally configured token
      .when()
        .get('/posts')
        .execute();

    await response
      .statusCode(200)
      .jsonPath('$[0].id').isNumber()
      .execute();
  });
});
\`\`\`

### Option 2: Global Setup (Automatic)

Use this approach for cleaner test files without repetitive setup/cleanup:

1. **Enable Global Setup**: Uncomment the global setup in \`.mocharc.json\`:
   \`\`\`json
   {
     "require": [
       "ts-node/register",
       "tsconfig-paths/register",
       "tests/setup/global-setup.ts"
     ]
   }
   \`\`\`

2. **Write Clean Tests**:
   \`\`\`typescript
   import { restified } from 'restifiedts';
   import { expect } from 'chai';
   import { getBaseURL, getAuthToken } from './setup/global-setup';

   describe('API Tests', function() {
     // No manual setup/cleanup needed!

     it('should test API endpoint', async function() {
       const response = await restified
         .given()
           .baseURL(getBaseURL()) // Uses global configuration
           .bearerToken(getAuthToken()) // Uses global auth
         .when()
           .get('/posts')
           .execute();

       await response
         .statusCode(200)
         .jsonPath('$[0].id').isNumber()
         .execute();
     });
   });
   \`\`\`

### Comparison

| Feature | Manual Setup | Global Setup |
|---------|-------------|--------------|
| Setup Control | Explicit per test file | Automatic across all tests |
| Code Repetition | More repetitive | Less repetitive |
| Test File Size | Larger | Smaller |
| Configuration | Per-test flexibility | Centralized configuration |
| Best For | Complex setup variations | Standard setup patterns |

### Generate New Tests

\`\`\`bash
# Generate different types of tests
npx restifiedts generate --type api --name UserAPI
npx restifiedts generate --type database --name UserDatabase
npx restifiedts generate --type performance --name LoadTest
npx restifiedts generate --type security --name SecurityScan
npx restifiedts generate --type unified --name ComprehensiveTest
\`\`\`

## 📊 Available Reports

After running tests, you'll find HTML reports in the \`reports/\` directory:

- \`test-report.html\` - Standard test results
- \`comprehensive-report.html\` - All test suites combined
- \`performance-report.html\` - Performance metrics (if available)
- \`security-report.html\` - Security findings (if available)

## 🔧 Development

### Code Quality

\`\`\`bash
# Linting
npm run lint

# Code formatting
npm run format
\`\`\`

### Clean Reports

\`\`\`bash
npm run test:clean
\`\`\`

## 🆘 Troubleshooting

### Common Issues

**Tests hang after completion?**
➜ Ensure you have \`await restified.cleanup()\` in \`afterAll()\`

**Environment variables not loading?**
➜ Copy \`.env.example\` to \`.env\` and update values

**TypeScript errors?**
➜ Check \`tsconfig.json\` configuration

**Reports not generating?**
➜ Ensure \`reports/\` directory exists and has write permissions

### Debug Mode

Set \`LOG_LEVEL=debug\` in your \`.env\` file for detailed logging.

## 📚 Documentation

- [RestifiedTS Documentation](https://github.com/ersinghrajkr/RestifiedTS)
- [Complete Guide](https://github.com/ersinghrajkr/RestifiedTS/blob/main/RESTIFIEDTS-GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

Generated by RestifiedTS CLI v1.1.0
`;
  }

  /**
   * Generate setup file
   */
  private generateSetupFile(): string {
    return `import { restified } from 'restifiedts';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export class TestSetup {
  static async configure() {
    // Configure RestifiedTS with environment variables
    restified.configure({
      baseURL: process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com',
      timeout: parseInt(process.env.API_TIMEOUT || '30000'),
      headers: {
        'User-Agent': 'RestifiedTS-TestSuite/1.0'
      }
    });

    // Set global variables if needed
    if (process.env.AUTH_TOKEN) {
      restified.setGlobalVariable('authToken', process.env.AUTH_TOKEN);
    }
  }

  static async cleanup() {
    await restified.cleanup();
  }
}
`;
  }

  /**
   * Generate sample API test
   */
  private generateSampleApiTest(): string {
    return `import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from '../setup/manual-setup';

/**
 * Sample API Tests - Manual Setup Approach
 * 
 * This example demonstrates the manual setup approach where you explicitly
 * call TestSetup.configure() and TestSetup.cleanup() in each test file.
 * 
 * Alternative: Use '../setup/global-setup' for automatic setup without 
 * manual before/after hooks in each test file.
 */
describe('Sample API Tests @smoke', function() {
  before(async function() {
    await TestSetup.configure();
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  it('should get all posts', async function() {
    this.timeout(10000);

    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
      .when()
        .get('/posts')
        .execute();

    await response
      .statusCode(200)
      .jsonPathExists('$[0].id')
      .jsonPathExists('$[0].title')
      .execute();

    expect(response.getData()).to.be.an('array');
    expect(response.getData().length).to.be.greaterThan(0);
  });

  it('should get a specific post', async function() {
    this.timeout(10000);

    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
      .when()
        .get('/posts/1')
        .execute();

    await response
      .statusCode(200)
      .jsonPath('$.id', 1)
      .jsonPathExists('$.title')
      .jsonPathExists('$.body')
      .execute();

    expect(response.getData().id).to.equal(1);
  });

  it('should create a new post', async function() {
    this.timeout(10000);

    const newPost = {
      title: 'Test Post',
      body: 'This is a test post created by RestifiedTS',
      userId: 1
    };

    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .header('Content-Type', 'application/json')
        .body(newPost)
      .when()
        .post('/posts')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.title', newPost.title)
      .jsonPath('$.body', newPost.body)
      .jsonPath('$.userId', newPost.userId)
      .execute();

    expect(response.getData().id).to.be.a('number');
  });
});
`;
  }

  /**
   * Generate sample API test using global setup approach
   */
  private generateGlobalApiTest(): string {
    return `import { restified } from 'restifiedts';
import { expect } from 'chai';
import { getBaseURL, getAuthToken, isAuthConfigured } from '../setup/global-setup';

/**
 * Sample API Tests - Global Setup Approach
 * 
 * This example demonstrates the global setup approach where setup/cleanup
 * happens automatically without manual before/after hooks in each test file.
 * 
 * Requirements:
 * 1. Include global-setup.ts in your Mocha configuration:
 *    - Add to .mocharc.json: "require": ["tests/setup/global-setup.ts"]
 *    - Or use --require flag: mocha --require tests/setup/global-setup.ts
 * 
 * Benefits:
 * - No repetitive setup/cleanup code in test files
 * - Cleaner test code focused on test logic
 * - Centralized configuration management
 * - Automatic authentication and resource cleanup
 */
describe('Sample API Tests - Global Setup @smoke', function() {
  // No manual before/after hooks needed!
  // Global setup handles everything automatically

  it('should get all posts using global configuration', async function() {
    this.timeout(10000);

    const response = await restified
      .given()
        .baseURL(getBaseURL()) // Uses globally configured URL
        .header('Content-Type', 'application/json')
        // Auth token is already configured globally if available
      .when()
        .get('/posts')
        .execute();

    await response
      .statusCode(200)
      .jsonPathExists('$[0].id')
      .jsonPathExists('$[0].title')
      .execute();

    expect(response.getData()).to.be.an('array');
    expect(response.getData().length).to.be.greaterThan(0);
  });

  it('should get a specific post with automatic auth', async function() {
    this.timeout(10000);
    
    // Skip this test if no auth is configured
    if (!isAuthConfigured()) {
      this.skip();
      return;
    }

    const response = await restified
      .given()
        .baseURL(getBaseURL())
        .header('Content-Type', 'application/json')
        .bearerToken(getAuthToken()) // Uses globally configured token
      .when()
        .get('/posts/1')
        .execute();

    await response
      .statusCode(200)
      .jsonPath('$.id', 1)
      .jsonPathExists('$.title')
      .jsonPathExists('$.body')
      .execute();

    expect(response.getData().id).to.equal(1);
  });

  it('should create a new post with global settings', async function() {
    this.timeout(10000);

    const newPost = {
      title: 'Test Post - Global Setup',
      body: 'This post was created using global setup configuration',
      userId: 1
    };

    const response = await restified
      .given()
        .baseURL(getBaseURL()) // Automatically uses configured base URL
        .header('Content-Type', 'application/json')
        .body(newPost)
      .when()
        .post('/posts')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.title', newPost.title)
      .jsonPath('$.body', newPost.body)
      .jsonPath('$.userId', newPost.userId)
      .execute();

    expect(response.getData().id).to.be.a('number');
    
    // Log success with configuration info
    console.log(\`✅ Created post using base URL: \${getBaseURL()}\`);
    console.log(\`🔐 Authentication configured: \${isAuthConfigured() ? 'Yes' : 'No'}\`);
  });
});
`;
  }

  /**
   * Generate sample unit test
   */
  private generateSampleUnitTest(): string {
    return `import { expect } from 'chai';

describe('Sample Unit Tests @unit', function() {
  
  describe('Basic functionality', function() {
    it('should perform basic arithmetic', function() {
      const result = 2 + 2;
      expect(result).to.equal(4);
    });

    it('should handle string operations', function() {
      const text = 'Hello, RestifiedTS!';
      expect(text).to.be.a('string');
      expect(text).to.include('RestifiedTS');
      expect(text.length).to.be.greaterThan(0);
    });

    it('should work with arrays', function() {
      const items = ['api', 'testing', 'typescript'];
      expect(items).to.be.an('array');
      expect(items).to.have.length(3);
      expect(items).to.include('testing');
    });
  });

  describe('Environment validation', function() {
    it('should have Node.js version >= 18', function() {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      expect(majorVersion).to.be.at.least(18);
    });

    it('should have required environment setup', function() {
      expect(process.env.NODE_ENV).to.exist;
      // Add more environment checks as needed
    });
  });
});
`;
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

    return generatedFiles;
  }

  /**
   * Create comprehensive test fixtures
   */
  private async createFixtures(testsDir: string, force: boolean): Promise<void> {
    const fixturesDir = path.join(testsDir, 'fixtures');
    
    // Create test-data.ts helper
    const testDataFile = path.join(fixturesDir, 'test-data.ts');
    if (!fs.existsSync(testDataFile) || force) {
      fs.writeFileSync(testDataFile, this.generateTestDataHelper());
      console.log('✅ Created test data helper');
    }

    // Create user-data.json
    const userDataFile = path.join(fixturesDir, 'user-data.json');
    if (!fs.existsSync(userDataFile) || force) {
      fs.writeFileSync(userDataFile, this.generateUserDataFixture());
      console.log('✅ Created user data fixture');
    }

    // Create api-responses.json
    const apiResponsesFile = path.join(fixturesDir, 'api-responses.json');
    if (!fs.existsSync(apiResponsesFile) || force) {
      fs.writeFileSync(apiResponsesFile, this.generateApiResponsesFixture());
      console.log('✅ Created API responses fixture');
    }

    // Create schemas.json
    const schemasFile = path.join(fixturesDir, 'schemas.json');
    if (!fs.existsSync(schemasFile) || force) {
      fs.writeFileSync(schemasFile, this.generateSchemasFixture());
      console.log('✅ Created schemas fixture');
    }
  }

  /**
   * Generate test data helper
   */
  private generateTestDataHelper(): string {
    return `import * as fs from 'fs';
import * as path from 'path';

/**
 * Test Data Loader
 * Provides easy access to JSON fixtures and test data
 */
export class TestData {
  private static cache: Map<string, any> = new Map();

  /**
   * Load JSON fixture file
   */
  static loadFixture(filename: string): any {
    if (this.cache.has(filename)) {
      return this.cache.get(filename);
    }

    const filePath = path.join(__dirname, \`\${filename}.json\`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(\`Fixture file not found: \${filePath}\`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    this.cache.set(filename, data);
    return data;
  }

  /**
   * Get user test data
   */
  static get users() {
    return this.loadFixture('user-data');
  }

  /**
   * Get API responses test data
   */
  static get apiResponses() {
    return this.loadFixture('api-responses');
  }

  /**
   * Get JSON schemas for validation
   */
  static get schemas() {
    return this.loadFixture('schemas');
  }

  /**
   * Generate random test data using Faker
   */
  static generateUser(faker: any) {
    return {
      name: faker.person.fullName(),
      username: faker.internet.userName(),
      email: faker.internet.email(),
      address: {
        street: faker.location.streetAddress(),
        suite: faker.location.secondaryAddress(),
        city: faker.location.city(),
        zipcode: faker.location.zipCode(),
        geo: {
          lat: faker.location.latitude().toString(),
          lng: faker.location.longitude().toString()
        }
      },
      phone: faker.phone.number(),
      website: faker.internet.domainName(),
      company: {
        name: faker.company.name(),
        catchPhrase: faker.company.catchPhrase(),
        bs: faker.company.buzzPhrase()
      }
    };
  }

  /**
   * Generate random post data
   */
  static generatePost(faker: any, userId?: number) {
    return {
      title: faker.lorem.sentence(),
      body: faker.lorem.paragraphs(2),
      userId: userId || faker.number.int({ min: 1, max: 10 })
    };
  }

  /**
   * Deep clone object to avoid mutations
   */
  static clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

// Export specific data accessors for convenience
export const UserData = TestData.users;
export const ApiResponses = TestData.apiResponses;
export const Schemas = TestData.schemas;
`;
  }

  /**
   * Generate user data fixture
   */
  private generateUserDataFixture(): string {
    return JSON.stringify({
      "validUser": {
        "name": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "address": {
          "street": "123 Main St",
          "suite": "Apt 1",
          "city": "Anytown",
          "zipcode": "12345-6789",
          "geo": {
            "lat": "-37.3159",
            "lng": "81.1496"
          }
        },
        "phone": "1-770-736-8031 x56442",
        "website": "hildegard.org",
        "company": {
          "name": "Romaguera-Crona",
          "catchPhrase": "Multi-layered client-server neural-net",
          "bs": "harness real-time e-markets"
        }
      },
      "invalidUser": {
        "name": "",
        "username": "a",
        "email": "invalid-email",
        "phone": "invalid-phone"
      },
      "updateUserData": {
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "phone": "1-555-123-4567"
      },
      "usersList": [
        {
          "id": 1,
          "name": "Leanne Graham",
          "username": "Bret",
          "email": "Sincere@april.biz"
        },
        {
          "id": 2,
          "name": "Ervin Howell",
          "username": "Antonette",
          "email": "Shanna@melissa.tv"
        }
      ]
    }, null, 2);
  }

  /**
   * Generate API responses fixture
   */
  private generateApiResponsesFixture(): string {
    return JSON.stringify({
      "posts": {
        "singlePost": {
          "userId": 1,
          "id": 1,
          "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
          "body": "quia et suscipit suscipit recusandae consequuntur expedita et cum reprehenderit molestiae ut ut quas totam nostrum rerum est autem sunt rem eveniet architecto"
        },
        "newPost": {
          "title": "Test Post Title",
          "body": "This is a test post body content",
          "userId": 1
        }
      },
      "comments": {
        "singleComment": {
          "postId": 1,
          "id": 1,
          "name": "id labore ex et quam laborum",
          "email": "Eliseo@gardner.biz",
          "body": "laudantium enim quasi est quidem magnam voluptate ipsam eos tempora quo necessitatibus dolor quam autem quasi reiciendis et nam sapiente accusantium"
        }
      },
      "errors": {
        "notFound": {
          "error": "Not Found",
          "message": "The requested resource was not found",
          "statusCode": 404
        },
        "validation": {
          "error": "Validation Error",
          "message": "Request validation failed",
          "statusCode": 422,
          "details": [
            {
              "field": "email",
              "message": "Email is required"
            }
          ]
        }
      }
    }, null, 2);
  }

  /**
   * Generate schemas fixture
   */
  private generateSchemasFixture(): string {
    return JSON.stringify({
      "userSchema": {
        "type": "object",
        "required": ["id", "name", "username", "email"],
        "properties": {
          "id": { "type": "integer", "minimum": 1 },
          "name": { "type": "string", "minLength": 1 },
          "username": { "type": "string", "minLength": 1 },
          "email": { "type": "string", "format": "email" },
          "address": {
            "type": "object",
            "properties": {
              "street": { "type": "string" },
              "city": { "type": "string" },
              "zipcode": { "type": "string" }
            }
          }
        }
      },
      "postSchema": {
        "type": "object",
        "required": ["id", "title", "body", "userId"],
        "properties": {
          "id": { "type": "integer", "minimum": 1 },
          "title": { "type": "string", "minLength": 1 },
          "body": { "type": "string", "minLength": 1 },
          "userId": { "type": "integer", "minimum": 1 }
        }
      },
      "errorSchema": {
        "type": "object",
        "required": ["error", "message", "statusCode"],
        "properties": {
          "error": { "type": "string" },
          "message": { "type": "string" },
          "statusCode": { "type": "integer", "minimum": 400, "maximum": 599 }
        }
      }
    }, null, 2);
  }

  /**
   * Generate manual setup file with class methods (requires manual calls in tests)
   */
  private generateManualSetupFile(): string {
    return `import { restified } from 'restifiedts';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export class TestSetup {
  static async configure() {
    // Set global variables from environment
    const baseURL = process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';
    const timeout = parseInt(process.env.API_TIMEOUT || '30000');
    
    // Set global variables that can be used in all tests
    restified.setGlobalVariable('baseURL', baseURL);
    restified.setGlobalVariable('timeout', timeout);
    restified.setGlobalVariable('userAgent', 'RestifiedTS-TestSuite/1.0');

    // Real-world authentication: Obtain token dynamically
    await this.authenticateAndSetTokens();
  }

  /**
   * Real-world authentication pattern:
   * 1. Call authentication endpoint with credentials
   * 2. Extract token from response
   * 3. Set as global variable for all subsequent tests
   */
  static async authenticateAndSetTokens() {
    try {
      // Option 1: Use static token from environment (for development/testing)
      if (process.env.AUTH_TOKEN) {
        console.log('Using static AUTH_TOKEN from environment');
        restified.setGlobalVariable('authToken', process.env.AUTH_TOKEN);
        return;
      }

      // Option 2: Dynamic authentication (real-world pattern)
      if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) {
        console.log('Obtaining AUTH_TOKEN dynamically via API call...');
        
        const authURL = process.env.AUTH_SERVICE_URL || process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';
        
        const response = await restified
          .given()
            .baseURL(authURL)
            .contentType('application/json')
            .jsonBody({
              username: process.env.AUTH_USERNAME,
              password: process.env.AUTH_PASSWORD,
              grant_type: 'password'
            })
          .when()
            .post('/auth/login')
            .execute();

        await response
          .statusCode(200)
          .extract('$.access_token', 'authToken')
          .extract('$.refresh_token', 'refreshToken')
          .execute();

        console.log('✅ Authentication successful - token obtained and stored');
        return;
      }

      // Option 3: OAuth2 Client Credentials flow
      if (process.env.OAUTH2_CLIENT_ID && process.env.OAUTH2_CLIENT_SECRET) {
        console.log('Obtaining OAuth2 token via client credentials flow...');
        
        const oauthURL = process.env.OAUTH2_TOKEN_URL || \`\${process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com'}/oauth\`;
        
        const oauthResponse = await restified
          .given()
            .baseURL(oauthURL)
            .contentType('application/x-www-form-urlencoded')
            .formBody({
              grant_type: 'client_credentials',
              client_id: process.env.OAUTH2_CLIENT_ID,
              client_secret: process.env.OAUTH2_CLIENT_SECRET,
              scope: process.env.OAUTH2_SCOPE || 'api:read api:write'
            })
          .when()
            .post('/token')
            .execute();

        await oauthResponse
          .statusCode(200)
          .extract('$.access_token', 'authToken')
          .execute();

        console.log('✅ OAuth2 authentication successful - token obtained');
        return;
      }

      // Option 4: API Key authentication
      if (process.env.API_KEY) {
        console.log('Using API_KEY authentication');
        restified.setGlobalVariable('apiKey', process.env.API_KEY);
        return;
      }

      console.warn('⚠️  No authentication configured - tests may fail if API requires auth');
      
    } catch (error: any) {
      console.error('❌ Authentication failed:', error?.message || error);
      throw new Error(\`Authentication setup failed: \${error?.message || error}\`);
    }
  }

  static async cleanup() {
    console.log('🧹 Cleaning up RestifiedTS resources...');
    try {
      // Add any cleanup logic here if RestifiedTS has cleanup methods
      console.log('✅ Cleanup completed successfully');
    } catch (error: any) {
      console.error('❌ Cleanup error:', error?.message || error);
    }
  }
}
`;
  }

  /**
   * Generate global setup file with automatic Mocha hooks (no manual calls needed)
   */
  private generateGlobalSetupFile(): string {
    return `import { restified } from 'restifiedts';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Global Test Setup and Teardown
 * 
 * This file automatically configures RestifiedTS for all tests.
 * No need to manually call setup/cleanup in individual test files.
 * 
 * Configuration is applied once before all tests run and
 * cleanup is performed once after all tests complete.
 * 
 * USAGE:
 * 1. Include this file in your Mocha configuration:
 *    - Add to .mocharc.json: "require": ["tests/setup/global-setup.ts"]
 *    - Or use --require flag: mocha --require tests/setup/global-setup.ts
 * 2. Your individual tests can focus on test logic without setup/teardown
 * 3. Use utility functions like getBaseURL(), getAuthToken() in your tests
 */

// ========================================
// GLOBAL SETUP - Runs once before all tests
// ========================================
before(async function() {
  this.timeout(30000); // Allow time for authentication
  
  console.log('🚀 Initializing RestifiedTS Global Test Environment...');
  
  // Set global variables from environment
  const baseURL = process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';
  const timeout = parseInt(process.env.API_TIMEOUT || '30000');
  
  // Set global variables that can be used in all tests
  restified.setGlobalVariable('baseURL', baseURL);
  restified.setGlobalVariable('timeout', timeout);
  restified.setGlobalVariable('userAgent', 'RestifiedTS-TestSuite/1.0');
  
  console.log(\`📡 Base URL configured: \${baseURL}\`);
  console.log(\`⏱️  Default timeout: \${timeout}ms\`);

  // Real-world authentication: Obtain token dynamically
  await authenticateAndSetTokens();
  
  console.log('✅ Global test environment initialized successfully');
});

// ========================================
// GLOBAL TEARDOWN - Runs once after all tests
// ========================================
after(async function() {
  this.timeout(10000);
  
  console.log('🧹 Cleaning up RestifiedTS Global Test Environment...');
  
  try {
    // Cleanup RestifiedTS resources
    await restified.cleanup();
    console.log('✅ Global test environment cleanup completed successfully');
  } catch (error: any) {
    console.error('❌ Global cleanup error:', error?.message || error);
  }
});

// ========================================
// BEFORE EACH TEST - Clear local variables
// ========================================
beforeEach(function() {
  // Clear local variables before each test to ensure test isolation
  restified.clearLocalVariables();
});

/**
 * Real-world authentication pattern:
 * 1. Call authentication endpoint with credentials
 * 2. Extract token from response
 * 3. Set as global variable for all subsequent tests
 */
async function authenticateAndSetTokens() {
  try {
    // Option 1: Use static token from environment (for development/testing)
    if (process.env.AUTH_TOKEN) {
      console.log('🔑 Using static AUTH_TOKEN from environment');
      restified.setGlobalVariable('authToken', process.env.AUTH_TOKEN);
      return;
    }

    // Option 2: Dynamic authentication (real-world pattern)
    if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) {
      console.log('🔐 Obtaining AUTH_TOKEN dynamically via API call...');
      
      const authURL = process.env.AUTH_SERVICE_URL || process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';
      
      const response = await restified
        .given()
          .baseURL(authURL)
          .contentType('application/json')
          .jsonBody({
            username: process.env.AUTH_USERNAME,
            password: process.env.AUTH_PASSWORD,
            grant_type: 'password'
          })
        .when()
          .post('/auth/login')
          .execute();

      await response
        .statusCode(200)
        .extract('$.access_token', 'authToken')
        .extract('$.refresh_token', 'refreshToken')
        .execute();

      console.log('✅ Dynamic authentication successful - token obtained and stored');
      return;
    }

    // Option 3: OAuth2 Client Credentials flow
    if (process.env.OAUTH2_CLIENT_ID && process.env.OAUTH2_CLIENT_SECRET) {
      console.log('🔒 Obtaining OAuth2 token via client credentials flow...');
      
      const oauthURL = process.env.OAUTH2_TOKEN_URL || \`\${process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com'}/oauth\`;
      
      const oauthResponse = await restified
        .given()
          .baseURL(oauthURL)
          .contentType('application/x-www-form-urlencoded')
          .formBody({
            grant_type: 'client_credentials',
            client_id: process.env.OAUTH2_CLIENT_ID,
            client_secret: process.env.OAUTH2_CLIENT_SECRET,
            scope: process.env.OAUTH2_SCOPE || 'api:read api:write'
          })
        .when()
          .post('/token')
          .execute();

      await oauthResponse
        .statusCode(200)
        .extract('$.access_token', 'authToken')
        .execute();

      console.log('✅ OAuth2 authentication successful - token obtained');
      return;
    }

    // Option 4: API Key authentication
    if (process.env.API_KEY) {
      console.log('🗝️  Using API_KEY authentication');
      restified.setGlobalVariable('apiKey', process.env.API_KEY);
      return;
    }

    console.warn('⚠️  No authentication configured - tests may fail if API requires auth');
    
  } catch (error: any) {
    console.error('❌ Authentication failed:', error?.message || error);
    throw new Error(\`Authentication setup failed: \${error?.message || error}\`);
  }
}

// ========================================
// UTILITY FUNCTIONS FOR TESTS  
// ========================================

/**
 * Get the configured base URL for tests
 */
export function getBaseURL(): string {
  return restified.getGlobalVariable('baseURL') || process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';
}

/**
 * Get the configured auth token for tests
 */
export function getAuthToken(): string {
  return restified.getGlobalVariable('authToken') || process.env.AUTH_TOKEN || '';
}

/**
 * Get the configured API key for tests
 */
export function getApiKey(): string {
  return restified.getGlobalVariable('apiKey') || process.env.API_KEY || '';
}

/**
 * Check if authentication is configured
 */
export function isAuthConfigured(): boolean {
  return !!(getAuthToken() || getApiKey());
}
`;
  }

  /**
   * Generate fixtures example test
   */
  private generateFixturesExampleTest(): string {
    return `import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from '../setup/manual-setup';
import { TestData, UserData, ApiResponses } from '../fixtures/test-data';

/**
 * Fixtures and Test Data Examples
 * 
 * Demonstrates how to use JSON fixtures and data-driven testing
 */
describe('Fixtures Examples @integration', function() {
  before(async function() {
    this.timeout(30000);
    await TestSetup.configure();
  });

  after(async function() {
    this.timeout(10000);
    await TestSetup.cleanup();
  });

  it('should use predefined user data from fixtures', async function() {
    const userData = TestData.clone(UserData.validUser);

    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .contentType('application/json')
        .jsonBody(userData)
      .when()
        .post('/users')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.name', userData.name)
      .jsonPath('$.email', userData.email)
      .execute();
  });

  it('should test with multiple scenarios from fixtures', async function() {
    const scenarios = [
      { name: 'Valid User', data: UserData.validUser, shouldPass: true },
      { name: 'Invalid User', data: UserData.invalidUser, shouldPass: false }
    ];

    for (const scenario of scenarios) {
      console.log(\`Testing scenario: \${scenario.name}\`);

      const response = await restified
        .given()
          .baseURL('https://jsonplaceholder.typicode.com')
          .contentType('application/json')
          .jsonBody(scenario.data)
        .when()
          .post('/users')
          .execute();

      await response
        .statusCode(201)
        .execute();
    }
  });
});
`;
  }

  /**
   * Generate real-world authentication test
   */
  private generateRealWorldAuthTest(): string {
    return `import { restified } from 'restifiedts';
import { expect } from 'chai';
import { TestSetup } from '../setup/manual-setup';

/**
 * Real-world authentication patterns with RestifiedTS
 */
describe('Real-World Authentication @integration', function() {
  this.timeout(30000);

  before(async function() {
    await TestSetup.configure();
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  it('should use dynamically obtained bearer token', async function() {
    const response = await restified
      .given()
        .baseURL(process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com')
        .bearerToken('{{authToken}}')
        .header('Content-Type', 'application/json')
      .when()
        .get('/posts/1')
        .execute();

    await response
      .statusCode(200)
      .jsonPath('$.id', 1)
      .jsonPathExists('$.title')
      .execute();
  });

  it('should handle protected endpoints with extracted token', async function() {
    const response = await restified
      .given()
        .baseURL(process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com')
        .bearerToken('{{authToken}}')
        .jsonBody({
          title: 'Test Post',
          body: 'This is a test post created with dynamic authentication',
          userId: 1
        })
      .when()
        .post('/posts')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.title', 'Test Post')
      .execute();
  });
});
`;
  }

  /**
   * Generate Faker integration test
   */
  private generateFakerIntegrationTest(): string {
    return `import { restified } from 'restifiedts';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { TestSetup } from '../setup/manual-setup';
import { TestData } from '../fixtures/test-data';

/**
 * Faker.js Integration Tests
 */
describe('Faker.js Integration @unit', function() {
  before(async function() {
    this.timeout(30000);
    await TestSetup.configure();
    
    // Set faker locale from environment or default to English
    // Note: In newer versions of Faker, locale is handled differently
    // faker.locale = process.env.FAKER_LOCALE || 'en';
    
    // Set seed for reproducible tests if provided
    if (process.env.MOCK_DATA_SEED) {
      faker.seed(parseInt(process.env.MOCK_DATA_SEED));
    }
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  it('should create user with faker-generated data', async function() {
    const userData = TestData.generateUser(faker);
    
    console.log('Generated user data:', userData.name);

    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .contentType('application/json')
        .jsonBody(userData)
      .when()
        .post('/users')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.name', userData.name)
      .jsonPath('$.email', userData.email)
      .execute();

    expect(userData.name).to.be.a('string').and.to.have.length.greaterThan(0);
    expect(userData.email).to.include('@');
  });

  it('should use faker data in RestifiedTS variables', async function() {
    restified.setGlobalVariable('randomName', faker.person.fullName());
    restified.setGlobalVariable('randomEmail', faker.internet.email());

    const userData = {
      name: '{{randomName}}',
      email: '{{randomEmail}}'
    };

    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .contentType('application/json')
        .jsonBody(userData)
      .when()
        .post('/users')
        .execute();

    await response
      .statusCode(201)
      .jsonPathExists('$.name')
      .jsonPathExists('$.email')
      .execute();
  });
});
`;
  }

  /**
   * Generate schema validation test
   */
  private generateSchemaValidationTest(): string {
    return `import { restified } from 'restifiedts';
import { expect } from 'chai';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { TestSetup } from '../setup/manual-setup';
import { TestData, Schemas } from '../fixtures/test-data';

/**
 * Schema Validation Tests
 */
describe('Schema Validation @unit', function() {
  let ajv: Ajv;

  before(async function() {
    this.timeout(30000);
    await TestSetup.configure();
    
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
  });

  after(async function() {
    await TestSetup.cleanup();
  });

  it('should validate user response against schema', async function() {
    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
      .when()
        .get('/users/1')
        .execute();

    await response
      .statusCode(200)
      .jsonSchema(Schemas.userSchema)
      .execute();

    const userData = response.getData();
    const validate = ajv.compile(Schemas.userSchema);
    const isValid = validate(userData);

    if (!isValid) {
      console.error('Schema validation errors:', validate.errors);
    }

    expect(isValid).to.be.true;
    expect(userData.id).to.be.a('number');
    expect(userData.email).to.match(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/);
  });

  it('should validate post response against schema', async function() {
    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
      .when()
        .get('/posts/1')
        .execute();

    await response
      .statusCode(200)
      .jsonSchema(Schemas.postSchema)
      .execute();

    const postData = response.getData();
    expect(postData).to.have.all.keys('id', 'title', 'body', 'userId');
    expect(postData.id).to.be.above(0);
  });

  it('should validate array responses against schema', async function() {
    const response = await restified
      .given()
        .baseURL('https://jsonplaceholder.typicode.com')
        .queryParam('_limit', 5)
      .when()
        .get('/posts')
        .execute();

    await response
      .statusCode(200)
      .jsonPathExists('$')
      .jsonPath('$.length', 5)
      .execute();

    const posts = response.getData();
    const validate = ajv.compile(Schemas.postSchema);

    for (const post of posts) {
      const isValid = validate(post);
      expect(isValid).to.be.true;
    }
  });
});
`;
  }
}