/**
 * Configuration-Aware Test Runner
 * Playwright-style test execution with multi-project support
 */

import { RestifiedTS } from '../dsl/RestifiedTS';
import { ConfigLoader } from '../config/RestifiedConfig';
import { RestifiedConfig, ProjectConfig } from '../../types/RestifiedTypes';

export interface TestRunOptions {
  /** Configuration file path */
  configPath?: string;
  /** Override configuration */
  config?: Partial<RestifiedConfig>;
  /** Run specific projects only */
  projects?: string[];
  /** Enable parallel execution */
  parallel?: boolean;
  /** Maximum number of workers */
  workers?: number;
  /** Test file patterns to run */
  testMatch?: string[];
}

export interface ProjectTestResult {
  projectName: string;
  success: boolean;
  testCount: number;
  passedCount: number;
  failedCount: number;
  duration: number;
  errors: string[];
}

export interface TestRunResult {
  success: boolean;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  projectResults: ProjectTestResult[];
}

export class ConfigAwareTestRunner {
  private config: RestifiedConfig | null = null;
  
  /**
   * Initialize the test runner with configuration
   */
  async initialize(options: TestRunOptions = {}): Promise<void> {
    try {
      this.config = await ConfigLoader.loadConfig(options.configPath);
      
      // Merge with override config
      if (options.config) {
        this.config = { ...this.config, ...options.config };
      }
      
      console.log(`[RestifiedTS] Configuration loaded from ${options.configPath || 'restified.config.ts'}`);
    } catch (error) {
      console.warn(`[RestifiedTS] No configuration file found, using defaults`);
      this.config = options.config || {};
    }
  }
  
  /**
   * Run tests for all configured projects
   */
  async runTests(options: TestRunOptions = {}): Promise<TestRunResult> {
    if (!this.config) {
      await this.initialize(options);
    }
    
    const projects = this.getProjectsToRun(options.projects);
    const results: ProjectTestResult[] = [];
    
    console.log(`[RestifiedTS] Running tests for ${projects.length} project(s)`);
    
    // Determine execution mode
    const useParallel = options.parallel ?? this.config?.fullyParallel ?? false;
    const workers = options.workers ?? this.config?.workers ?? 1;
    
    if (useParallel && projects.length > 1) {
      console.log(`[RestifiedTS] Running projects in parallel with ${workers} workers`);
      results.push(...await this.runProjectsInParallel(projects, options));
    } else {
      console.log(`[RestifiedTS] Running projects sequentially`);
      for (const project of projects) {
        const result = await this.runProject(project, options);
        results.push(result);
      }
    }
    
    return this.aggregateResults(results);
  }
  
  /**
   * Get list of projects to run based on configuration and options
   */
  private getProjectsToRun(projectFilter?: string[]): ProjectConfig[] {
    const configProjects = this.config?.projects || [];
    
    // If no projects configured, create a default project
    if (configProjects.length === 0) {
      return [{
        name: 'default',
        baseURL: this.config?.baseURL,
        timeout: this.config?.timeout,
        auth: this.config?.auth
      }];
    }
    
    // Filter projects if specified
    if (projectFilter && projectFilter.length > 0) {
      return configProjects.filter(p => projectFilter.includes(p.name));
    }
    
    return configProjects;
  }
  
  /**
   * Run multiple projects in parallel
   */
  private async runProjectsInParallel(
    projects: ProjectConfig[], 
    options: TestRunOptions
  ): Promise<ProjectTestResult[]> {
    const workers = typeof this.config?.workers === 'string' 
      ? this.calculateWorkers(this.config.workers)
      : (this.config?.workers || 2);
    
    const chunks = this.chunkArray(projects, workers);
    const results: ProjectTestResult[] = [];
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(project => this.runProject(project, options));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }
    
    return results;
  }
  
  /**
   * Run tests for a single project
   */
  private async runProject(project: ProjectConfig, options: TestRunOptions): Promise<ProjectTestResult> {
    const startTime = Date.now();
    console.log(`[RestifiedTS] Running project: ${project.name}`);
    
    try {
      // Create RestifiedTS instance for this project
      const restified = await RestifiedTS.create({
        ...this.config,
        baseURL: project.baseURL,
        timeout: project.timeout,
        auth: project.auth,
        headers: project.headers
      });
      
      // Here you would integrate with your test runner (Mocha, Jest, etc.)
      // For now, we'll simulate test execution
      const testResult = await this.executeProjectTests(restified, project, options);
      
      const duration = Date.now() - startTime;
      console.log(`[RestifiedTS] Project ${project.name} completed in ${duration}ms`);
      
      return {
        projectName: project.name,
        success: testResult.failedCount === 0,
        testCount: testResult.testCount,
        passedCount: testResult.passedCount,
        failedCount: testResult.failedCount,
        duration,
        errors: testResult.errors
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[RestifiedTS] Project ${project.name} failed:`, error);
      
      return {
        projectName: project.name,
        success: false,
        testCount: 0,
        passedCount: 0,
        failedCount: 1,
        duration,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
  
  /**
   * Execute tests for a project (placeholder for test runner integration)
   */
  private async executeProjectTests(
    restified: RestifiedTS, 
    project: ProjectConfig, 
    options: TestRunOptions
  ): Promise<{ testCount: number; passedCount: number; failedCount: number; errors: string[] }> {
    // This is where you would integrate with Mocha, Jest, or other test runners
    // For now, we'll return a mock result
    
    console.log(`[RestifiedTS] Executing tests for project: ${project.name}`);
    console.log(`[RestifiedTS] Base URL: ${project.baseURL}`);
    console.log(`[RestifiedTS] Test patterns: ${project.testMatch || 'default'}`);
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      testCount: 5,
      passedCount: 4,
      failedCount: 1,
      errors: [`Sample error for project ${project.name}`]
    };
  }
  
  /**
   * Aggregate results from all projects
   */
  private aggregateResults(projectResults: ProjectTestResult[]): TestRunResult {
    const totalTests = projectResults.reduce((sum, r) => sum + r.testCount, 0);
    const totalPassed = projectResults.reduce((sum, r) => sum + r.passedCount, 0);
    const totalFailed = projectResults.reduce((sum, r) => sum + r.failedCount, 0);
    const totalDuration = projectResults.reduce((sum, r) => sum + r.duration, 0);
    const success = projectResults.every(r => r.success);
    
    return {
      success,
      totalTests,
      totalPassed,
      totalFailed,
      totalDuration,
      projectResults
    };
  }
  
  /**
   * Calculate number of workers from percentage string
   */
  private calculateWorkers(workerConfig: string): number {
    if (workerConfig.endsWith('%')) {
      const percentage = parseInt(workerConfig.slice(0, -1));
      const cpuCount = require('os').cpus().length;
      return Math.max(1, Math.floor(cpuCount * percentage / 100));
    }
    return parseInt(workerConfig) || 1;
  }
  
  /**
   * Split array into chunks for parallel processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

/**
 * Convenience function to run tests with configuration
 */
export async function runConfiguredTests(options: TestRunOptions = {}): Promise<TestRunResult> {
  const runner = new ConfigAwareTestRunner();
  return await runner.runTests(options);
}