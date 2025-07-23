/**
 * Database Test Utilities for RestifiedTS
 * 
 * Provides comprehensive database testing utilities including setup, teardown,
 * data seeding, state verification, and test data management.
 */

import { DatabaseManager } from './DatabaseManager';
import { 
  DatabaseConnection, 
  DatabaseConfig, 
  TestFixture,
  DatabaseTestUtilities as ITestUtilities
} from './DatabaseTypes';

export class DatabaseTestUtilities {
  private databaseManager: DatabaseManager;
  private fixtures: Map<string, TestFixture> = new Map();
  private snapshots: Map<string, any> = new Map();
  private createdTables: Set<string> = new Set();
  private seededData: Map<string, any[]> = new Map();

  constructor(databaseManager?: DatabaseManager) {
    this.databaseManager = databaseManager || new DatabaseManager();
  }

  /**
   * Setup database connection for testing
   */
  async setupTestDatabase(config: DatabaseConfig, connectionName: string = 'test'): Promise<DatabaseConnection> {
    const connection = await this.databaseManager.createConnection(connectionName, config);
    
    // Enable foreign key constraints for testing (if supported)
    try {
      if (config.type === 'sqlite') {
        await connection.query('PRAGMA foreign_keys = ON');
      }
    } catch (error) {
      // Ignore if not supported
    }

    return connection;
  }

  /**
   * Create test database schema
   */
  async createTestSchema(connection: DatabaseConnection, schema: any): Promise<void> {
    for (const [tableName, tableDefinition] of Object.entries(schema)) {
      await this.createTestTable(connection, tableName, tableDefinition as any);
    }
  }

  /**
   * Create a test table
   */
  async createTestTable(
    connection: DatabaseConnection, 
    tableName: string, 
    tableDefinition: any
  ): Promise<void> {
    const config = connection.getConnectionInfo();
    let createTableSQL = '';

    switch (config.type) {
      case 'mysql':
        createTableSQL = this.buildMySQLCreateTable(tableName, tableDefinition);
        break;
      case 'postgresql':
        createTableSQL = this.buildPostgreSQLCreateTable(tableName, tableDefinition);
        break;
      case 'sqlite':
        createTableSQL = this.buildSQLiteCreateTable(tableName, tableDefinition);
        break;
      case 'oracle':
        createTableSQL = this.buildOracleCreateTable(tableName, tableDefinition);
        break;
      default:
        throw new Error(`Unsupported database type for test table creation: ${config.type}`);
    }

    await connection.query(createTableSQL);
    this.createdTables.add(tableName);
  }

  /**
   * Load test fixtures
   */
  async loadFixtures(connection: DatabaseConnection, fixtures: TestFixture[]): Promise<void> {
    // Sort fixtures by dependencies
    const sortedFixtures = this.sortFixturesByDependencies(fixtures);
    
    for (const fixture of sortedFixtures) {
      await this.loadFixture(connection, fixture);
    }
  }

  /**
   * Load a single fixture
   */
  async loadFixture(connection: DatabaseConnection, fixture: TestFixture): Promise<void> {
    this.fixtures.set(fixture.table, fixture);
    
    for (const row of fixture.data) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = columns.map(() => '?').join(', ');
      
      const insertSQL = `INSERT INTO ${fixture.table} (${columns.join(', ')}) VALUES (${placeholders})`;
      await connection.query(insertSQL, values);
    }
    
    // Store seeded data for cleanup
    this.seededData.set(fixture.table, fixture.data);
  }

  /**
   * Seed test data
   */
  async seedTestData(connection: DatabaseConnection, tableName: string, data: any[]): Promise<void> {
    for (const row of data) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = columns.map(() => '?').join(', ');
      
      const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      await connection.query(insertSQL, values);
    }
    
    this.seededData.set(tableName, data);
  }

  /**
   * Clear test data from specific tables
   */
  async clearTestData(connection: DatabaseConnection, tables?: string[]): Promise<void> {
    const tablesToClear = tables || Array.from(this.seededData.keys());
    
    // Disable foreign key checks temporarily
    await this.disableForeignKeyChecks(connection);
    
    try {
      for (const tableName of tablesToClear) {
        await connection.query(`DELETE FROM ${tableName}`);
        this.seededData.delete(tableName);
      }
    } finally {
      // Re-enable foreign key checks
      await this.enableForeignKeyChecks(connection);
    }
  }

  /**
   * Truncate tables (faster than DELETE)
   */
  async truncateTables(connection: DatabaseConnection, tables?: string[]): Promise<void> {
    const tablesToTruncate = tables || Array.from(this.seededData.keys());
    const config = connection.getConnectionInfo();
    
    await this.disableForeignKeyChecks(connection);
    
    try {
      for (const tableName of tablesToTruncate) {
        switch (config.type) {
          case 'mysql':
          case 'postgresql':
            await connection.query(`TRUNCATE TABLE ${tableName}`);
            break;
          case 'sqlite':
            await connection.query(`DELETE FROM ${tableName}`);
            await connection.query(`DELETE FROM sqlite_sequence WHERE name='${tableName}'`);
            break;
          case 'oracle':
            await connection.query(`TRUNCATE TABLE ${tableName}`);
            break;
        }
      }
    } finally {
      await this.enableForeignKeyChecks(connection);
    }
  }

  /**
   * Create database snapshot
   */
  async createSnapshot(connection: DatabaseConnection, snapshotName: string, tables?: string[]): Promise<void> {
    const snapshot: any = {};
    const tablesToSnapshot = tables || Array.from(this.seededData.keys());
    
    for (const tableName of tablesToSnapshot) {
      const data = await connection.query(`SELECT * FROM ${tableName}`);
      snapshot[tableName] = data;
    }
    
    this.snapshots.set(snapshotName, snapshot);
  }

  /**
   * Restore database from snapshot
   */
  async restoreSnapshot(connection: DatabaseConnection, snapshotName: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotName);
    if (!snapshot) {
      throw new Error(`Snapshot '${snapshotName}' not found`);
    }
    
    // Clear existing data
    await this.clearTestData(connection, Object.keys(snapshot));
    
    // Restore snapshot data
    for (const [tableName, data] of Object.entries(snapshot)) {
      await this.seedTestData(connection, tableName, data as any[]);
    }
  }

  /**
   * Verify database state
   */
  async verifyDatabaseState(
    connection: DatabaseConnection, 
    expectedState: Record<string, any[]>
  ): Promise<{ passed: boolean; differences: any[] }> {
    const differences: any[] = [];
    
    for (const [tableName, expectedData] of Object.entries(expectedState)) {
      const actualData = await connection.query(`SELECT * FROM ${tableName} ORDER BY id`);
      
      if (actualData.length !== expectedData.length) {
        differences.push({
          table: tableName,
          type: 'row_count_mismatch',
          expected: expectedData.length,
          actual: actualData.length
        });
        continue;
      }
      
      for (let i = 0; i < expectedData.length; i++) {
        const expectedRow = expectedData[i];
        const actualRow = actualData[i];
        
        for (const [column, expectedValue] of Object.entries(expectedRow)) {
          if (actualRow[column] !== expectedValue) {
            differences.push({
              table: tableName,
              row: i,
              column,
              type: 'value_mismatch',
              expected: expectedValue,
              actual: actualRow[column]
            });
          }
        }
      }
    }
    
    return {
      passed: differences.length === 0,
      differences
    };
  }

  /**
   * Wait for database condition
   */
  async waitForCondition(
    connection: DatabaseConnection,
    condition: () => Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<boolean> {
    const timeout = options.timeout || 10000; // 10 seconds default
    const interval = options.interval || 100; // 100ms default
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return false;
  }

  /**
   * Execute test with transaction rollback
   */
  async executeWithRollback<T>(
    connection: DatabaseConnection,
    testFunction: () => Promise<T>
  ): Promise<T> {
    return await connection.transaction(async () => {
      const result = await testFunction();
      
      // Always rollback to ensure clean state
      throw new RollbackError(result);
    }).catch((error) => {
      if (error instanceof RollbackError) {
        return error.result;
      }
      throw error;
    });
  }

  /**
   * Performance test helper
   */
  async measurePerformance<T>(
    operation: () => Promise<T>,
    iterations: number = 1
  ): Promise<{ result: T; averageTime: number; totalTime: number; iterations: number }> {
    const times: number[] = [];
    let result: T;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      result = await operation();
      const endTime = process.hrtime.bigint();
      
      times.push(Number(endTime - startTime) / 1000000); // Convert to milliseconds
    }
    
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    
    return {
      result: result!,
      averageTime,
      totalTime,
      iterations
    };
  }

  /**
   * Cleanup test environment
   */
  async cleanup(connection: DatabaseConnection): Promise<void> {
    // Clear all seeded data
    await this.clearTestData(connection);
    
    // Drop created tables
    await this.disableForeignKeyChecks(connection);
    
    try {
      for (const tableName of this.createdTables) {
        await connection.query(`DROP TABLE IF EXISTS ${tableName}`);
      }
    } finally {
      await this.enableForeignKeyChecks(connection);
    }
    
    // Clear internal state
    this.fixtures.clear();
    this.snapshots.clear();
    this.createdTables.clear();
    this.seededData.clear();
  }

  /**
   * Helper methods for building CREATE TABLE statements
   */
  private buildMySQLCreateTable(tableName: string, definition: any): string {
    const columns = Object.entries(definition.columns)
      .map(([name, config]: [string, any]) => {
        let columnDef = `${name} ${config.type}`;
        if (config.primaryKey) columnDef += ' PRIMARY KEY';
        if (config.autoIncrement) columnDef += ' AUTO_INCREMENT';
        if (!config.nullable) columnDef += ' NOT NULL';
        if (config.default !== undefined) columnDef += ` DEFAULT ${config.default}`;
        return columnDef;
      })
      .join(', ');
    
    return `CREATE TABLE ${tableName} (${columns})`;
  }

  private buildPostgreSQLCreateTable(tableName: string, definition: any): string {
    const columns = Object.entries(definition.columns)
      .map(([name, config]: [string, any]) => {
        let columnDef = `${name} ${config.type}`;
        if (config.primaryKey) columnDef += ' PRIMARY KEY';
        if (!config.nullable) columnDef += ' NOT NULL';
        if (config.default !== undefined) columnDef += ` DEFAULT ${config.default}`;
        return columnDef;
      })
      .join(', ');
    
    return `CREATE TABLE ${tableName} (${columns})`;
  }

  private buildSQLiteCreateTable(tableName: string, definition: any): string {
    const columns = Object.entries(definition.columns)
      .map(([name, config]: [string, any]) => {
        let columnDef = `${name} ${config.type}`;
        if (config.primaryKey) columnDef += ' PRIMARY KEY';
        if (config.autoIncrement) columnDef += ' AUTOINCREMENT';
        if (!config.nullable) columnDef += ' NOT NULL';
        if (config.default !== undefined) columnDef += ` DEFAULT ${config.default}`;
        return columnDef;
      })
      .join(', ');
    
    return `CREATE TABLE ${tableName} (${columns})`;
  }

  private buildOracleCreateTable(tableName: string, definition: any): string {
    const columns = Object.entries(definition.columns)
      .map(([name, config]: [string, any]) => {
        let columnDef = `${name} ${config.type}`;
        if (!config.nullable) columnDef += ' NOT NULL';
        if (config.default !== undefined) columnDef += ` DEFAULT ${config.default}`;
        return columnDef;
      })
      .join(', ');
    
    let createSQL = `CREATE TABLE ${tableName} (${columns}`;
    
    // Add primary key constraint separately for Oracle
    const primaryKeys = Object.entries(definition.columns)
      .filter(([, config]: [string, any]) => config.primaryKey)
      .map(([name]) => name);
    
    if (primaryKeys.length > 0) {
      createSQL += `, CONSTRAINT pk_${tableName} PRIMARY KEY (${primaryKeys.join(', ')})`;
    }
    
    createSQL += ')';
    return createSQL;
  }

  /**
   * Sort fixtures by dependencies to ensure correct loading order
   */
  private sortFixturesByDependencies(fixtures: TestFixture[]): TestFixture[] {
    const sorted: TestFixture[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (fixture: TestFixture) => {
      if (visiting.has(fixture.table)) {
        throw new Error(`Circular dependency detected in fixtures involving table: ${fixture.table}`);
      }
      
      if (visited.has(fixture.table)) {
        return;
      }
      
      visiting.add(fixture.table);
      
      if (fixture.dependencies) {
        for (const depTable of fixture.dependencies) {
          const depFixture = fixtures.find(f => f.table === depTable);
          if (depFixture) {
            visit(depFixture);
          }
        }
      }
      
      visiting.delete(fixture.table);
      visited.add(fixture.table);
      sorted.push(fixture);
    };
    
    for (const fixture of fixtures) {
      visit(fixture);
    }
    
    return sorted;
  }

  /**
   * Disable foreign key checks
   */
  private async disableForeignKeyChecks(connection: DatabaseConnection): Promise<void> {
    const config = connection.getConnectionInfo();
    
    try {
      switch (config.type) {
        case 'mysql':
          await connection.query('SET FOREIGN_KEY_CHECKS = 0');
          break;
        case 'sqlite':
          await connection.query('PRAGMA foreign_keys = OFF');
          break;
        case 'postgresql':
          // PostgreSQL doesn't have a global foreign key disable
          break;
        case 'oracle':
          // Oracle handles this differently - would need specific constraint names
          break;
      }
    } catch (error) {
      // Ignore if not supported
    }
  }

  /**
   * Enable foreign key checks
   */
  private async enableForeignKeyChecks(connection: DatabaseConnection): Promise<void> {
    const config = connection.getConnectionInfo();
    
    try {
      switch (config.type) {
        case 'mysql':
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');
          break;
        case 'sqlite':
          await connection.query('PRAGMA foreign_keys = ON');
          break;
        case 'postgresql':
          // PostgreSQL doesn't have a global foreign key disable
          break;
        case 'oracle':
          // Oracle handles this differently
          break;
      }
    } catch (error) {
      // Ignore if not supported
    }
  }
}

/**
 * Custom error for transaction rollback
 */
class RollbackError extends Error {
  constructor(public result: any) {
    super('Transaction rolled back intentionally');
    this.name = 'RollbackError';
  }
}