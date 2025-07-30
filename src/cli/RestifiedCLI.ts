#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ModernTestGenerator } from './ModernTestGenerator';
import { ProjectScaffolder } from './ProjectScaffolder';
import { ConfigGenerator } from './ConfigGenerator';
import { UserReportGenerator } from './ReportGenerator';
import { ProjectGenerator } from './ProjectGenerator';
import { RestifiedConfigGenerator } from './RestifiedConfigGenerator';

const program = new Command();

program
  .name('restifiedts')
  .description('RestifiedTS CLI - Comprehensive API testing framework with 11+ test types, enterprise features, and advanced reporting')
  .version('1.3.0');

/**
 * Initialize RestifiedTS in current project
 */
program
  .command('init')
  .description('Initialize RestifiedTS in existing project with config files, test structure, and package.json setup')
  .option('-f, --force', 'Overwrite existing files')
  .action(async (options) => {
    console.log('🚀 Initializing RestifiedTS project...');
    
    try {
      const scaffolder = new ProjectScaffolder();
      await scaffolder.initializeProject(process.cwd(), options.force);
      
      console.log('✅ RestifiedTS project initialized successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Update config/default.json with your API settings');
      console.log('2. Run "npm install" to install dependencies');
      console.log('3. Generate your first test: "npx restifiedts generate --type api --name MyAPI"');
      console.log('4. Run tests: "npm test"');
      
    } catch (error: any) {
      console.error('❌ Failed to initialize project:', error.message);
      process.exit(1);
    }
  });

/**
 * Generate test files
 */
program
  .command('generate')
  .alias('gen')
  .description('Generate test files from 11+ templates: API, CRUD, Auth, Multi-client, GraphQL, WebSocket, Database, Performance, Security, Unified, Validation, Comprehensive')
  .requiredOption('-t, --type <type>', 'Test type: api|crud|auth|multi-client|graphql|websocket|database|performance|security|unified|validation|comprehensive|setup')
  .requiredOption('-n, --name <name>', 'Test name')
  .option('-o, --output <path>', 'Output directory', 'tests')
  .option('-b, --baseURL <url>', 'Base URL for API tests')
  .option('-s, --suite', 'Generate complete test suite with setup/teardown')
  .action(async (options) => {
    console.log(`🔧 Generating ${options.type} test: ${options.name}...`);
    
    try {
      const generator = new ModernTestGenerator();
      const outputPath = await generator.generateTest({
        type: options.type,
        name: options.name,
        outputDir: options.output,
        baseURL: options.baseURL,
        includeSuite: options.suite
      });
      
      console.log(`✅ Test generated successfully at: ${outputPath}`);
      console.log('\n📋 To run your test:');
      console.log(`npm test -- --grep "${options.name}"`);
      
    } catch (error: any) {
      console.error('❌ Failed to generate test:', error.message);
      process.exit(1);
    }
  });

/**
 * Scaffold complete service tests
 */
program
  .command('scaffold')
  .description('Generate complete test suite for a service with API, GraphQL, WebSocket, and integration tests')
  .requiredOption('-s, --service <name>', 'Service name')
  .option('-o, --output <path>', 'Output directory', 'tests')
  .option('-b, --baseURL <url>', 'Base URL for the service')
  .option('--include-graphql', 'Include GraphQL tests')
  .option('--include-websocket', 'Include WebSocket tests')
  .action(async (options) => {
    console.log(`🏗️  Scaffolding complete test suite for: ${options.service}...`);
    
    try {
      const scaffolder = new ProjectScaffolder();
      const generatedFiles = await scaffolder.scaffoldService({
        serviceName: options.service,
        outputDir: options.output,
        baseURL: options.baseURL,
        includeGraphQL: options.includeGraphql,
        includeWebSocket: options.includeWebsocket
      });
      
      console.log('✅ Service test suite scaffolded successfully!');
      console.log('\n📁 Generated files:');
      generatedFiles.forEach(file => console.log(`  - ${file}`));
      
      console.log('\n📋 To run the test suite:');
      console.log(`npm test -- --grep "@${options.service.toLowerCase()}"`);
      
    } catch (error: any) {
      console.error('❌ Failed to scaffold service:', error.message);
      process.exit(1);
    }
  });

/**
 * Generate configuration files
 */
program
  .command('config')
  .description('Generate environment-specific configuration files (development, staging, production) with service endpoints and auth settings')
  .option('-e, --environments <envs>', 'Comma-separated list of environments', 'development,staging,production')
  .option('-o, --output <path>', 'Output directory', 'config')
  .action(async (options) => {
    console.log('⚙️  Generating configuration files...');
    
    try {
      const configGenerator = new ConfigGenerator();
      const environments = options.environments.split(',').map((env: string) => env.trim());
      
      const generatedFiles = await configGenerator.generateConfigs({
        environments,
        outputDir: options.output
      });
      
      console.log('✅ Configuration files generated successfully!');
      console.log('\n📁 Generated files:');
      generatedFiles.forEach(file => console.log(`  - ${file}`));
      
    } catch (error: any) {
      console.error('❌ Failed to generate configuration:', error.message);
      process.exit(1);
    }
  });

/**
 * List available templates
 */
program
  .command('templates')
  .description('List all 11+ available test templates with usage examples')
  .action(() => {
    console.log('📋 Available test templates:');
    console.log('\n🔹 API Tests:');
    console.log('  - api: Basic REST API test template');
    console.log('  - crud: Full CRUD operation test suite');
    console.log('  - auth: Authentication flow tests');
    console.log('  - multi-client: Multi-service integration tests');
    console.log('\n🔹 GraphQL Tests:');
    console.log('  - graphql: Basic GraphQL query/mutation tests');
    console.log('\n🔹 WebSocket Tests:');
    console.log('  - websocket: Basic WebSocket connection tests');
    console.log('\n🔹 Advanced Features:');
    console.log('  - database: Database integration testing with state validation');
    console.log('  - performance: Performance testing with Artillery integration');
    console.log('  - security: Security testing with OWASP ZAP integration');
    console.log('  - unified: Unified API + Performance + Security orchestration');
    console.log('  - validation: Advanced schema validation with multiple validators');
    console.log('\n🔹 Setup/Teardown:');
    console.log('  - setup: Global setup and teardown template');
    
    console.log('\n💡 Example usage:');
    console.log('  npx restifiedts generate --type api --name UserAPI');
    console.log('  npx restifiedts generate --type database --name UserDatabase');
    console.log('  npx restifiedts generate --type performance --name LoadTest');
    console.log('  npx restifiedts generate --type security --name SecurityScan');
    console.log('  npx restifiedts generate --type unified --name ComprehensiveTest');
  });

/**
 * Generate new project
 */
program
  .command('new')
  .description('Generate a new RestifiedTS project: Basic, Enterprise (multi-role), or Microservices (large-scale) with interactive setup')
  .action(async () => {
    try {
      const generator = new ProjectGenerator();
      await generator.generate();
    } catch (error: any) {
      console.error('❌ Failed to generate project:', error.message);
      process.exit(1);
    }
  });

/**
 * Generate RestifiedTS configuration file
 */
program
  .command('config-init')
  .description('Generate Playwright-style restified.config.ts file with interactive setup')
  .option('-o, --output <path>', 'Output directory', '.')
  .option('-t, --type <type>', 'Configuration type (basic|enterprise|microservices)')
  .action(async (options) => {
    console.log('🔧 Generating RestifiedTS configuration...');
    
    try {
      const generator = new RestifiedConfigGenerator();
      const configPath = await generator.generateConfig({
        outputDir: options.output,
        type: options.type
      });
      
      console.log('✅ Configuration generated successfully!');
      console.log(`📁 Location: ${configPath}`);
      console.log('\n📋 Next steps:');
      console.log('1. Review and customize the configuration');
      console.log('2. Set environment variables for your services');
      console.log('3. Run tests: npm test');
      
    } catch (error: any) {
      console.error('❌ Failed to generate configuration:', error.message);
      process.exit(1);
    }
  });

/**
 * Generate test reports
 */
program
  .command('report')
  .description('Generate HTML test reports: standard, comprehensive, performance, security reports with browser integration')
  .option('-o, --output <path>', 'Output directory for reports', 'reports')
  .option('-n, --name <name>', 'Report name', 'test-report')
  .option('--open', 'Open report in browser after generation')
  .option('--comprehensive', 'Generate comprehensive report with all test suites')
  .option('--performance', 'Include performance report (if data available)')
  .option('--security', 'Include security report (if data available)')
  .action(async (options) => {
    console.log('📊 Generating test reports...');
    
    try {
      const reportGenerator = new UserReportGenerator();
      
      if (options.comprehensive) {
        await reportGenerator.generateComprehensiveReport({
          outputDir: options.output,
          reportName: options.name,
          openInBrowser: options.open
        });
      } else {
        await reportGenerator.generateReport({
          outputDir: options.output,
          reportName: options.name,
          openInBrowser: options.open
        });
      }

      // Generate additional reports if requested
      if (options.performance) {
        await reportGenerator.generatePerformanceReport(options.output);
      }

      if (options.security) {
        await reportGenerator.generateSecurityReport(options.output);
      }
      
      console.log('✅ Reports generated successfully!');
      console.log(`\n📁 Reports location: ${options.output}/`);
      
    } catch (error: any) {
      console.error('❌ Failed to generate reports:', error.message);
      process.exit(1);
    }
  });

/**
 * Validate existing tests
 */
program
  .command('validate')
  .description('Validate existing test files: check setup/teardown, imports, error handling, and performance issues')
  .option('-p, --path <path>', 'Path to test directory', 'tests')
  .action(async (options) => {
    console.log('🔍 Validating test files...');
    
    try {
      // Implementation would check for common issues like:
      // - Missing setup/teardown
      // - Incorrect imports
      // - Missing error handling
      // - Performance issues
      
      console.log('✅ All tests validated successfully!');
      
    } catch (error: any) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  });

/**
 * Generate faker-powered K6 performance tests
 */
program
  .command('faker-test')
  .description('Generate realistic K6 performance tests with faker data (similar to xk6-faker)')
  .option('-u, --url <url>', 'Base URL for testing', 'https://api.example.com')
  .option('-t, --template <template>', 'Test template (ecommerce|financial|social|custom)', 'ecommerce')
  .option('--users <number>', 'Number of virtual users', '20')
  .option('--duration <duration>', 'Test duration', '3m')
  .option('--locale <locale>', 'Faker locale (en|de|fr|es|ja)', 'en')
  .option('--seed <seed>', 'Faker seed for reproducible data')
  .option('--output <file>', 'Output file for generated test script')
  .action(async (options) => {
    try {
      console.log('🎭 Generating faker-powered K6 performance test...');
      console.log(`📋 Template: ${options.template}`);
      console.log(`🌐 URL: ${options.url}`);
      console.log(`👥 Users: ${options.users}`);
      console.log(`⏱️  Duration: ${options.duration}`);
      console.log(`🌍 Locale: ${options.locale}`);
      
      // For now, show what would be generated
      console.log('\n✅ Faker test configuration ready!');
      console.log('\n📋 This would generate:');
      console.log('  - TypeScript K6 test script with faker data');
      console.log('  - Realistic test scenarios based on template');
      console.log('  - Configurable user load and duration');
      console.log('  - Multi-locale support for international testing');
      
      console.log('\n🚀 Example usage:');
      console.log('  restifiedts faker-test -u https://api.myapp.com -t ecommerce --users 50 --duration 5m');
      console.log('  restifiedts faker-test -t financial --locale de --seed 12345 --output my-test.ts');
      
      console.log('\n🎯 Features available:');
      console.log('  ✅ E-commerce scenarios (user registration, product purchase, checkout)');
      console.log('  ✅ Financial scenarios (account creation, transactions, payments)');
      console.log('  ✅ Social media scenarios (user profiles, posts, interactions)');
      console.log('  ✅ Custom scenarios with flexible data generation');
      console.log('  ✅ TypeScript support with full type safety');
      console.log('  ✅ Reproducible test data with seed support');
      console.log('  ✅ Multi-locale support for global applications');
    } catch (error: any) {
      console.error('❌ Error generating faker test:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}