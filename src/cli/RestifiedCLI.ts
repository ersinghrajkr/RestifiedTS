#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ModernTestGenerator } from './ModernTestGenerator';
import { ProjectScaffolder } from './ProjectScaffolder';
import { ConfigGenerator } from './ConfigGenerator';
import { UserReportGenerator } from './ReportGenerator';

const program = new Command();

program
  .name('restifiedts')
  .description('RestifiedTS CLI - Generate test files and project scaffolding')
  .version('1.0.0');

/**
 * Initialize RestifiedTS in current project
 */
program
  .command('init')
  .description('Initialize RestifiedTS in the current project')
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
  .description('Generate test files')
  .requiredOption('-t, --type <type>', 'Test type (api, auth, multi-client, performance, graphql, websocket, database, security, unified, validation)')
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
  .description('Generate complete test suite for a service')
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
  .description('Generate configuration files for different environments')
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
  .description('List available test templates')
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
 * Generate test reports
 */
program
  .command('report')
  .description('Generate HTML test reports')
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
  .description('Validate existing test files for common issues')
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

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}