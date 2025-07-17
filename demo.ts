/**
 * Simple demo of RestifiedTS functionality
 */

import { RestifiedTS } from './src/core/dsl/RestifiedTS';

async function runDemo() {
  console.log('🚀 Starting RestifiedTS Demo');
  
  try {
    // Create a RestifiedTS instance
    const restified = new RestifiedTS({
      baseURL: 'https://jsonplaceholder.typicode.com',
      timeout: 5000,
      logging: {
        level: 'info'
      }
    });

    console.log('✅ RestifiedTS instance created successfully');
    
    // Test basic functionality
    console.log('Configuration:', restified.getConfig());
    console.log('Session Info:', restified.getSessionInfo());
    
    // Test variable management
    restified.setGlobalVariable('userId', 123);
    restified.setGlobalVariable('testName', 'RestifiedTS Demo');
    
    console.log('Global variables:', restified.getAllGlobalVariables());
    
    console.log('🎉 Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
runDemo();