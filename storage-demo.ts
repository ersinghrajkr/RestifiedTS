/**
 * Storage Systems Demo for RestifiedTS
 */

import { StorageManager, ResponseStore, SnapshotStore, VariableStore } from './src/core/stores';
import { RestifiedResponse } from './src/types/RestifiedTypes';

// Mock response for testing
const createMockResponse = (url: string, status: number = 200, data: any = { message: 'success' }): RestifiedResponse => ({
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: { 'content-type': 'application/json' },
  data,
  config: {},
  request: {
    method: 'GET',
    url,
    headers: {},
    timestamp: new Date(),
    id: 'test-request-1'
  },
  responseTime: 150,
  size: JSON.stringify(data).length,
  timestamp: new Date(),
  id: 'test-response-1'
});

async function runStorageDemo() {
  console.log('💾 Starting RestifiedTS Storage Systems Demo\n');
  
  try {
    // 1. Storage Manager Demo
    console.log('1. Testing Storage Manager');
    const storageManager = new StorageManager({
      maxResponses: 50,
      maxVariables: 100,
      persistOnDisk: false,
      storageDir: './demo-storage'
    });
    
    console.log('Storage Config:', storageManager.getConfig());
    console.log();
    
    // 2. Response Storage Demo
    console.log('2. Testing Response Storage');
    const response1 = createMockResponse('/api/users', 200, { users: [{ id: 1, name: 'John' }] });
    const response2 = createMockResponse('/api/products', 200, { products: [{ id: 1, name: 'Widget' }] });
    
    const responseKey1 = storageManager.storeResponse(response1, 'users-list');
    const responseKey2 = storageManager.storeResponse(response2);
    
    console.log('Stored response keys:', responseKey1, responseKey2);
    
    const retrievedResponse = storageManager.getResponse('users-list');
    console.log('Retrieved response status:', retrievedResponse?.status);
    console.log('Retrieved response data:', retrievedResponse?.data);
    console.log();
    
    // 3. Response Store Direct Usage
    console.log('3. Testing Response Store Directly');
    const responseStore = storageManager.getResponseStore();
    
    // Find responses by status
    const successResponses = responseStore.findByStatus(200);
    console.log('Success responses count:', successResponses.length);
    
    // Find responses by URL pattern
    const userResponses = responseStore.findByUrl(/users/);
    console.log('User-related responses:', userResponses.length);
    
    console.log('Response store stats:', responseStore.getStats());
    console.log();
    
    // 4. Variable Storage Demo
    console.log('4. Testing Variable Storage');
    storageManager.setVariable('testUser', { id: 123, name: 'Alice' });
    storageManager.setVariable('apiKey', 'secret-key-123');
    
    console.log('Test user:', storageManager.getVariable('testUser'));
    console.log('API key:', storageManager.getVariable('apiKey'));
    
    const variableStore = storageManager.getVariableStore();
    console.log('Variable stats:', variableStore.getStats());
    console.log();
    
    // 5. Snapshot Storage Demo
    console.log('5. Testing Snapshot Storage');
    const snapshotStore = storageManager.getSnapshotStore();
    
    // Create snapshots
    const apiResponse = { users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] };
    await storageManager.createSnapshot('api-users-snapshot', apiResponse, { 
      test: 'user-list-test',
      version: '1.0' 
    });
    
    // Compare against snapshot
    const sameData = { users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] };
    const comparison1 = await storageManager.compareSnapshot('api-users-snapshot', sameData);
    console.log('Snapshot comparison (same data):', comparison1.equal);
    
    // Compare with different data
    const differentData = { users: [{ id: 1, name: 'John' }, { id: 2, name: 'Bob' }] };
    const comparison2 = await storageManager.compareSnapshot('api-users-snapshot', differentData);
    console.log('Snapshot comparison (different data):', comparison2.equal);
    if (!comparison2.equal) {
      console.log('Snapshot diff:', JSON.stringify(comparison2.diff, null, 2));
    }
    
    console.log('Snapshot store stats:', snapshotStore.getStats());
    console.log();
    
    // 6. Advanced Search and Filtering
    console.log('6. Testing Advanced Search');
    
    // Store more responses for searching
    const errorResponse = createMockResponse('/api/error', 500, { error: 'Internal Server Error' });
    storageManager.storeResponse(errorResponse, 'error-response');
    
    // Find responses by criteria
    const errorResponses = storageManager.findResponses({ status: 500 });
    console.log('Error responses found:', errorResponses.length);
    
    const apiResponses = storageManager.findResponses({ urlPattern: /api/ });
    console.log('API responses found:', apiResponses.length);
    
    // Find snapshots by metadata
    const testSnapshots = storageManager.findSnapshots({ 
      metadata: { test: 'user-list-test' } 
    });
    console.log('Test snapshots found:', testSnapshots.length);
    console.log();
    
    // 7. Export and Import Demo
    console.log('7. Testing Export/Import');
    const exportedData = await storageManager.exportAll();
    console.log('Exported data structure:');
    console.log('- Responses:', exportedData.responses.length);
    console.log('- Snapshots:', Object.keys(exportedData.snapshots).length);
    console.log('- Variables:', Object.keys(exportedData.variables).length);
    console.log('- Export time:', exportedData.metadata.exportTime);
    console.log();
    
    // Clear and import back
    await storageManager.clearAll();
    console.log('Storage cleared. Stats after clear:');
    console.log('- Response count:', storageManager.getResponseStore().getStats().size);
    console.log('- Snapshot count:', storageManager.getSnapshotStore().getStats().count);
    console.log('- Variable count:', storageManager.getVariableStore().getStats().total);
    
    await storageManager.importAll(exportedData);
    console.log('Data imported back. Stats after import:');
    console.log('- Response count:', storageManager.getResponseStore().getStats().size);
    console.log('- Snapshot count:', storageManager.getSnapshotStore().getStats().count);
    console.log('- Variable count:', storageManager.getVariableStore().getStats().total);
    console.log();
    
    // 8. Storage Statistics
    console.log('8. Overall Storage Statistics');
    const overallStats = storageManager.getStats();
    console.log('Overall stats:', JSON.stringify(overallStats, null, 2));
    console.log();
    
    // Cleanup
    await storageManager.destroy();
    console.log('✅ Storage Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Storage Demo failed:', error);
  }
}

// Run the demo
runStorageDemo();