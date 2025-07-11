// src/decorators/TagFilter.ts

import { TestMetadata, TestMetadataManager } from './TestMetadata';
import { getTags, getTestMethods, TestMethodInfo } from './TestTags';

/**
 * Advanced tag-based filtering system for test execution control
 * 
 * Features:
 * - Complex tag expression parsing (AND, OR, NOT operations)
 * - Environment-based filtering
 * - Priority-based test selection
 * - Dynamic filtering based on runtime conditions
 * - Test suite optimization and parallelization
 * - Custom filter predicates
 * - Statistical filtering (success rate, duration, etc.)
 * 
 * @example
 * ```typescript
 * const filter = new TagFilter();
 * 
 * // Simple tag filtering
 * const smokeTests = filter.filterByTags(['smoke']);
 * 
 * // Complex expressions
 * const criticalTests = filter.filterByExpression('(smoke OR regression) AND critical AND NOT flaky');
 * 
 * // Environment-specific filtering
 * const prodTests = filter.filterByEnvironment('production');
 * 
 * // Custom filtering
 * const fastTests = filter.filterByPredicate(test => test.metadata.expectedDuration < 5000);
 * ```
 */
export class TagFilter {
    private metadataManager: TestMetadataManager;
    private testRegistry: Map<string, TestMethodInfo> = new Map();

    constructor() {
        this.metadataManager = TestMetadataManager.getInstance();
    }

    /**
     * Register test classes for filtering
     */
    registerTestClass(testClass: any): void {
        const testMethods = getTestMethods(testClass);

        testMethods.forEach(testMethod => {
            const testId = `${testMethod.className}.${testMethod.methodName}`;
            this.testRegistry.set(testId, testMethod);

            // Register metadata in the manager
            this.metadataManager.registerTestMetadata(testId, testMethod.metadata);
        });
    }

    /**
     * Register multiple test classes
     */
    registerTestClasses(testClasses: any[]): void {
        testClasses.forEach(testClass => this.registerTestClass(testClass));
    }

    /**
     * Filter tests by simple tag list (OR operation)
     */
    filterByTags(
        includeTags: string[] = [],
        excludeTags: string[] = []
    ): FilterResult {
        const allTests = Array.from(this.testRegistry.values());

        const filteredTests = allTests.filter(test => {
            const testTags = test.metadata.tags || [];

            // Check include tags (OR operation - test must have at least one)
            if (includeTags.length > 0) {
                const hasIncludeTag = includeTags.some(tag => testTags.includes(tag));
                if (!hasIncludeTag) return false;
            }

            // Check exclude tags (test must not have any)
            if (excludeTags.length > 0) {
                const hasExcludeTag = excludeTags.some(tag => testTags.includes(tag));
                if (hasExcludeTag) return false;
            }

            return true;
        });

        return this.createFilterResult(filteredTests, { includeTags, excludeTags });
    }

    /**
     * Filter tests by complex tag expressions
     * Supports AND, OR, NOT operations with parentheses
     */
    filterByExpression(expression: string): FilterResult {
        const parser = new TagExpressionParser();
        const parsedExpression = parser.parse(expression);

        const allTests = Array.from(this.testRegistry.values());
        const filteredTests = allTests.filter(test => {
            const testTags = test.metadata.tags || [];
            return this.evaluateExpression(parsedExpression, testTags);
        });

        return this.createFilterResult(filteredTests, { expression });
    }

    /**
     * Filter tests by environment
     */
    filterByEnvironment(environment: string): FilterResult {
        const allTests = Array.from(this.testRegistry.values());

        const filteredTests = allTests.filter(test => {
            const environments = test.metadata.environments;

            // If no environments specified, test runs in all environments
            if (!environments || environments.length === 0) {
                return true;
            }

            return environments.includes(environment);
        });

        return this.createFilterResult(filteredTests, { environment });
    }

    /**
     * Filter tests by priority range
     */
    filterByPriority(minPriority: number = 0, maxPriority: number = Infinity): FilterResult {
        const allTests = Array.from(this.testRegistry.values());

        const filteredTests = allTests.filter(test => {
            const priority = test.metadata.priority || 0;
            return priority >= minPriority && priority <= maxPriority;
        });

        return this.createFilterResult(filteredTests, { minPriority, maxPriority });
    }

    /**
     * Filter tests by execution duration
     */
    filterByDuration(
        maxDuration?: number,
        minDuration?: number
    ): FilterResult {
        const allTests = Array.from(this.testRegistry.values());

        const filteredTests = allTests.filter(test => {
            const stats = test.metadata.statistics;
            const expectedDuration = test.metadata.expectedDuration;
            const duration = stats?.averageDuration || expectedDuration || 0;

            if (maxDuration !== undefined && duration > maxDuration) {
                return false;
            }

            if (minDuration !== undefined && duration < minDuration) {
                return false;
            }

            return true;
        });

        return this.createFilterResult(filteredTests, { maxDuration, minDuration });
    }

    /**
     * Filter tests by success rate
     */
    filterBySuccessRate(minSuccessRate: number = 0): FilterResult {
        const allTests = Array.from(this.testRegistry.values());

        const filteredTests = allTests.filter(test => {
            const stats = test.metadata.statistics;
            const successRate = stats?.successRate || 100; // Assume 100% for tests without history

            return successRate >= minSuccessRate;
        });

        return this.createFilterResult(filteredTests, { minSuccessRate });
    }

    /**
     * Filter tests by stability (exclude flaky tests)
     */
    filterByStability(maxFlakyScore: number = 0.3): FilterResult {
        const allTests = Array.from(this.testRegistry.values());

        const filteredTests = allTests.filter(test => {
            const stats = test.metadata.statistics;
            const flakyScore = stats?.flakyScore || 0;
            const stability = test.metadata.stability;

            // Exclude tests explicitly marked as flaky or unstable
            if (stability === 'flaky' || stability === 'unstable') {
                return false;
            }

            return flakyScore <= maxFlakyScore;
        });

        return this.createFilterResult(filteredTests, { maxFlakyScore });
    }

    /**
     * Filter tests by author
     */
    filterByAuthor(authorName: string): FilterResult {
        const allTests = Array.from(this.testRegistry.values());

        const filteredTests = allTests.filter(test => {
            return test.metadata.author?.name === authorName;
        });

        return this.createFilterResult(filteredTests, { author: authorName });
    }

    /**
     * Filter tests by category
     */
    filterByCategory(category: string): FilterResult {
        const allTests = Array.from(this.testRegistry.values());

        const filteredTests = allTests.filter(test => {
            return test.metadata.category === category;
        });

        return this.createFilterResult(filteredTests, { category });
    }

    /**
     * Filter tests by group
     */
    filterByGroup(group: string): FilterResult {
        const allTests = Array.from(this.testRegistry.values());

        const filteredTests = allTests.filter(test => {
            return test.metadata.group === group;
        });

        return this.createFilterResult(filteredTests, { group });
    }

    /**
     * Filter tests by custom predicate function
     */
    filterByPredicate(
        predicate: (test: TestMethodInfo) => boolean
    ): FilterResult {
        const allTests = Array.from(this.testRegistry.values());
        const filteredTests = allTests.filter(predicate);

        return this.createFilterResult(filteredTests, { customPredicate: true });
    }

    /**
     * Filter tests with multiple criteria (AND operation)
     */
    filterByMultipleCriteria(criteria: FilterCriteria): FilterResult {
        let tests = Array.from(this.testRegistry.values());

        // Apply tag filtering
        if (criteria.includeTags || criteria.excludeTags) {
            const tagResult = this.filterByTags(criteria.includeTags, criteria.excludeTags);
            tests = tagResult.tests;
        }

        // Apply expression filtering
        if (criteria.expression) {
            tests = tests.filter(test => {
                const parser = new TagExpressionParser();
                const parsedExpression = parser.parse(criteria.expression!);
                const testTags = test.metadata.tags || [];
                return this.evaluateExpression(parsedExpression, testTags);
            });
        }

        // Apply environment filtering
        if (criteria.environment) {
            tests = tests.filter(test => {
                const environments = test.metadata.environments;
                return !environments || environments.length === 0 || environments.includes(criteria.environment!);
            });
        }

        // Apply priority filtering
        if (criteria.minPriority !== undefined || criteria.maxPriority !== undefined) {
            tests = tests.filter(test => {
                const priority = test.metadata.priority || 0;
                const min = criteria.minPriority || 0;
                const max = criteria.maxPriority || Infinity;
                return priority >= min && priority <= max;
            });
        }

        // Apply duration filtering
        if (criteria.maxDuration !== undefined || criteria.minDuration !== undefined) {
            tests = tests.filter(test => {
                const stats = test.metadata.statistics;
                const expectedDuration = test.metadata.expectedDuration;
                const duration = stats?.averageDuration || expectedDuration || 0;

                if (criteria.maxDuration !== undefined && duration > criteria.maxDuration) {
                    return false;
                }

                if (criteria.minDuration !== undefined && duration < criteria.minDuration) {
                    return false;
                }

                return true;
            });
        }

        // Apply stability filtering
        if (criteria.includeFlaky === false) {
            tests = tests.filter(test => {
                const stats = test.metadata.statistics;
                const flakyScore = stats?.flakyScore || 0;
                const stability = test.metadata.stability;

                return stability !== 'flaky' && stability !== 'unstable' && flakyScore <= 0.3;
            });
        }

        // Apply skipped test filtering
        if (criteria.includeSkipped === false) {
            tests = tests.filter(test => !test.metadata.skipped);
        }

        // Apply disabled test filtering
        if (criteria.includeDisabled === false) {
            tests = tests.filter(test => !test.metadata.disabled);
        }

        return this.createFilterResult(tests, criteria);
    }

    /**
     * Get recommended test subset for quick validation
     */
    getQuickValidationSuite(maxTests: number = 20, maxDuration: number = 300000): FilterResult {
        // Prioritize smoke tests, then critical tests
        const criteria: FilterCriteria = {
            includeTags: ['smoke', 'critical'],
            maxDuration,
            includeFlaky: false,
            includeSkipped: false,
            includeDisabled: false
        };

        let result = this.filterByMultipleCriteria(criteria);

        // If we have too many tests, further filter by priority
        if (result.tests.length > maxTests) {
            result.tests.sort((a, b) => (b.metadata.priority || 0) - (a.metadata.priority || 0));
            result.tests = result.tests.slice(0, maxTests);
        }

        return result;
    }

    /**
     * Get test execution plan with optimal ordering
     */
    getExecutionPlan(criteria?: FilterCriteria): TestExecutionPlan {
        const filterResult = criteria
            ? this.filterByMultipleCriteria(criteria)
            : this.createFilterResult(Array.from(this.testRegistry.values()), {});

        // Sort by priority and dependencies
        const sortedTests = this.optimizeExecutionOrder(filterResult.tests);

        // Calculate estimated duration
        const estimatedDuration = sortedTests.reduce((total, test) => {
            const stats = test.metadata.statistics;
            const expectedDuration = test.metadata.expectedDuration;
            const duration = stats?.averageDuration || expectedDuration || 5000; // Default 5 seconds
            return total + duration;
        }, 0);

        // Group for parallel execution
        const parallelGroups = this.createParallelGroups(sortedTests);

        return {
            tests: sortedTests,
            totalTests: sortedTests.length,
            estimatedDuration,
            parallelGroups,
            executionStrategy: this.determineExecutionStrategy(sortedTests),
            recommendations: this.generateExecutionRecommendations(sortedTests)
        };
    }

    /**
     * Clear all registered tests
     */
    clear(): void {
        this.testRegistry.clear();
    }

    /**
     * Get statistics about registered tests
     */
    getStats(): FilterStats {
        const allTests = Array.from(this.testRegistry.values());

        const tagCounts = new Map<string, number>();
        const categoryCounts = new Map<string, number>();

        allTests.forEach(test => {
            // Count tags
            test.metadata.tags?.forEach(tag => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });

            // Count categories
            if (test.metadata.category) {
                categoryCounts.set(test.metadata.category, (categoryCounts.get(test.metadata.category) || 0) + 1);
            }
        });

        return {
            totalTests: allTests.length,
            tagDistribution: Object.fromEntries(tagCounts),
            categoryDistribution: Object.fromEntries(categoryCounts),
            testsByEnvironment: this.getTestsByEnvironment(),
            averagePriority: this.calculateAveragePriority(allTests),
            estimatedTotalDuration: this.calculateTotalDuration(allTests)
        };
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    private createFilterResult(tests: TestMethodInfo[], criteria: any): FilterResult {
        return {
            tests: [...tests], // Create a copy
            totalTests: tests.length,
            criteria,
            estimatedDuration: this.calculateTotalDuration(tests),
            summary: this.createResultSummary(tests)
        };
    }

    private evaluateExpression(expression: TagExpression, testTags: string[]): boolean {
        switch (expression.type) {
            case 'tag':
                return testTags.includes(expression.value);

            case 'and':
                return expression.operands.every(operand => this.evaluateExpression(operand, testTags));

            case 'or':
                return expression.operands.some(operand => this.evaluateExpression(operand, testTags));

            case 'not':
                return !this.evaluateExpression(expression.operand, testTags);

            default:
                return false;
        }
    }

    private optimizeExecutionOrder(tests: TestMethodInfo[]): TestMethodInfo[] {
        // Sort by priority first (higher priority first)
        const sorted = [...tests].sort((a, b) => {
            const priorityA = a.metadata.priority || 0;
            const priorityB = b.metadata.priority || 0;
            return priorityB - priorityA;
        });

        // TODO: Implement dependency-aware topological sorting
        return sorted;
    }

    private createParallelGroups(tests: TestMethodInfo[]): TestMethodInfo[][] {
        const groups: TestMethodInfo[][] = [];
        const groupSize = 4; // Default parallel group size

        for (let i = 0; i < tests.length; i += groupSize) {
            groups.push(tests.slice(i, i + groupSize));
        }

        return groups;
    }

    private determineExecutionStrategy(tests: TestMethodInfo[]): ExecutionStrategy {
        const totalTests = tests.length;
        const hasSlowTests = tests.some(test => {
            const stats = test.metadata.statistics;
            const expectedDuration = test.metadata.expectedDuration;
            const duration = stats?.averageDuration || expectedDuration || 0;
            return duration > 30000; // 30 seconds
        });

        if (totalTests <= 10) {
            return 'sequential';
        } else if (hasSlowTests) {
            return 'mixed';
        } else {
            return 'parallel';
        }
    }

    private generateExecutionRecommendations(tests: TestMethodInfo[]): string[] {
        const recommendations: string[] = [];

        const flakyTests = tests.filter(test => test.metadata.stability === 'flaky');
        if (flakyTests.length > 0) {
            recommendations.push(`Consider excluding ${flakyTests.length} flaky tests from critical pipelines`);
        }

        const slowTests = tests.filter(test => {
            const stats = test.metadata.statistics;
            const duration = stats?.averageDuration || 0;
            return duration > 60000; // 1 minute
        });
        if (slowTests.length > 0) {
            recommendations.push(`Consider running ${slowTests.length} slow tests separately or in parallel`);
        }

        if (tests.length > 100) {
            recommendations.push('Consider splitting large test suite into smaller, focused test runs');
        }

        return recommendations;
    }

    private calculateTotalDuration(tests: TestMethodInfo[]): number {
        return tests.reduce((total, test) => {
            const stats = test.metadata.statistics;
            const expectedDuration = test.metadata.expectedDuration;
            const duration = stats?.averageDuration || expectedDuration || 5000;
            return total + duration;
        }, 0);
    }

    private createResultSummary(tests: TestMethodInfo[]): FilterResultSummary {
        const tagCounts = new Map<string, number>();
        const categoryCounts = new Map<string, number>();
        let totalPriority = 0;
        let priorityCount = 0;

        tests.forEach(test => {
            test.metadata.tags?.forEach(tag => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });

            if (test.metadata.category) {
                categoryCounts.set(test.metadata.category, (categoryCounts.get(test.metadata.category) || 0) + 1);
            }

            if (test.metadata.priority !== undefined) {
                totalPriority += test.metadata.priority;
                priorityCount++;
            }
        });

        return {
            testCount: tests.length,
            tagDistribution: Object.fromEntries(tagCounts),
            categoryDistribution: Object.fromEntries(categoryCounts),
            averagePriority: priorityCount > 0 ? totalPriority / priorityCount : 0,
            hasSkippedTests: tests.some(test => test.metadata.skipped),
            hasDisabledTests: tests.some(test => test.metadata.disabled),
            hasFlakyTests: tests.some(test => test.metadata.stability === 'flaky')
        };
    }

    private getTestsByEnvironment(): Record<string, number> {
        const envCounts: Record<string, number> = {};

        Array.from(this.testRegistry.values()).forEach(test => {
            const environments = test.metadata.environments || ['all'];
            environments.forEach(env => {
                envCounts[env] = (envCounts[env] || 0) + 1;
            });
        });

        return envCounts;
    }

    private calculateAveragePriority(tests: TestMethodInfo[]): number {
        const priorities = tests
            .map(test => test.metadata.priority)
            .filter(priority => priority !== undefined) as number[];

        return priorities.length > 0
            ? priorities.reduce((sum, priority) => sum + priority, 0) / priorities.length
            : 0;
    }
}

/**
 * Tag expression parser for complex filtering
 */
class TagExpressionParser {
    private tokens: string[] = [];
    private position: number = 0;

    parse(expression: string): TagExpression {
        this.tokens = this.tokenize(expression);
        this.position = 0;

        if (this.tokens.length === 0) {
            throw new Error('Empty expression');
        }

        const result = this.parseOr();

        if (this.position < this.tokens.length) {
            throw new Error(`Unexpected token: ${this.tokens[this.position]}`);
        }

        return result;
    }

    private tokenize(expression: string): string[] {
        const regex = /\(|\)|AND|OR|NOT|[a-zA-Z0-9_:-]+/g;
        const matches = expression.match(regex);
        return matches || [];
    }

    private parseOr(): TagExpression {
        let left = this.parseAnd();

        while (this.current() === 'OR') {
            this.consume('OR');
            const right = this.parseAnd();
            left = { type: 'or', operands: [left, right] };
        }

        return left;
    }

    private parseAnd(): TagExpression {
        let left = this.parseNot();

        while (this.current() === 'AND') {
            this.consume('AND');
            const right = this.parseNot();
            left = { type: 'and', operands: [left, right] };
        }

        return left;
    }

    private parseNot(): TagExpression {
        if (this.current() === 'NOT') {
            this.consume('NOT');
            const operand = this.parsePrimary();
            return { type: 'not', operand };
        }

        return this.parsePrimary();
    }

    private parsePrimary(): TagExpression {
        if (this.current() === '(') {
            this.consume('(');
            const result = this.parseOr();
            this.consume(')');
            return result;
        }

        const token = this.current();
        if (!token || token === ')' || token === 'AND' || token === 'OR' || token === 'NOT') {
            throw new Error(`Expected tag name, got: ${token}`);
        }

        this.position++;
        return { type: 'tag', value: token };
    }

    private current(): string | undefined {
        return this.tokens[this.position];
    }

    private consume(expected: string): void {
        const current = this.current();
        if (current !== expected) {
            throw new Error(`Expected '${expected}', got: ${current}`);
        }
        this.position++;
    }
}

// ==========================================
// INTERFACES AND TYPES
// ==========================================

export interface FilterCriteria {
    includeTags?: string[];
    excludeTags?: string[];
    expression?: string;
    environment?: string;
    minPriority?: number;
    maxPriority?: number;
    maxDuration?: number;
    minDuration?: number;
    minSuccessRate?: number;
    maxFlakyScore?: number;
    author?: string;
    category?: string;
    group?: string;
    includeFlaky?: boolean;
    includeSkipped?: boolean;
    includeDisabled?: boolean;
}

export interface FilterResult {
    tests: TestMethodInfo[];
    totalTests: number;
    criteria: any;
    estimatedDuration: number;
    summary: FilterResultSummary;
}

export interface FilterResultSummary {
    testCount: number;
    tagDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    averagePriority: number;
    hasSkippedTests: boolean;
    hasDisabledTests: boolean;
    hasFlakyTests: boolean;
}

export interface TestExecutionPlan {
    tests: TestMethodInfo[];
    totalTests: number;
    estimatedDuration: number;
    parallelGroups: TestMethodInfo[][];
    executionStrategy: ExecutionStrategy;
    recommendations: string[];
}

export interface FilterStats {
    totalTests: number;
    tagDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    testsByEnvironment: Record<string, number>;
    averagePriority: number;
    estimatedTotalDuration: number;
}

export type ExecutionStrategy = 'sequential' | 'parallel' | 'mixed';

export interface TagExpression {
    type: 'tag' | 'and' | 'or' | 'not';
    value?: string;
    operands?: TagExpression[];
    operand?: TagExpression;
}

/**
 * CLI integration for tag-based filtering
 */
export class TagFilterCLI {
    private filter: TagFilter;

    constructor(testClasses: any[]) {
        this.filter = new TagFilter();
        this.filter.registerTestClasses(testClasses);
    }

    /**
     * Parse CLI arguments and create filter criteria
     */
    parseArgs(args: string[]): FilterCriteria {
        const criteria: FilterCriteria = {};

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            switch (arg) {
                case '--tags':
                case '-t':
                    criteria.includeTags = args[++i]?.split(',') || [];
                    break;

                case '--exclude-tags':
                case '-e':
                    criteria.excludeTags = args[++i]?.split(',') || [];
                    break;

                case '--expression':
                case '-x':
                    criteria.expression = args[++i];
                    break;

                case '--environment':
                case '--env':
                    criteria.environment = args[++i];
                    break;

                case '--priority':
                case '-p':
                    const priorityRange = args[++i]?.split('-');
                    if (priorityRange?.length === 2) {
                        criteria.minPriority = parseInt(priorityRange[0]);
                        criteria.maxPriority = parseInt(priorityRange[1]);
                    } else {
                        criteria.minPriority = parseInt(priorityRange?.[0] || '0');
                    }
                    break;

                case '--max-duration':
                    criteria.maxDuration = parseInt(args[++i]);
                    break;

                case '--include-flaky':
                    criteria.includeFlaky = true;
                    break;

                case '--exclude-flaky':
                    criteria.includeFlaky = false;
                    break;

                case '--include-skipped':
                    criteria.includeSkipped = true;
                    break;

                case '--exclude-skipped':
                    criteria.includeSkipped = false;
                    break;

                case '--author':
                    criteria.author = args[++i];
                    break;

                case '--category':
                    criteria.category = args[++i];
                    break;

                case '--group':
                    criteria.group = args[++i];
                    break;
            }
        }

        return criteria;
    }

    /**
     * Execute filtering based on CLI arguments
     */
    executeFilter(args: string[]): FilterResult {
        const criteria = this.parseArgs(args);
        return this.filter.filterByMultipleCriteria(criteria);
    }

    /**
     * Print filter help
     */
    printHelp(): void {
        console.log(`
Tag Filter CLI Usage:

  --tags, -t <tags>              Include tests with any of these tags (comma-separated)
  --exclude-tags, -e <tags>      Exclude tests with any of these tags (comma-separated)
  --expression, -x <expression>  Use complex tag expression (AND, OR, NOT)
  --environment, --env <env>     Run tests for specific environment
  --priority, -p <min-max>       Filter by priority range (e.g., "50-100" or "75")
  --max-duration <ms>            Exclude tests longer than specified duration
  --include-flaky                Include flaky tests (default: excluded)
  --exclude-flaky                Explicitly exclude flaky tests
  --include-skipped              Include skipped tests (default: excluded)
  --exclude-skipped              Explicitly exclude skipped tests
  --author <name>                Filter by test author
  --category <category>          Filter by test category
  --group <group>                Filter by test group

Examples:
  npm test -- --tags smoke,critical
  npm test -- --expression "(smoke OR regression) AND NOT flaky"
  npm test -- --environment production --priority 50-100
  npm test -- --exclude-flaky --max-duration 30000
    `);
    }
}