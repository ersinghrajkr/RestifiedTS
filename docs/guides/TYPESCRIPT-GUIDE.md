# TypeScript Developer Guide for RestifiedTS

This guide is specifically designed to help TypeScript developers get the best IntelliSense and type safety experience when using RestifiedTS.

## 🎯 Enhanced TypeScript Support

RestifiedTS provides comprehensive TypeScript definitions with detailed JSDoc comments, examples, and parameter descriptions to ensure excellent IDE support.

## 🔧 IDE Configuration

### VS Code Setup

For the best experience in VS Code, ensure you have:

1. **TypeScript Extension** - Usually built-in
2. **IntelliSense Enabled** - Should work by default
3. **Proper tsconfig.json** configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### JetBrains IDEs (WebStorm/IntelliJ)

1. Ensure TypeScript service is enabled
2. Set TypeScript language version to match your project
3. Enable type checking in your IDE settings

## 📚 Type Definitions Overview

RestifiedTS exports comprehensive type definitions with detailed JSDoc comments:

```typescript
import { 
  // Main framework
  restified, 
  RestifiedTS,
  
  // DSL interfaces with comprehensive JSDoc documentation
  IGivenStep, 
  IWhenStep, 
  IThenStep,
  
  // Configuration types
  RestifiedConfig,
  
  // Response types
  RestifiedResponse
} from 'restifiedts';
```

## 🎨 IntelliSense Features

### Method Completion

When you type `restified.given().`, IntelliSense will show:

- **Method names** with descriptions
- **Parameter types** and constraints
- **Return types** for chaining
- **Usage examples** in hover documentation

### Parameter Hints

```typescript
// IntelliSense shows parameter types and descriptions
restified.given()
  .baseURL(url: string)           // Shows: "Set the base URL for the API request"
  .timeout(ms: number)            // Shows: "Set the request timeout in milliseconds"
  .bearerToken(token: string)     // Shows: "Set Bearer Token Authentication"
  .body(body: any)               // Shows: "Set the request body (automatically serialized)"
```

### Type Safety

```typescript
// TypeScript catches type errors at compile time
restified.given()
  .timeout("5000")      // ❌ Error: Argument of type 'string' is not assignable to parameter of type 'number'
  .timeout(5000)        // ✅ Correct

// Status code validation
response
  .statusCode("200")    // ❌ Error: Expected number, got string
  .statusCode(200)      // ✅ Correct
```

## 🔍 Common IntelliSense Patterns

### 1. Fluent API Chaining

```typescript
// IntelliSense guides you through the fluent chain
const response = await restified
  .given()              // IntelliSense shows Given step methods
    .baseURL('...')     // Returns IGivenStep
    .bearerToken('...')  // Returns IGivenStep
    .body({...})        // Returns IGivenStep
  .when()               // IntelliSense shows When step methods
    .post('/users')     // Returns IWhenStep
    .execute()          // Returns Promise<IThenStep>

await response          // IntelliSense shows Then step methods
  .statusCode(201)      // Returns IThenStep
  .jsonPath('$.id')     // IntelliSense shows available assertion methods
  .execute();           // Returns Promise<void>
```

### 2. Configuration Object Types

```typescript
// Configuration objects have full type definitions
const config: RestifiedConfig = {
  baseURL: 'https://api.example.com',
  timeout: 30000,           // number
  headers: {                // Record<string, string>
    'Content-Type': 'application/json'
  },
  auth: {                   // Authentication configuration
    type: 'bearer',         // 'basic' | 'bearer' | 'oauth2' | 'apikey' | 'custom'
    token: 'your-token'
  },
  retry: {                  // Retry configuration
    retries: 3,             // number
    retryDelay: 1000,       // number
    retryOnStatusCodes: [500, 502, 503] // number[]
  }
};
```

### 3. Variable Template Types

```typescript
// Template variables are properly typed
restified.given()
  .body({
    id: '{{$random.uuid}}',           // string template
    name: '{{$faker.person.fullName}}', // string template
    createdAt: '{{$date.now}}',       // string template
    score: '{{$math.random(1,100)}}'  // string template
  });
```

## 🛠️ Advanced TypeScript Features

### 1. Generic Types for Custom Assertions

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Type-safe response access
const response = await restified.given()...execute();
await response.statusCode(200).execute();

// Access typed response data
const userData: User = response.response.data;
```

### 2. Type Guards and Utility Types

```typescript
import { RestifiedConfig } from 'restifiedts';

// Utility type for partial configuration
type ConfigUpdate = Partial<RestifiedConfig>;

// Type guard for authentication
function hasAuth(config: RestifiedConfig): config is RestifiedConfig & { auth: NonNullable<RestifiedConfig['auth']> } {
  return config.auth !== undefined;
}
```

### 3. Custom Type Extensions

```typescript
// Extend RestifiedTS types for your specific use case
interface CustomGivenStep extends IGivenStep {
  customAuth(token: string): IGivenStep;
  customHeader(value: string): IGivenStep;
}

// Create typed wrapper
class CustomRestified extends RestifiedTS {
  given(): CustomGivenStep {
    // Custom implementation
    return super.given() as CustomGivenStep;
  }
}
```

## 🔧 Troubleshooting IntelliSense Issues

### Issue 1: Missing Type Definitions

**Problem**: IntelliSense not showing method suggestions

**Solution**:
```typescript
// Ensure proper import
import { restified, RestifiedTS } from 'restifiedts';

// Check TypeScript version
// RestifiedTS requires TypeScript 4.5+
```

### Issue 2: Incomplete Method Information

**Problem**: Method signatures not showing parameter details

**Solution**:
1. Update to latest RestifiedTS version
2. Restart TypeScript service in your IDE
3. Clear IDE cache and reload

### Issue 3: Generic Type Issues

**Problem**: Response types not properly inferred

**Solution**:
```typescript
// Explicitly type the response if needed
const response: AxiosResponse<User> = await restified
  .given()...execute().then(r => r.response);
```

## 📖 Best Practices

### 1. Always Use Type Imports

```typescript
// ✅ Good - Import types explicitly
import { RestifiedConfig, IGivenStep } from 'restifiedts';

// ❌ Avoid - Generic imports lose type information
import * as RestifiedTS from 'restifiedts';
```

### 2. Leverage IntelliSense for Discovery

- Use Ctrl+Space (Cmd+Space on Mac) to trigger completions
- Hover over methods to see documentation
- Use Ctrl+Click to jump to type definitions

### 3. Configure Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 4. Use Type Assertions Carefully

```typescript
// ✅ Good - When you know the type
const userData = response.response.data as User;

// ❌ Avoid - Generic any defeats type safety
const userData = response.response.data as any;
```

## 🎯 Examples with Full Type Support

### Example 1: Complete Type-Safe Test

```typescript
import { restified, RestifiedConfig } from 'restifiedts';
import { expect } from 'chai';

interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
}

interface CreateUserResponse {
  id: number;
  name: string;
  email: string;
  age: number;
  createdAt: string;
}

describe('Type-Safe User API Tests', function() {
  afterAll(async function() {
    await restified.cleanup();
  });

  it('should create user with full type safety', async function() {
    this.timeout(10000);
    
    const userData: CreateUserRequest = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    };
    
    const response = await restified
      .given()
        .baseURL('https://api.example.com')
        .header('Content-Type', 'application/json')
        .bearerToken(process.env.AUTH_TOKEN!)
        .body(userData)
      .when()
        .post('/users')
        .execute();

    await response
      .statusCode(201)
      .jsonPath('$.name', userData.name)
      .jsonPath('$.email', userData.email)
      .jsonPath('$.age', userData.age)
      .extract('$.id', 'userId')
      .execute();

    // Type-safe access to response data
    const createdUser: CreateUserResponse = response.response.data;
    expect(createdUser.id).to.be.a('number');
    expect(createdUser.name).to.equal(userData.name);
  });
});
```

### Example 2: Configuration with Full Types

```typescript
import { RestifiedConfig } from 'restifiedts';

const apiConfig: RestifiedConfig = {
  baseURL: 'https://api.example.com',
  timeout: 30000,
  headers: {
    'User-Agent': 'RestifiedTS/1.0.0',
    'Accept': 'application/json'
  },
  auth: {
    type: 'bearer',
    token: process.env.AUTH_TOKEN || ''
  },
  retry: {
    retries: 3,
    retryDelay: 1000,
    retryOnStatusCodes: [500, 502, 503, 504]
  },
  proxy: process.env.HTTP_PROXY ? {
    host: new URL(process.env.HTTP_PROXY).hostname,
    port: parseInt(new URL(process.env.HTTP_PROXY).port),
    protocol: 'http'
  } : undefined
};

// TypeScript ensures all required fields are present and correctly typed
const restifiedInstance = new RestifiedTS(apiConfig);
```

## 🚀 IDE-Specific Tips

### VS Code

1. **Install Extensions**:
   - TypeScript Importer
   - Auto Import - ES6, TS, JSX, TSX
   - Path Intellisense

2. **Settings**:
   ```json
   {
     "typescript.suggest.autoImports": true,
     "typescript.suggest.includeCompletionsForModuleExports": true,
     "typescript.suggestionActions.enabled": true
   }
   ```

### WebStorm/IntelliJ

1. Enable "TypeScript Language Service"
2. Set "Use TypeScript service" to true
3. Configure "Automatic imports" in Editor > General > Auto Import

### Sublime Text

1. Install TypeScript plugin
2. Configure LSP (Language Server Protocol)
3. Enable auto-completion

## 📋 Quick Reference

### Essential Imports
```typescript
import { 
  restified,           // Main instance
  RestifiedTS,         // Class for custom instances
  RestifiedConfig      // Configuration interface
} from 'restifiedts';
```

### Key Interfaces (All with Comprehensive JSDoc)
- `IGivenStep` - Request configuration methods with detailed documentation
- `IWhenStep` - HTTP method execution with usage examples
- `IThenStep` - Response assertions and data extraction with examples
- `RestifiedConfig` - Framework configuration with parameter descriptions
- `RestifiedResponse` - Response wrapper with type information

### Common Patterns
```typescript
// Basic test
const response = await restified.given()...when()...execute();
await response.statusCode(200).execute();

// Multi-client
restified.createClient('api', {...});
const response = await restified.given().useClient('api')...

// Configuration
restified.updateConfig({...});
const config = restified.getConfig();
```

This guide ensures you get the maximum benefit from TypeScript's type system when using RestifiedTS!