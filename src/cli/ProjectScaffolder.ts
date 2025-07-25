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
    
    // Create setup file
    const setupFile = path.join(testsDir, 'setup', 'global-setup.ts');
    if (!fs.existsSync(setupFile) || force) {
      fs.writeFileSync(setupFile, this.generateSetupFile());
      console.log('✅ Created global setup file');
    }

    // Create sample API test
    const apiTestFile = path.join(testsDir, 'integration', 'sample-api.test.ts');
    if (!fs.existsSync(apiTestFile) || force) {
      fs.writeFileSync(apiTestFile, this.generateSampleApiTest());
      console.log('✅ Created sample API test');
    }

    // Create sample unit test
    const unitTestFile = path.join(testsDir, 'unit', 'sample-unit.test.ts');
    if (!fs.existsSync(unitTestFile) || force) {
      fs.writeFileSync(unitTestFile, this.generateSampleUnitTest());
      console.log('✅ Created sample unit test');
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
        "test": "npm run test:clean && npm run test:run",
        "test:run": "mocha --require ts-node/register --require tsconfig-paths/register 'tests/**/*.test.ts' --reporter mochawesome --reporter-options reportDir=reports,reportFilename=test-report,json=true,html=true,inline=true,charts=true,code=true",
        "test:unit": "mocha --require ts-node/register --require tsconfig-paths/register 'tests/unit/**/*.test.ts' --reporter mochawesome --reporter-options reportDir=reports,reportFilename=unit-report,json=true,html=true",
        "test:integration": "mocha --require ts-node/register --require tsconfig-paths/register 'tests/integration/**/*.test.ts' --reporter mochawesome --reporter-options reportDir=reports,reportFilename=integration-report,json=true,html=true",
        "test:smoke": "mocha --require ts-node/register --require tsconfig-paths/register --grep '@smoke' 'tests/**/*.test.ts' --reporter mochawesome --reporter-options reportDir=reports,reportFilename=smoke-report,json=true,html=true",
        "test:fixtures": "mocha --require ts-node/register --require tsconfig-paths/register 'tests/**/fixtures-example.test.ts' --reporter spec",
        "test:faker": "mocha --require ts-node/register --require tsconfig-paths/register 'tests/**/faker-integration.test.ts' --reporter spec",
        "test:schema": "mocha --require ts-node/register --require tsconfig-paths/register 'tests/**/schema-validation.test.ts' --reporter spec",
        "test:auth": "mocha --require ts-node/register --require tsconfig-paths/register 'tests/**/real-world-auth.test.ts' --reporter spec",
        "test:comprehensive": "npm run test:unit && npm run test:integration && npm run test:smoke && npm run test:merge && npm run test:report:comprehensive",
        "test:merge": "mochawesome-merge 'reports/*.json' -o reports/merged-report.json",
        "test:report": "marge reports/test-report.json --reportDir reports --reportFilename test-report --inline --charts --code --timestamp",
        "test:report:comprehensive": "marge reports/merged-report.json --reportDir reports --reportFilename comprehensive-report --inline --charts --code --timestamp",
        "test:clean": "rimraf reports && mkdirp reports",
        "test:watch": "nodemon --ext ts --watch tests --exec 'npm run test:run'",
        "test:debug": "mocha --require ts-node/register --require tsconfig-paths/register --inspect-brk --reporter spec",
        "report": "restifiedts report --comprehensive --open",
        "lint": "eslint tests/**/*.ts --fix",
        "format": "prettier --write 'tests/**/*.ts'",
        "build": "tsc --noEmit",
        "dev": "npm run test:watch",
        "setup": "npm install && npm run test:clean"
      },
      "keywords": ["api", "testing", "restifiedts", "automation"],
      "author": "Generated by RestifiedTS",
      "license": "MIT",
      "dependencies": {
        "restifiedts": "^1.1.0",
        "dotenv": "^16.3.1",
        "@faker-js/faker": "^8.3.1",
        "chai": "^4.3.10",
        "mocha": "^10.2.0",
        "ajv": "^8.12.0",
        "ajv-formats": "^2.1.1"
      },
      "devDependencies": {
        "@types/chai": "^4.3.11",
        "@types/mocha": "^10.0.6",
        "@types/node": "^20.10.5",
        "@typescript-eslint/eslint-plugin": "^6.17.0",
        "@typescript-eslint/parser": "^6.17.0",
        "eslint": "^8.56.0",
        "mochawesome": "^7.1.3",
        "mochawesome-merge": "^4.3.0",
        "marge": "^1.0.1",
        "nodemon": "^3.0.2",
        "prettier": "^3.1.1",
        "rimraf": "^5.0.5",
        "mkdirp": "^3.0.1",
        "ts-node": "^10.9.2",
        "tsconfig-paths": "^4.2.0",
        "typescript": "^5.3.3"
      },
      "engines": {
        "node": ">=18.0.0"
      }
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

HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=https://proxy.company.com:8080
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

### Basic API Test

\`\`\`typescript
import { restified } from 'restifiedts';
import { expect } from 'chai';

describe('API Tests', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  it('should test API endpoint', async function() {
    const response = await restified
      .given()
        .baseURL(process.env.API_BASE_URL)
        .bearerToken(process.env.AUTH_TOKEN)
      .when()
        .get('/users')
        .execute();

    await response
      .statusCode(200)
      .jsonPath('$[0].id').isNumber()
      .execute();
  });
});
\`\`\`

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
import { TestSetup } from '../setup/global-setup';

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
      .jsonPath('$[0].id')
      .jsonPath('$[0].title')
      .execute();

    expect(response.data).to.be.an('array');
    expect(response.data.length).to.be.greaterThan(0);
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
      .jsonPath('$.title')
      .jsonPath('$.body')
      .execute();

    expect(response.data.id).to.equal(1);
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

    expect(response.data.id).to.be.a('number');
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
}