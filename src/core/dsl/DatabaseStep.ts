/**
 * Database Step Integration for RestifiedTS DSL
 * 
 * Extends the fluent DSL to include database operations, allowing seamless
 * integration of database setup, verification, and cleanup in API tests.
 */

import { DatabaseManager } from '../database/DatabaseManager';
import { DatabaseTestUtilities } from '../database/DatabaseTestUtilities';
import { 
  DatabaseConnection, 
  DatabaseConfig, 
  TestFixture 
} from '../database/DatabaseTypes';

export interface IDatabaseStep {
  // Database connection management
  connectDatabase(name: string, config: DatabaseConfig): IDatabaseStep;
  useDatabase(connectionName?: string): IDatabaseStep;
  disconnectDatabase(connectionName?: string): IDatabaseStep;
  
  // Database setup and teardown
  setupDatabase(fixtures?: TestFixture[]): IDatabaseStep;
  teardownDatabase(tables?: string[]): IDatabaseStep;
  cleanupDatabase(): IDatabaseStep;
  
  // Data seeding and management
  seedData(tableName: string, data: any[]): IDatabaseStep;
  clearData(tables?: string[]): IDatabaseStep;
  truncateTable(tableName: string): IDatabaseStep;
  
  // Database queries
  executeQuery(sql: string, params?: any[]): IDatabaseStep;
  executeQueries(queries: Array<{ sql: string; params?: any[] }>): IDatabaseStep;
  
  // Transactions
  beginTransaction(): IDatabaseStep;
  commitTransaction(): IDatabaseStep;
  rollbackTransaction(): IDatabaseStep;
  withTransaction(callback: (connection: DatabaseConnection) => Promise<void>): IDatabaseStep;
  
  // Snapshots and state management
  createSnapshot(name: string, tables?: string[]): IDatabaseStep;
  restoreSnapshot(name: string): IDatabaseStep;
  verifyDatabaseState(expectedState: Record<string, any[]>): IDatabaseStep;
  
  // Database assertions
  expectTableExists(tableName: string): IDatabaseStep;
  expectTableNotExists(tableName: string): IDatabaseStep;
  expectRowCount(tableName: string, expectedCount: number): IDatabaseStep;
  expectRowExists(tableName: string, conditions: Record<string, any>): IDatabaseStep;
  expectRowNotExists(tableName: string, conditions: Record<string, any>): IDatabaseStep;
  
  // Data extraction from database
  extractFromDatabase(sql: string, variableName: string, params?: any[]): IDatabaseStep;
  extractRowId(tableName: string, conditions: Record<string, any>, variableName: string): IDatabaseStep;
  
  // Performance and monitoring
  measureDatabaseOperation(operationName: string): IDatabaseStep;
  expectQueryPerformance(maxExecutionTime: number): IDatabaseStep;
  
  // Migration support
  runMigrations(): IDatabaseStep;
  rollbackMigrations(steps?: number): IDatabaseStep;
}

export class DatabaseStep implements IDatabaseStep {
  private databaseManager: DatabaseManager;
  private testUtilities: DatabaseTestUtilities;
  private currentConnection?: string;
  private transactionActive = false;
  private queryResults: Map<string, any> = new Map();
  private performanceMetrics: Map<string, number> = new Map();

  constructor(databaseManager?: DatabaseManager) {
    this.databaseManager = databaseManager || new DatabaseManager();
    this.testUtilities = new DatabaseTestUtilities(this.databaseManager);
  }

  /**
   * Connect to a database
   */
  connectDatabase(name: string, config: DatabaseConfig): IDatabaseStep {
    this.databaseManager.createConnection(name, config)
      .then(() => {
        if (!this.currentConnection) {
          this.currentConnection = name;
        }
      })
      .catch(error => {
        throw new Error(`Failed to connect to database '${name}': ${error.message}`);
      });
    
    return this;
  }

  /**
   * Use a specific database connection
   */
  useDatabase(connectionName?: string): IDatabaseStep {
    if (connectionName) {
      this.currentConnection = connectionName;
    }
    return this;
  }

  /**
   * Disconnect from database
   */
  disconnectDatabase(connectionName?: string): IDatabaseStep {
    const nameToDisconnect = connectionName || this.currentConnection;
    if (nameToDisconnect) {
      this.databaseManager.closeConnection(nameToDisconnect)
        .catch(error => {
          console.warn(`Failed to disconnect from database '${nameToDisconnect}': ${error.message}`);
        });
    }
    
    if (nameToDisconnect === this.currentConnection) {
      this.currentConnection = undefined;
    }
    
    return this;
  }

  /**
   * Setup database with fixtures
   */
  setupDatabase(fixtures?: TestFixture[]): IDatabaseStep {
    if (fixtures) {
      const connection = this.getCurrentConnection();
      this.testUtilities.loadFixtures(connection, fixtures)
        .catch(error => {
          throw new Error(`Database setup failed: ${error.message}`);
        });
    }
    
    return this;
  }

  /**
   * Teardown database
   */
  teardownDatabase(tables?: string[]): IDatabaseStep {
    const connection = this.getCurrentConnection();
    this.testUtilities.clearTestData(connection, tables)
      .catch(error => {
        console.warn(`Database teardown failed: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Cleanup database completely
   */
  cleanupDatabase(): IDatabaseStep {
    const connection = this.getCurrentConnection();
    this.testUtilities.cleanup(connection)
      .catch(error => {
        console.warn(`Database cleanup failed: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Seed data into table
   */
  seedData(tableName: string, data: any[]): IDatabaseStep {
    const connection = this.getCurrentConnection();
    this.testUtilities.seedTestData(connection, tableName, data)
      .catch(error => {
        throw new Error(`Failed to seed data into ${tableName}: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Clear data from tables
   */
  clearData(tables?: string[]): IDatabaseStep {
    const connection = this.getCurrentConnection();
    this.testUtilities.clearTestData(connection, tables)
      .catch(error => {
        throw new Error(`Failed to clear data: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Truncate table
   */
  truncateTable(tableName: string): IDatabaseStep {
    const connection = this.getCurrentConnection();
    this.testUtilities.truncateTables(connection, [tableName])
      .catch(error => {
        throw new Error(`Failed to truncate table ${tableName}: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Execute a single query
   */
  executeQuery(sql: string, params?: any[]): IDatabaseStep {
    const startTime = Date.now();
    
    this.databaseManager.query(sql, params, this.currentConnection)
      .then(result => {
        const executionTime = Date.now() - startTime;
        this.performanceMetrics.set('lastQueryTime', executionTime);
        this.queryResults.set('lastQueryResult', result);
      })
      .catch(error => {
        throw new Error(`Query execution failed: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Execute multiple queries
   */
  executeQueries(queries: Array<{ sql: string; params?: any[] }>): IDatabaseStep {
    const connection = this.getCurrentConnection();
    
    const executeAll = async () => {
      const results = [];
      for (const query of queries) {
        const result = await connection.query(query.sql, query.params);
        results.push(result);
      }
      return results;
    };
    
    executeAll()
      .then(results => {
        this.queryResults.set('batchQueryResults', results);
      })
      .catch(error => {
        throw new Error(`Batch query execution failed: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Begin transaction
   */
  beginTransaction(): IDatabaseStep {
    this.transactionActive = true;
    return this;
  }

  /**
   * Commit transaction
   */
  commitTransaction(): IDatabaseStep {
    this.transactionActive = false;
    return this;
  }

  /**
   * Rollback transaction
   */
  rollbackTransaction(): IDatabaseStep {
    this.transactionActive = false;
    return this;
  }

  /**
   * Execute operations within a transaction
   */
  withTransaction(callback: (connection: DatabaseConnection) => Promise<void>): IDatabaseStep {
    this.databaseManager.transaction(callback, this.currentConnection)
      .catch(error => {
        throw new Error(`Transaction failed: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Create database snapshot
   */
  createSnapshot(name: string, tables?: string[]): IDatabaseStep {
    const connection = this.getCurrentConnection();
    this.testUtilities.createSnapshot(connection, name, tables)
      .catch(error => {
        throw new Error(`Failed to create snapshot '${name}': ${error.message}`);
      });
    
    return this;
  }

  /**
   * Restore database snapshot
   */
  restoreSnapshot(name: string): IDatabaseStep {
    const connection = this.getCurrentConnection();
    this.testUtilities.restoreSnapshot(connection, name)
      .catch(error => {
        throw new Error(`Failed to restore snapshot '${name}': ${error.message}`);
      });
    
    return this;
  }

  /**
   * Verify database state
   */
  verifyDatabaseState(expectedState: Record<string, any[]>): IDatabaseStep {
    const connection = this.getCurrentConnection();
    this.testUtilities.verifyDatabaseState(connection, expectedState)
      .then(result => {
        if (!result.passed) {
          const errorMessage = result.differences
            .map(diff => `${diff.table}: ${diff.type} - Expected: ${diff.expected}, Actual: ${diff.actual}`)
            .join('; ');
          throw new Error(`Database state verification failed: ${errorMessage}`);
        }
      })
      .catch(error => {
        throw new Error(`Database state verification error: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Expect table to exist
   */
  expectTableExists(tableName: string): IDatabaseStep {
    const connection = this.getCurrentConnection();
    const adapter = this.databaseManager.getAdapter(connection.getConnectionInfo().type);
    
    adapter.tableExists(connection, tableName)
      .then(exists => {
        if (!exists) {
          throw new Error(`Expected table '${tableName}' to exist, but it doesn't`);
        }
      })
      .catch(error => {
        throw new Error(`Error checking table existence: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Expect table to not exist
   */
  expectTableNotExists(tableName: string): IDatabaseStep {
    const connection = this.getCurrentConnection();
    const adapter = this.databaseManager.getAdapter(connection.getConnectionInfo().type);
    
    adapter.tableExists(connection, tableName)
      .then(exists => {
        if (exists) {
          throw new Error(`Expected table '${tableName}' to not exist, but it does`);
        }
      })
      .catch(error => {
        throw new Error(`Error checking table existence: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Expect specific row count in table
   */
  expectRowCount(tableName: string, expectedCount: number): IDatabaseStep {
    this.databaseManager.query(`SELECT COUNT(*) as count FROM ${tableName}`, [], this.currentConnection)
      .then(result => {
        const actualCount = parseInt(result[0]?.count || '0');
        if (actualCount !== expectedCount) {
          throw new Error(`Expected ${expectedCount} rows in '${tableName}', but found ${actualCount}`);
        }
      })
      .catch(error => {
        throw new Error(`Error checking row count: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Expect row to exist with conditions
   */
  expectRowExists(tableName: string, conditions: Record<string, any>): IDatabaseStep {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(conditions);
    
    this.databaseManager.query(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`,
      values,
      this.currentConnection
    )
      .then(result => {
        const count = parseInt(result[0]?.count || '0');
        if (count === 0) {
          throw new Error(`Expected row to exist in '${tableName}' with conditions: ${JSON.stringify(conditions)}`);
        }
      })
      .catch(error => {
        throw new Error(`Error checking row existence: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Expect row to not exist with conditions
   */
  expectRowNotExists(tableName: string, conditions: Record<string, any>): IDatabaseStep {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(conditions);
    
    this.databaseManager.query(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`,
      values,
      this.currentConnection
    )
      .then(result => {
        const count = parseInt(result[0]?.count || '0');
        if (count > 0) {
          throw new Error(`Expected no row to exist in '${tableName}' with conditions: ${JSON.stringify(conditions)}`);
        }
      })
      .catch(error => {
        throw new Error(`Error checking row non-existence: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Extract data from database and store in variable
   */
  extractFromDatabase(sql: string, variableName: string, params?: any[]): IDatabaseStep {
    this.databaseManager.query(sql, params, this.currentConnection)
      .then(result => {
        // Store the result for later use in variables
        this.queryResults.set(variableName, result);
      })
      .catch(error => {
        throw new Error(`Failed to extract data: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Extract row ID based on conditions
   */
  extractRowId(tableName: string, conditions: Record<string, any>, variableName: string): IDatabaseStep {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(conditions);
    
    this.databaseManager.query(
      `SELECT id FROM ${tableName} WHERE ${whereClause} LIMIT 1`,
      values,
      this.currentConnection
    )
      .then(result => {
        if (result.length > 0) {
          this.queryResults.set(variableName, result[0].id);
        } else {
          throw new Error(`No row found in '${tableName}' with conditions: ${JSON.stringify(conditions)}`);
        }
      })
      .catch(error => {
        throw new Error(`Failed to extract row ID: ${error.message}`);
      });
    
    return this;
  }

  /**
   * Measure database operation performance
   */
  measureDatabaseOperation(operationName: string): IDatabaseStep {
    this.performanceMetrics.set(`${operationName}_start`, Date.now());
    return this;
  }

  /**
   * Expect query performance within limits
   */
  expectQueryPerformance(maxExecutionTime: number): IDatabaseStep {
    const lastQueryTime = this.performanceMetrics.get('lastQueryTime');
    if (lastQueryTime && lastQueryTime > maxExecutionTime) {
      throw new Error(`Query execution time ${lastQueryTime}ms exceeded maximum ${maxExecutionTime}ms`);
    }
    
    return this;
  }

  /**
   * Run database migrations
   */
  runMigrations(): IDatabaseStep {
    // TODO: Implement migration runner
    console.warn('Migration support not yet implemented');
    return this;
  }

  /**
   * Rollback database migrations
   */
  rollbackMigrations(steps?: number): IDatabaseStep {
    // TODO: Implement migration rollback
    console.warn('Migration rollback support not yet implemented');
    return this;
  }

  /**
   * Get current database connection
   */
  private getCurrentConnection(): DatabaseConnection {
    if (!this.currentConnection) {
      throw new Error('No database connection available. Use connectDatabase() first.');
    }
    
    return this.databaseManager.getConnection(this.currentConnection);
  }

  /**
   * Get query results for variable resolution
   */
  getQueryResults(): Map<string, any> {
    return this.queryResults;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Map<string, number> {
    return this.performanceMetrics;
  }
}