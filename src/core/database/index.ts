/**
 * Database Module Index for RestifiedTS
 * 
 * Central export point for all database-related functionality including
 * connection management, adapters, utilities, and type definitions.
 */

// Core database management
export { DatabaseManager } from './DatabaseManager';
export { DatabaseTestUtilities } from './DatabaseTestUtilities';

// Type definitions
export * from './DatabaseTypes';

// Database adapters (commented out due to optional dependencies)
// export { MySQLAdapter } from './adapters/MySQLAdapter';
// export { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter';
// export { MongoDBAdapter } from './adapters/MongoDBAdapter';
// export { OracleAdapter } from './adapters/OracleAdapter';
// export { SQLiteAdapter } from './adapters/SQLiteAdapter';
// export { createDatabaseAdapter } from './adapters';

// Re-exports for convenience
export {
  DatabaseConfig,
  DatabaseConnection,
  DatabaseType,
  ConnectionPool,
  DatabaseAdapter,
  QueryBuilder,
  MigrationManager,
  TestFixture,
  Transaction,
  PreparedStatement,
  DatabaseConnectionInfo,
  QueryResult,
  QueryField,
  DatabaseError,
  DatabaseEvent,
  DatabaseEventListener
} from './DatabaseTypes';