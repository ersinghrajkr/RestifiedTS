import { expect } from 'chai';
import { SnapshotStore } from '../../../src/core/stores/SnapshotStore';

describe('SnapshotStore System Tests @regression @unit', () => {
  let snapshotStore: SnapshotStore;

  beforeEach(() => {
    snapshotStore = new SnapshotStore({ autoLoad: false });
  });

  describe('Basic Snapshot Operations', () => {
    it('should create SnapshotStore instance', () => {
      expect(snapshotStore).to.be.instanceOf(SnapshotStore);
    });

    it('should create snapshots from response data', async () => {
      const responseData = {
        users: [
          { id: 1, name: 'John', email: 'john@example.com' },
          { id: 2, name: 'Jane', email: 'jane@example.com' }
        ],
        pagination: { page: 1, total: 2 }
      };

      const snapshot = await snapshotStore.snapshot('users-list-snapshot', responseData);
      expect(snapshot).to.exist;
      expect(snapshot.key).to.equal('users-list-snapshot');
      expect(snapshot.data).to.deep.equal(responseData);
    });

    it('should create snapshots with metadata', async () => {
      const testData = { message: 'test snapshot' };
      const metadata = {
        testName: 'user-api-test',
        timestamp: new Date(),
        environment: 'testing'
      };

      const snapshot = await snapshotStore.snapshot('test-snapshot', testData, metadata);
      expect(snapshot.metadata).to.deep.include(metadata);
    });

    it('should handle complex nested data structures', async () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, { nested: true }],
              date: new Date(),
              regex: /test-pattern/gi
            }
          }
        }
      };

      const snapshot = await snapshotStore.snapshot('complex-snapshot', complexData);
      expect(snapshot.data.level1.level2.level3.array).to.be.an('array');
    });
  });

  describe('Snapshot Retrieval and Management', () => {
    beforeEach(async () => {
      // Create test snapshots
      await snapshotStore.snapshot('baseline-snapshot', {
        version: '1.0',
        features: ['feature1', 'feature2'],
        config: { debug: false }
      });

      await snapshotStore.snapshot('updated-snapshot', {
        version: '1.1',
        features: ['feature1', 'feature2', 'feature3'],
        config: { debug: true }
      });
    });

    it('should retrieve existing snapshots', () => {
      const loaded = snapshotStore.get('baseline-snapshot');
      expect(loaded).to.exist;
      expect(loaded!.data.version).to.equal('1.0');
      expect(loaded!.data.features).to.include('feature1', 'feature2');
    });

    it('should handle retrieving non-existent snapshots', () => {
      const nonExistent = snapshotStore.get('non-existent-snapshot');
      expect(nonExistent).to.be.null;
    });

    it('should check snapshot existence', () => {
      expect(snapshotStore.has('baseline-snapshot')).to.be.true;
      expect(snapshotStore.has('non-existent')).to.be.false;
    });

    it('should list all snapshot keys', () => {
      const keys = snapshotStore.keys();
      expect(keys).to.include('baseline-snapshot', 'updated-snapshot');
      expect(keys).to.have.length.at.least(2);
    });
  });

  describe('Snapshot Comparison and Diffing', () => {
    beforeEach(async () => {
      await snapshotStore.snapshot('original-data', {
        users: [
          { id: 1, name: 'John', status: 'active' },
          { id: 2, name: 'Jane', status: 'active' }
        ],
        totalCount: 2,
        lastUpdated: '2025-01-01'
      });
    });

    it('should compare data against snapshots', async () => {
      const modifiedData = {
        users: [
          { id: 1, name: 'John', status: 'inactive' }, // status changed
          { id: 2, name: 'Jane', status: 'active' },
          { id: 3, name: 'Bob', status: 'active' }     // new user added
        ],
        totalCount: 3,                                 // count updated
        lastUpdated: '2025-01-02'                     // date updated
      };

      const comparison = await snapshotStore.compare('original-data', modifiedData);
      expect(comparison).to.exist;
      expect(comparison.equal).to.be.false;
    });

    it('should compare identical data', async () => {
      const identicalData = {
        message: 'same data',
        count: 42
      };

      await snapshotStore.snapshot('identical-test', identicalData);
      const comparison = await snapshotStore.compare('identical-test', identicalData);
      expect(comparison.equal).to.be.true;
    });
  });

  describe('Snapshot Organization and Management', () => {
    beforeEach(async () => {
      // Create organized snapshots
      await snapshotStore.snapshot('users/list', { users: [] });
      await snapshotStore.snapshot('users/details', { user: {} });
      await snapshotStore.snapshot('products/catalog', { products: [] });
      await snapshotStore.snapshot('orders/history', { orders: [] });
    });

    it('should support snapshot removal', async () => {
      await snapshotStore.snapshot('temporary-snapshot', { temp: true });
      expect(snapshotStore.has('temporary-snapshot')).to.be.true;

      const removed = await snapshotStore.remove('temporary-snapshot');
      expect(removed).to.be.true;
      expect(snapshotStore.has('temporary-snapshot')).to.be.false;
    });

    it('should support clearing all snapshots', async () => {
      expect(snapshotStore.keys().length).to.be.greaterThan(0);
      
      await snapshotStore.clear();
      expect(snapshotStore.keys()).to.have.length(0);
    });
  });

  describe('Performance and Statistics', () => {
    it('should handle large snapshots efficiently', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
          metadata: {
            tags: [`tag-${i}`, `category-${i % 10}`],
            metrics: {
              views: Math.random() * 1000,
              likes: Math.random() * 100
            }
          }
        }))
      };

      const startTime = Date.now();
      const snapshot = await snapshotStore.snapshot('large-snapshot', largeData);
      const saveTime = Date.now() - startTime;

      const loadStartTime = Date.now();
      const loaded = snapshotStore.get('large-snapshot');
      const loadTime = Date.now() - loadStartTime;

      expect(loaded!.data.items).to.have.length(1000);
      expect(saveTime).to.be.lessThan(2000); // Should save within 2 seconds
      expect(loadTime).to.be.lessThan(100);  // Should load very quickly from memory
    });

    it('should provide storage statistics', async () => {
      await snapshotStore.snapshot('stats-test', { test: 'data' });
      
      const stats = snapshotStore.getStats();
      expect(stats.count).to.be.a('number');
      expect(stats.totalSize).to.be.a('number');
      expect(stats.count).to.be.at.least(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined data gracefully', async () => {
      const nullSnapshot = await snapshotStore.snapshot('null-snapshot', null);
      const undefinedSnapshot = await snapshotStore.snapshot('undefined-snapshot', undefined);
      
      expect(nullSnapshot.data).to.be.null;
      expect(undefinedSnapshot.data).to.be.undefined;
    });

    it('should handle invalid snapshot names', async () => {
      const snapshot1 = await snapshotStore.snapshot('', { test: 'data' });
      const snapshot2 = await snapshotStore.snapshot('special/chars!@#', { test: 'data' });
      
      expect(snapshot1).to.exist;
      expect(snapshot2).to.exist;
    });

    it('should handle comparison with non-existent snapshots', async () => {
      try {
        await snapshotStore.compare('non-existent', { test: 'data' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('not found');
      }
    });
  });

  describe('Configuration and Modes', () => {
    it('should support update mode', async () => {
      snapshotStore.setUpdateMode(true);
      expect(snapshotStore.isUpdateMode()).to.be.true;
      
      snapshotStore.setUpdateMode(false);
      expect(snapshotStore.isUpdateMode()).to.be.false;
    });

    it('should support ignore fields configuration', async () => {
      snapshotStore.setIgnoreFields(['timestamp', 'id']);
      const ignoreFields = snapshotStore.getIgnoreFields();
      
      expect(ignoreFields).to.include('timestamp', 'id');
    });
  });

  describe('Import and Export', () => {
    it('should export and import snapshots', async () => {
      const testData = { export: 'test', value: 123 };
      await snapshotStore.snapshot('export-test', testData);
      
      const exported = snapshotStore.export();
      expect(exported).to.have.property('export-test');
      
      await snapshotStore.clear();
      expect(snapshotStore.has('export-test')).to.be.false;
      
      await snapshotStore.import(exported);
      expect(snapshotStore.has('export-test')).to.be.true;
      
      const imported = snapshotStore.get('export-test');
      expect(imported!.data).to.deep.equal(testData);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      await snapshotStore.snapshot('test-1', { type: 'user', active: true });
      await snapshotStore.snapshot('test-2', { type: 'admin', active: false });
      await snapshotStore.snapshot('test-3', { type: 'user', active: true });
    });

    it('should find snapshots by predicate', () => {
      const userSnapshots = snapshotStore.find((key, snapshot) => 
        snapshot.data.type === 'user'
      );
      
      expect(userSnapshots).to.have.length(2);
    });

    it('should find snapshots by metadata', async () => {
      await snapshotStore.snapshot('meta-test', { test: true }, { environment: 'prod' });
      
      const prodSnapshots = snapshotStore.findByMetadata('environment', 'prod');
      expect(prodSnapshots).to.have.length(1);
    });

    it('should find snapshots by time range', () => {
      const startTime = new Date(Date.now() - 1000);
      const endTime = new Date(Date.now() + 1000);
      
      const recentSnapshots = snapshotStore.findByTimeRange(startTime, endTime);
      expect(recentSnapshots.length).to.be.at.least(3);
    });
  });
});