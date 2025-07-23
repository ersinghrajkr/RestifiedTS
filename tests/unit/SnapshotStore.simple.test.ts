import { expect } from 'chai';
import { SnapshotStore } from '../../src/core/stores/SnapshotStore';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('SnapshotStore System Tests @regression @unit', () => {
  let snapshotStore: SnapshotStore;
  const testSnapshotDir = join(__dirname, '../../test-snapshots');

  beforeEach(() => {
    snapshotStore = new SnapshotStore({ 
      snapshotDir: testSnapshotDir,
      autoLoad: false 
    });
  });

  afterEach(async () => {
    // Clean up test snapshots
    try {
      await snapshotStore.clear();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Snapshot Operations', () => {
    it('should initialize snapshot store without errors', () => {
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
      expect(snapshot.checksum).to.be.a('string');
      expect(snapshot.timestamp).to.be.a('date');
    });

    it('should retrieve stored snapshots', () => {
      const testData = { test: 'data' };
      
      // First create a snapshot
      return snapshotStore.snapshot('test-retrieval', testData).then(() => {
        const retrieved = snapshotStore.get('test-retrieval');
        
        expect(retrieved).to.exist;
        expect(retrieved!.key).to.equal('test-retrieval');
        expect(retrieved!.data).to.deep.equal(testData);
      });
    });

    it('should check if snapshots exist', async () => {
      const testData = { exists: true };
      
      expect(snapshotStore.has('existence-test')).to.be.false;
      
      await snapshotStore.snapshot('existence-test', testData);
      
      expect(snapshotStore.has('existence-test')).to.be.true;
    });

    it('should remove snapshots', async () => {
      const testData = { temporary: 'data' };
      
      await snapshotStore.snapshot('temp-snapshot', testData);
      expect(snapshotStore.has('temp-snapshot')).to.be.true;
      
      const removed = await snapshotStore.remove('temp-snapshot');
      expect(removed).to.be.true;
      expect(snapshotStore.has('temp-snapshot')).to.be.false;
    });

    it('should list all snapshot keys', async () => {
      await snapshotStore.snapshot('snapshot1', { data: 1 });
      await snapshotStore.snapshot('snapshot2', { data: 2 });
      await snapshotStore.snapshot('snapshot3', { data: 3 });
      
      const keys = snapshotStore.keys();
      
      expect(keys).to.include('snapshot1');
      expect(keys).to.include('snapshot2');
      expect(keys).to.include('snapshot3');
      expect(keys).to.have.length(3);
    });

    it('should clear all snapshots', async () => {
      await snapshotStore.snapshot('clear-test-1', { data: 1 });
      await snapshotStore.snapshot('clear-test-2', { data: 2 });
      
      expect(snapshotStore.keys()).to.have.length(2);
      
      await snapshotStore.clear();
      
      expect(snapshotStore.keys()).to.have.length(0);
    });
  });

  describe('Snapshot Comparison', () => {
    it('should compare identical data successfully', async () => {
      const originalData = {
        user: {
          id: 123,
          name: 'John Doe',
          settings: {
            theme: 'dark',
            notifications: true
          }
        }
      };

      const identicalData = {
        user: {
          id: 123,
          name: 'John Doe',
          settings: {
            theme: 'dark',
            notifications: true
          }
        }
      };

      await snapshotStore.snapshot('comparison-test', originalData);
      
      const comparison = await snapshotStore.compare('comparison-test', identicalData);
      expect(comparison.equal).to.be.true;
    });

    it('should detect differences in snapshots', async () => {
      const originalData = {
        id: 1,
        name: 'Original Name',
        status: 'active'
      };

      const modifiedData = {
        id: 1,
        name: 'Modified Name',
        status: 'inactive'
      };

      await snapshotStore.snapshot('diff-test', originalData);
      
      const comparison = await snapshotStore.compare('diff-test', modifiedData);
      expect(comparison.equal).to.be.false;
      expect(comparison.changed).to.exist;
    });

    it('should create snapshots in update mode when missing', async () => {
      const testData = { new: 'snapshot' };
      
      // Enable update mode
      snapshotStore.setUpdateMode(true);
      
      const comparison = await snapshotStore.compare('new-snapshot', testData);
      expect(comparison.equal).to.be.true;
      expect(snapshotStore.has('new-snapshot')).to.be.true;
    });
  });

  describe('Snapshot Metadata and Options', () => {
    it('should store snapshots with metadata', async () => {
      const testData = { content: 'test data' };
      const metadata = {
        createdBy: 'test-suite',
        description: 'Test snapshot with metadata',
        tags: ['test', 'metadata']
      };

      const snapshot = await snapshotStore.snapshot('metadata-test', testData, metadata);
      
      expect(snapshot.metadata).to.deep.equal(metadata);
    });

    it('should support ignore fields configuration', async () => {
      const originalData = {
        id: 1,
        timestamp: '2024-01-01T10:00:00Z',
        data: 'important data'
      };

      const modifiedData = {
        id: 1,
        timestamp: '2024-01-01T11:00:00Z', // Different timestamp
        data: 'important data'
      };

      // Set timestamp to be ignored
      snapshotStore.setIgnoreFields(['timestamp']);
      
      await snapshotStore.snapshot('ignore-test', originalData);
      const comparison = await snapshotStore.compare('ignore-test', modifiedData);
      
      expect(comparison.equal).to.be.true;
    });
  });

  describe('Snapshot Statistics and Search', () => {
    it('should provide snapshot statistics', async () => {
      await snapshotStore.snapshot('stats-test-1', { size: 'small' });
      await snapshotStore.snapshot('stats-test-2', { size: 'large'.repeat(100) });
      
      const stats = snapshotStore.getStats();
      
      expect(stats.count).to.equal(2);
      expect(stats.totalSize).to.be.a('number');
      expect(stats.totalSize).to.be.greaterThan(0);
      expect(stats.oldestSnapshot).to.be.a('date');
      expect(stats.newestSnapshot).to.be.a('date');
    });

    it('should find snapshots by metadata', async () => {
      await snapshotStore.snapshot('api-test-1', { data: 1 }, {
        type: 'api', environment: 'test'
      });
      
      await snapshotStore.snapshot('api-prod-1', { data: 2 }, {
        type: 'api', environment: 'production'
      });
      
      await snapshotStore.snapshot('ui-test-1', { data: 3 }, {
        type: 'ui', environment: 'test'
      });
      
      const apiSnapshots = snapshotStore.findByMetadata('type', 'api');
      const testSnapshots = snapshotStore.findByMetadata('environment', 'test');
      
      expect(apiSnapshots).to.have.length(2);
      expect(testSnapshots).to.have.length(2);
    });

    it('should find snapshots using custom predicates', async () => {
      const now = new Date();
      const anHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      await snapshotStore.snapshot('recent-snapshot', { recent: true });
      
      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const recentSnapshots = snapshotStore.find((key, snapshot) => 
        snapshot.timestamp > anHourAgo
      );
      
      expect(recentSnapshots).to.have.length(1);
      expect(recentSnapshots[0].key).to.equal('recent-snapshot');
    });
  });

  describe('Snapshot Export and Import', () => {
    it('should export all snapshots', async () => {
      await snapshotStore.snapshot('export-test-1', { data: 1 });
      await snapshotStore.snapshot('export-test-2', { data: 2 });
      
      const exported = snapshotStore.export();
      
      expect(exported).to.have.property('export-test-1');
      expect(exported).to.have.property('export-test-2');
      expect(exported['export-test-1'].data).to.deep.equal({ data: 1 });
      expect(exported['export-test-2'].data).to.deep.equal({ data: 2 });
    });

    it('should import snapshots from exported data', async () => {
      // Create initial snapshots
      await snapshotStore.snapshot('import-test-1', { original: 1 });
      const exported = snapshotStore.export();
      
      // Clear and import
      await snapshotStore.clear();
      expect(snapshotStore.keys()).to.have.length(0);
      
      await snapshotStore.import(exported);
      
      expect(snapshotStore.keys()).to.have.length(1);
      expect(snapshotStore.keys()).to.include('import-test-1');
      
      const imported = snapshotStore.get('import-test-1');
      expect(imported!.data).to.deep.equal({ original: 1 });
    });
  });

  describe('Update Mode Management', () => {
    it('should manage update mode state', () => {
      expect(snapshotStore.isUpdateMode()).to.be.false;
      
      snapshotStore.setUpdateMode(true);
      expect(snapshotStore.isUpdateMode()).to.be.true;
      
      snapshotStore.setUpdateMode(false);
      expect(snapshotStore.isUpdateMode()).to.be.false;
    });

    it('should manage ignore fields list', () => {
      expect(snapshotStore.getIgnoreFields()).to.deep.equal([]);
      
      snapshotStore.setIgnoreFields(['timestamp', 'id']);
      expect(snapshotStore.getIgnoreFields()).to.deep.equal(['timestamp', 'id']);
      
      snapshotStore.setIgnoreFields([]);
      expect(snapshotStore.getIgnoreFields()).to.deep.equal([]);
    });
  });
});