// src/decorators/TestTags.ts

import 'reflect-metadata';
import { TestMetadata, TestMethod } from '../types/RestifiedTypes';

/**
 * Comprehensive test decoration system for RestifiedTS
 * 
 * Features:
 * - Multiple tagging decorators (@smoke, @regression, etc.)
 * - Test metadata management
 * - Tag-based filtering and execution
 * - Priority and dependency management
 * - Environment-specific test execution
 * - Test grouping and organization
 * - Custom tag creation
 * 
 * @example
 * ```typescript
 * class UserAPITests {
 *   @smoke
 *   @critical
 *   @timeout(5000)
 *   async testUserLogin() {
 *     // Test implementation
 *   }
 * 
 *   @regression
 *   @tag('data-validation')
 *   @dependsOn('testUserLogin')
 *   async testUserProfileUpdate() {
 *     // Test implementation
 *   }
 * }
 * ```
 */

const METADATA_KEY = Symbol('restified:test-metadata');

// ==========================================
// CORE TAG DECORATORS
// ==========================================

/**
 * Mark test as smoke test (critical path)
 */
export function smoke(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  addTag(target, propertyKey, 'smoke');
  setPriority(target, propertyKey, 100);
}

/**
 * Mark test as regression test (comprehensive testing)
 */
export function regression(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  addTag(target, propertyKey, 'regression');
  setPriority(target, propertyKey, 50);
}

/**
 * Mark test as integration test
 */
export function integration(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  addTag(target, propertyKey, 'integration');
  setPriority(target, propertyKey, 70);
}

/**
 * Mark test as unit test
 */
export function unit(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  addTag(target, propertyKey, 'unit');
  setPriority(target, propertyKey, 90);
}

/**
 * Mark test as end-to-end test
 */
export function e2e(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  addTag(target, propertyKey, 'e2e');
  setPriority(target, propertyKey, 30);
}

// ==========================================
// PRIORITY DECORATORS
// ==========================================

/**
 * Mark test as critical priority
 */
export function critical(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  addTag(target, propertyKey, 'critical');
  setPriority(target, propertyKey, 100);
}

/**
 * Mark test as slow running
 */
export function slow(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  addTag(target, propertyKey, 'slow');
  setTimeout(target, propertyKey, 60000); // 1 minute default
}

/**
 * Mark test as fast running
 */
export function fast(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  addTag(target, propertyKey, 'fast');
  setTimeout(target, propertyKey, 5000); // 5 seconds default
}

/**
 * Mark test as potentially flaky
 */
export function flaky(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  addTag(target, propertyKey, 'flaky');
  setRetries(target, propertyKey, 3);
}

/**
 * Skip test execution
 */
export function skip(reason?: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    addTag(target, propertyKey, 'skip');
    setSkipReason(target, propertyKey, reason || 'Test marked as skipped');
  };
}

// ==========================================
// CONFIGURABLE DECORATORS
// ==========================================

/**
 * Add custom tag to test
 */
export function tag(tagName: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    addTag(target, propertyKey, tagName);
  };
}

/**
 * Add multiple tags to test
 */
export function tags(...tagNames: string[]) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    tagNames.forEach(tagName => addTag(target, propertyKey, tagName));
  };
}

/**
 * Set test description
 */
export function description(desc: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    setDescription(target, propertyKey, desc);
  };
}

/**
 * Set test timeout
 */
export function timeout(ms: number) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    setTimeout(target, propertyKey, ms);
  };
}

/**
 * Set number of retries for flaky tests
 */
export function retry(count: number) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    setRetries(target, propertyKey, count);
  };
}

/**
 * Set test priority (higher number = higher priority)
 */
export function priority(level: number) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    setPriority(target, propertyKey, level);
  };
}

/**
 * Set test author
 */
export function author(name: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    setAuthor(target, propertyKey, name);
  };
}

/**
 * Link test to issue/ticket
 */
export function issue(issueId: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    setIssue(target, propertyKey, issueId);
  };
}

/**
 * Set test dependencies
 */
export function dependsOn(...dependencies: string[]) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    setDependencies(target, propertyKey, dependencies);
  };
}

/**
 * Set test group
 */
export function group(groupName: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    setGroup(target, propertyKey, groupName);
  };
}

/**
 * Set target environments
 */
export function env(...environments: string[]) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    setEnvironments(target, propertyKey, environments);
  };
}

/**
 * Set feature association
 */
export function feature(featureName: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    setFeature(target, propertyKey, featureName);
  };
}

// ==========================================
// METADATA MANAGEMENT FUNCTIONS
// ==========================================

function addTag(target: any, propertyKey: string, tagName: string): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  if (!metadata.tags.includes(tagName)) {
    metadata.tags.push(tagName);
  }
  setMetadata(target, propertyKey, metadata);
}

function setTimeout(target: any, propertyKey: string, ms: number): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.timeout = ms;
  setMetadata(target, propertyKey, metadata);
}

function setRetries(target: any, propertyKey: string, count: number): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.retries = count;
  setMetadata(target, propertyKey, metadata);
}

function setPriority(target: any, propertyKey: string, level: number): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.priority = level;
  setMetadata(target, propertyKey, metadata);
}

function setDescription(target: any, propertyKey: string, desc: string): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.description = desc;
  setMetadata(target, propertyKey, metadata);
}

function setAuthor(target: any, propertyKey: string, name: string): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.author = name;
  setMetadata(target, propertyKey, metadata);
}

function setIssue(target: any, propertyKey: string, issueId: string): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.issue = issueId;
  setMetadata(target, propertyKey, metadata);
}

function setSkipReason(target: any, propertyKey: string, reason: string): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.skipReason = reason;
  setMetadata(target, propertyKey, metadata);
}

function setDependencies(target: any, propertyKey: string, dependencies: string[]): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.dependencies = dependencies;
  setMetadata(target, propertyKey, metadata);
}

function setGroup(target: any, propertyKey: string, groupName: string): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.group = groupName;
  setMetadata(target, propertyKey, metadata);
}

function setEnvironments(target: any, propertyKey: string, environments: string[]): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.environment = environments;
  setMetadata(target, propertyKey, metadata);
}

function setFeature(target: any, propertyKey: string, featureName: string): void {
  const metadata = getOrCreateMetadata(target, propertyKey);
  metadata.feature = featureName;
  setMetadata(target, propertyKey, metadata);
}

function getOrCreateMetadata(target: any, propertyKey: string): TestMetadata {
  const existing = Reflect.getMetadata(METADATA_KEY, target, propertyKey);
  return existing || {
    tags: [],
    timeout: undefined,
    retries: undefined,
    priority: undefined,
    description: undefined,
    author: undefined,
    issue: undefined,
    skipReason: undefined,
    dependencies: undefined,
    group: undefined,
    environment: undefined,
    feature: undefined
  };
}

function setMetadata(target: any, propertyKey: string, metadata: TestMetadata): void {
  Reflect.defineMetadata(METADATA_KEY, metadata, target, propertyKey);
}

// ==========================================
// METADATA RETRIEVAL FUNCTIONS
// ==========================================

/**
 * Get tags for a test method
 */
export function getTags(target: any, propertyKey: string): string[] {
  const metadata = Reflect.getMetadata(METADATA_KEY, target, propertyKey);
  return metadata?.tags || [];
}

/**
 * Get timeout for a test method
 */
export function getTimeout(target: any, propertyKey: string): number | undefined {
  const metadata = Reflect.getMetadata(METADATA_KEY, target, propertyKey);
  return metadata?.timeout;
}

/**
 * Get retry count for a test method
 */
export function getRetries(target: any, propertyKey: string): number | undefined {
  const metadata = Reflect.getMetadata(METADATA_KEY, target, propertyKey);
  return metadata?.retries;
}

/**
 * Get priority for a test method
 */
export function getPriority(target: any, propertyKey: string): number | undefined {
  const metadata = Reflect.getMetadata(METADATA_KEY, target, propertyKey);
  return metadata?.priority;
}

/**
 * Get skip information for a test method
 */
export function getSkipInfo(target: any, propertyKey: string): { skip: boolean; reason?: string } {
  const metadata = Reflect.getMetadata(METADATA_KEY, target, propertyKey);
  const hasSkipTag = metadata?.tags?.includes('skip') || false;
  return {
    skip: hasSkipTag,
    reason: metadata?.skipReason
  };
}

/**
 * Get complete test metadata
 */
export function getTestMetadata(target: any, propertyKey: string): TestMetadata | undefined {
  return Reflect.getMetadata(METADATA_KEY, target, propertyKey);
}

/**
 * Check if test has specific tag
 */
export function hasTag(target: any, propertyKey: string, tagName: string): boolean {
  const tags = getTags(target, propertyKey);
  return tags.includes(tagName);
}

/**
 * Check if test has any of the specified tags
 */
export function hasAnyTag(target: any, propertyKey: string, tagNames: string[]): boolean {
  const tags = getTags(target, propertyKey);
  return tagNames.some(tag => tags.includes(tag));
}

/**
 * Check if test has all of the specified tags
 */
export function hasAllTags(target: any, propertyKey: string, tagNames: string[]): boolean {
  const tags = getTags(target, propertyKey);
  return tagNames.every(tag => tags.includes(tag));
}

// ==========================================
// CLASS-LEVEL ANALYSIS FUNCTIONS
// ==========================================

/**
 * Get all test methods from a class
 */
export function getTestMethods(targetClass: any): TestMethod[] {
  const prototype = targetClass.prototype;
  const methods: TestMethod[] = [];
  
  const propertyNames = Object.getOwnPropertyNames(prototype);
  
  for (const propertyName of propertyNames) {
    if (propertyName === 'constructor') continue;
    
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    if (descriptor && typeof descriptor.value === 'function') {
      const metadata = getTestMetadata(prototype, propertyName);
      
      if (metadata && metadata.tags.length > 0) {
        methods.push({
          name: propertyName,
          target: prototype,
          descriptor,
          metadata
        });
      }
    }
  }
  
  return methods;
}

/**
 * Filter test methods by tags
 */
export function filterTestsByTags(
  methods: TestMethod[],
  includeTags: string[] = [],
  excludeTags: string[] = []
): TestMethod[] {
  return methods.filter(method => {
    const tags = method.metadata.tags;
    
    // Check exclude tags first
    if (excludeTags.length > 0 && excludeTags.some(tag => tags.includes(tag))) {
      return false;
    }
    
    // Check include tags
    if (includeTags.length > 0) {
      return includeTags.some(tag => tags.includes(tag));
    }
    
    return true;
  });
}

/**
 * Sort test methods by priority (highest first)
 */
export function sortTestsByPriority(methods: TestMethod[]): TestMethod[] {
  return methods.sort((a, b) => {
    const priorityA = a.metadata.priority || 0;
    const priorityB = b.metadata.priority || 0;
    return priorityB - priorityA;
  });
}

/**
 * Group test methods by tag
 */
export function groupTestsByTag(methods: TestMethod[]): Map<string, TestMethod[]> {
  const groups = new Map<string, TestMethod[]>();
  
  methods.forEach(method => {
    method.metadata.tags.forEach(tag => {
      if (!groups.has(tag)) {
        groups.set(tag, []);
      }
      groups.get(tag)!.push(method);
    });
  });
  
  return groups;
}

/**
 * Get test execution order based on dependencies and priorities
 */
export function getTestExecutionOrder(methods: TestMethod[]): TestMethod[] {
  const sortedByPriority = sortTestsByPriority(methods);
  const executionOrder: TestMethod[] = [];
  const processed = new Set<string>();
  
  function addMethodWithDependencies(method: TestMethod): void {
    if (processed.has(method.name)) {
      return;
    }
    
    // Add dependencies first
    if (method.metadata.dependencies) {
      method.metadata.dependencies.forEach(depName => {
        const dependency = methods.find(m => m.name === depName);
        if (dependency && !processed.has(depName)) {
          addMethodWithDependencies(dependency);
        }
      });
    }
    
    executionOrder.push(method);
    processed.add(method.name);
  }
  
  sortedByPriority.forEach(method => {
    addMethodWithDependencies(method);
  });
  
  return executionOrder;
}

/**
 * Filter tests by environment
 */
export function filterTestsByEnvironment(
  methods: TestMethod[],
  currentEnvironment: string
): TestMethod[] {
  return methods.filter(method => {
    const environments = method.metadata.environment;
    if (!environments || environments.length === 0) {
      return true; // No environment restriction
    }
    return environments.includes(currentEnvironment);
  });
}

/**
 * Get test statistics
 */
export function getTestStatistics(methods: TestMethod[]): TestStatistics {
  const stats: TestStatistics = {
    total: methods.length,
    byTag: {},
    byPriority: {},
    byGroup: {},
    withTimeout: 0,
    withRetries: 0,
    withDependencies: 0,
    skipped: 0
  };
  
  methods.forEach(method => {
    const metadata = method.metadata;
    
    // Count by tags
    metadata.tags.forEach(tag => {
      stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
    });
    
    // Count by priority
    const priority = metadata.priority || 0;
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    
    // Count by group
    if (metadata.group) {
      stats.byGroup[metadata.group] = (stats.byGroup[metadata.group] || 0) + 1;
    }
    
    // Count special attributes
    if (metadata.timeout) stats.withTimeout++;
    if (metadata.retries) stats.withRetries++;
    if (metadata.dependencies && metadata.dependencies.length > 0) stats.withDependencies++;
    if (metadata.tags.includes('skip')) stats.skipped++;
  });
  
  return stats;
}

// ==========================================
// TYPES AND INTERFACES
// ==========================================

export interface TestStatistics {
  total: number;
  byTag: Record<string, number>;
  byPriority: Record<number, number>;
  byGroup: Record<string, number>;
  withTimeout: number;
  withRetries: number;
  withDependencies: number;
  skipped: number;
}

export interface TestExecutionPlan {
  order: TestMethod[];
  groups: Map<string, TestMethod[]>;
  dependencies: Map<string, string[]>;
  estimated: {
    duration: number;
    critical: number;
    regular: number;
  };
}