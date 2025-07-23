import { expect } from 'chai';
import { DatabaseManager } from '../../../src/core/database/DatabaseManager';
import { DatabaseConfig } from '../../../src/core/database/DatabaseTypes';

describe('Database Manager Tests', () => {
  let databaseManager: DatabaseManager;

  beforeEach(() => {
    databaseManager = new DatabaseManager();
  });

  afterEach(async () => {
    // Cleanup all connections
    await databaseManager.closeAll();
  });

  describe('Connection Management', () => {
    it('should initialize database manager without errors', () => {
      expect(databaseManager).to.be.instanceOf(DatabaseManager);
    });

    it('should create SQLite connection for testing', async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test.db'
      };

      const connection = await databaseManager.createConnection('test', config);
      expect(connection).to.exist;
      expect(connection.isConnected()).to.be.true;
    });

    it('should get connection by name', async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test.db'
      };

      await databaseManager.createConnection('test', config);
      const connection = databaseManager.getConnection('test');
      expect(connection).to.exist;
    });

    it('should set and get default connection', async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test.db'
      };

      await databaseManager.createConnection('test', config);
      databaseManager.setDefaultConnection('test');
      
      expect(databaseManager.getDefaultConnectionName()).to.equal('test');
      
      const defaultConnection = databaseManager.getConnection();
      expect(defaultConnection).to.exist;
    });

    it('should list all connection names', async () => {
      const config1: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test1.db'
      };

      const config2: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test2.db'
      };

      await databaseManager.createConnection('test1', config1);
      await databaseManager.createConnection('test2', config2);

      const connectionNames = databaseManager.getConnectionNames();
      expect(connectionNames).to.include('test1');
      expect(connectionNames).to.include('test2');
      expect(connectionNames).to.have.length(2);
    });

    it('should close specific connection', async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test.db'
      };

      await databaseManager.createConnection('test', config);
      expect(databaseManager.getConnectionNames()).to.include('test');

      await databaseManager.closeConnection('test');
      expect(databaseManager.getConnectionNames()).to.not.include('test');
    });

    it('should handle connection errors gracefully', async () => {
      const invalidConfig: DatabaseConfig = {
        type: 'mysql', // This will fail without actual MySQL setup
        host: 'invalid-host',
        port: 3306,
        database: 'nonexistent'
      };

      try {
        await databaseManager.createConnection('invalid', invalidConfig);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).to.exist;
      }
    });
  });

  describe('Query Execution', () => {
    beforeEach(async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test.db'
      };

      await databaseManager.createConnection('test', config);
    });

    it('should execute simple query', async () => {
      const result = await databaseManager.query('SELECT 1 as test', [], 'test');
      expect(result).to.be.an('array');
      expect(result).to.have.length(1);
      expect(result[0]).to.have.property('test', 1);
    });

    it('should execute query with parameters', async () => {
      // Create test table
      await databaseManager.query(
        'CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)',
        [],
        'test'
      );

      // Insert test data
      await databaseManager.query(
        'INSERT INTO test_table (name) VALUES (?)',
        ['Test Name'],
        'test'
      );

      // Query with parameter
      const result = await databaseManager.query(
        'SELECT * FROM test_table WHERE name = ?',
        ['Test Name'],
        'test'
      );

      expect(result).to.have.length(1);
      expect(result[0]).to.have.property('name', 'Test Name');
    });

    it('should execute single row query', async () => {
      const result = await databaseManager.queryOne('SELECT 1 as test', [], 'test');
      expect(result).to.be.an('object');
      expect(result).to.have.property('test', 1);
    });

    it('should return null for queryOne with no results', async () => {
      await databaseManager.query(
        'CREATE TABLE empty_table (id INTEGER PRIMARY KEY)',
        [],
        'test'
      );

      const result = await databaseManager.queryOne(
        'SELECT * FROM empty_table WHERE id = ?',
        [999],
        'test'
      );

      expect(result).to.be.null;
    });
  });

  describe('Transaction Management', () => {
    beforeEach(async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test.db'
      };

      await databaseManager.createConnection('test', config);
      
      // Create test table
      await databaseManager.query(
        'CREATE TABLE transaction_test (id INTEGER PRIMARY KEY, value TEXT)',
        [],
        'test'
      );
    });

    it('should execute successful transaction', async () => {
      const result = await databaseManager.transaction(async (connection) => {
        await connection.query('INSERT INTO transaction_test (value) VALUES (?)', ['test1']);
        await connection.query('INSERT INTO transaction_test (value) VALUES (?)', ['test2']);
        return 'success';
      }, 'test');

      expect(result).to.equal('success');

      // Verify data was committed
      const rows = await databaseManager.query('SELECT * FROM transaction_test', [], 'test');
      expect(rows).to.have.length(2);
    });

    it('should rollback failed transaction', async () => {
      try {
        await databaseManager.transaction(async (connection) => {
          await connection.query('INSERT INTO transaction_test (value) VALUES (?)', ['test1']);
          throw new Error('Intentional error');
        }, 'test');
        
        expect.fail('Transaction should have failed');
      } catch (error: any) {
        expect(error.message).to.equal('Intentional error');
      }

      // Verify data was rolled back
      const rows = await databaseManager.query('SELECT * FROM transaction_test', [], 'test');
      expect(rows).to.have.length(0);
    });
  });

  describe('Health Check and Statistics', () => {
    beforeEach(async () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test.db'
      };

      await databaseManager.createConnection('test', config);
    });

    it('should perform health check', async () => {
      const health = await databaseManager.healthCheck();
      expect(health).to.have.property('test', true);
    });

    it('should get connection info', () => {
      const info = databaseManager.getConnectionInfo('test');
      expect(info).to.have.property('type', 'sqlite');
      expect(info).to.have.property('connected', true);
    });

    it('should get all connections info', () => {
      const allInfo = databaseManager.getAllConnectionsInfo();
      expect(allInfo).to.have.property('test');
      expect(allInfo.test).to.have.property('type', 'sqlite');
    });

    it('should get database statistics', () => {
      const stats = databaseManager.getStatistics();
      expect(stats).to.have.property('totalConnections', 1);
      expect(stats).to.have.property('defaultConnection', 'test');
      expect(stats).to.have.property('supportedDatabaseTypes');
      expect(stats.supportedDatabaseTypes).to.include('sqlite');
    });
  });

  describe('Event Handling', () => {
    it('should emit connection events', async () => {
      let connectEventEmitted = false;
      let queryEventEmitted = false;

      databaseManager.on('connect', () => {
        connectEventEmitted = true;
      });

      databaseManager.on('query', () => {
        queryEventEmitted = true;
      });

      const config: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test.db'
      };

      await databaseManager.createConnection('test', config);
      await databaseManager.query('SELECT 1', [], 'test');

      expect(connectEventEmitted).to.be.true;
      expect(queryEventEmitted).to.be.true;
    });

    it('should handle custom event listeners', async () => {
      let customEventFired = false;

      databaseManager.addEventListenerCustom((event) => {
        if (event.type === 'connect') {
          customEventFired = true;
        }
      });

      const config: DatabaseConfig = {
        type: 'sqlite',
        host: ':memory:',
        port: 0,
        database: 'test.db'
      };

      await databaseManager.createConnection('test', config);
      expect(customEventFired).to.be.true;
    });
  });

  describe('Adapter Management', () => {
    it('should get adapter for database type', () => {
      const sqliteAdapter = databaseManager.getAdapter('sqlite');
      expect(sqliteAdapter).to.exist;
    });

    it('should throw error for unsupported database type', () => {
      expect(() => {
        databaseManager.getAdapter('unsupported' as any);
      }).to.throw('No adapter available for database type: unsupported');
    });

    it('should register custom adapter', () => {
      const customAdapter = {
        connect: async () => ({} as any),
        createConnectionPool: async () => ({} as any),
        createQueryBuilder: () => ({} as any),
        createMigrationManager: () => ({} as any),
        createTestUtilities: () => ({} as any),
        escapeIdentifier: (id: string) => id,
        escapeValue: (val: any) => String(val),
        buildLimitClause: () => '',
        getCurrentTimestamp: () => 'NOW()',
        tableExists: async () => false,
        getTableColumns: async () => [],
        getTableIndexes: async () => []
      };

      databaseManager.registerAdapter('custom' as any, customAdapter);
      const adapter = databaseManager.getAdapter('custom' as any);
      expect(adapter).to.equal(customAdapter);
    });
  });
});