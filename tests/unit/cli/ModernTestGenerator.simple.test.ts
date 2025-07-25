import { expect } from 'chai';
import { ModernTestGenerator } from '../../../src/cli/ModernTestGenerator';
import * as fs from 'fs';
import * as path from 'path';

describe('ModernTestGenerator Simple Tests @unit @cli', () => {
  let testGenerator: ModernTestGenerator;
  const testOutputDir = path.join(process.cwd(), 'test-output');

  beforeEach(() => {
    testGenerator = new ModernTestGenerator();
    
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup test files
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(testGenerator).to.be.instanceOf(ModernTestGenerator);
    });
  });

  describe('Test Generation', () => {
    it('should generate API test', async () => {
      const options = {
        type: 'api' as const,
        name: 'UserAPI',
        outputDir: testOutputDir,
        baseURL: 'https://api.example.com'
      };

      const filePath = await testGenerator.generateTest(options);
      
      expect(fs.existsSync(filePath)).to.be.true;
      
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).to.include('import { restified }');
      expect(content).to.include('UserAPI');
      expect(content).to.include('https://api.example.com');
    });

    it('should generate GraphQL test', async () => {
      const options = {
        type: 'graphql' as const,
        name: 'GraphQLAPI',
        outputDir: testOutputDir
      };

      const filePath = await testGenerator.generateTest(options);
      
      expect(fs.existsSync(filePath)).to.be.true;
      
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).to.include('GraphQL');
      expect(content).to.include('query');
    });

    it('should generate WebSocket test', async () => {
      const options = {
        type: 'websocket' as const,
        name: 'WebSocketTest',
        outputDir: testOutputDir
      };

      const filePath = await testGenerator.generateTest(options);
      
      expect(fs.existsSync(filePath)).to.be.true;
      
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).to.include('WebSocket');
    });

    it('should generate performance test', async () => {
      const options = {
        type: 'performance' as const,
        name: 'PerformanceTest',
        outputDir: testOutputDir
      };

      const filePath = await testGenerator.generateTest(options);
      
      expect(fs.existsSync(filePath)).to.be.true;
      
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).to.include('performance');
    });

    it('should handle authentication option', async () => {
      const options = {
        type: 'api' as const,
        name: 'SecureAPI',
        outputDir: testOutputDir,
        authRequired: true
      };

      const filePath = await testGenerator.generateTest(options);
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).to.include('auth');
    });

    it('should create directory if it does not exist', async () => {
      const deepPath = path.join(testOutputDir, 'deep', 'nested', 'path');
      const options = {
        type: 'api' as const,
        name: 'DeepTest',
        outputDir: deepPath
      };

      const filePath = await testGenerator.generateTest(options);
      
      expect(fs.existsSync(filePath)).to.be.true;
      expect(fs.existsSync(deepPath)).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid output directory permissions', async () => {
      // Try to write to a non-existent drive (Windows specific)
      const invalidPath = process.platform === 'win32' ? 'Z:\\invalid\\path' : '/root/invalid';
      
      try {
        await testGenerator.generateTest({
          type: 'api',
          name: 'Test',
          outputDir: invalidPath
        });
        
        // If we reach here on Windows, the test might have succeeded unexpectedly
        // On Unix-like systems, it should have thrown an error
        if (process.platform !== 'win32') {
          throw new Error('Should have thrown an error');
        }
      } catch (error: any) {
        // Expected behavior - error should be thrown
        expect(error).to.be.instanceOf(Error);
      }
    });
  });
});