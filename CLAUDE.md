# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RestifiedTS is a production-grade API testing framework built in TypeScript, inspired by Java's RestAssured. It provides a fluent DSL for testing REST APIs, GraphQL endpoints, and WebSocket connections with comprehensive features including multi-client support, snapshot testing, variable resolution, and extensive reporting capabilities.

## Common Development Commands

### Build and Development
- `npm run build` - Compile TypeScript to JavaScript in `dist/` directory
- `npm run build:watch` - Watch mode compilation
- `npm run dev` - Run development version with ts-node
- `npm run clean` - Remove `dist/` directory

### Testing
- `npm test` - Run all tests with Mocha
- `npm run test:unit` - Run unit tests only (`tests/unit/`)
- `npm run test:integration` - Run integration tests only (`tests/integration/`)
- `npm run test:smoke` - Run tests tagged with `@smoke`
- `npm run test:regression` - Run tests tagged with `@regression`
- `npm run test:coverage` - Run tests with NYC coverage reporting

### Code Quality
- `npm run lint` - Run ESLint on source and test files
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier

### CLI and Utilities
- `npm run cli` - Run the RestifiedTS CLI tool
- `npm run generate-test` - Generate test templates using CLI
- `npm run mock-server` - Start JSON mock server on port 3001
- `npm run docs:generate` - Generate TypeDoc documentation
- `npm run report:html` - Generate Mochawesome HTML reports

## Core Architecture

RestifiedTS follows a layered architecture with these key components:

### DSL Layer (`src/core/dsl/`)
- **RestifiedTS.ts** - Main framework entry point and orchestrator
- **GivenStep.ts** - Fluent test setup (headers, auth, variables, timeouts)
- **WhenStep.ts** - HTTP request execution with variable resolution
- **ThenStep.ts** - Response assertions and data extraction

### Client Layer (`src/core/clients/`)
- **HttpClient.ts** - Axios-based HTTP client with retry logic and interceptors
- **GraphQLClient.ts** - GraphQL query and mutation support
- **WebSocketClient.ts** - WebSocket connection management and testing
- **ClientManager.ts** - Multi-service client management

### Storage Systems (`src/core/stores/`)
- **VariableStore.ts** - Global/local variable management with scope resolution
- **ResponseStore.ts** - HTTP response caching and retrieval
- **SnapshotStore.ts** - Response snapshot storage for comparison testing

### Authentication (`src/core/auth/`)
- **AuthProvider.ts** - Base authentication interface
- **BearerAuth.ts** - Bearer token authentication
- **BasicAuth.ts** - Basic authentication with credential encoding

## Key Features and Usage Patterns

### Fluent DSL Pattern
The framework uses a fluent `given().when().then()` pattern:

```typescript
await restified
  .given()
    .baseURL('https://api.example.com')
    .header('Authorization', 'Bearer {{token}}')
    .variable('userId', '12345')
  .when()
    .get('/users/{{userId}}')
    .execute()
  .then()
    .statusCode(200)
    .jsonPath('$.name', 'Expected Name')
    .extract('$.id', 'extractedId');
```

### Variable Resolution System
- Uses `{{variableName}}` syntax for template variables
- Supports Faker.js integration: `{{$faker.name.fullName}}`
- Built-in placeholders: `{{$random.uuid}}`, `{{$date.now}}`, `{{$math.random(1,100)}}`
- Environment variables: `{{$env.NODE_ENV}}`

### Multi-Client Architecture
Supports multiple API clients for testing different services:

```typescript
restified.createClient('authService', { baseURL: 'https://auth.example.com' });
restified.createClient('userService', { baseURL: 'https://users.example.com' });
```

### Test Tagging System
Uses TypeScript decorators for test organization:
- `@smoke` - Critical functionality tests
- `@regression` - Full regression suite
- `@integration` - Cross-service integration tests
- Custom tags with `@tag('custom-name')`

## TypeScript Configuration

The project uses strict TypeScript settings with:
- **Production build** (`tsconfig.json`): Compiles only `src/` for library distribution
- **Test environment** (`tsconfig.test.json`): Includes both `src/` and `tests/` for test compilation
- Path mapping for clean imports (`@core/*`, `@utils/*`, etc.)
- Experimental decorators enabled for test tagging
- Target ES2020 with CommonJS modules
- Declaration files generated for library usage
- Separate rootDir for production (`./src`) and test (`./`) environments

## File Organization Guidelines

### Source Structure (`src/`)
- **assertions/** - Custom Chai matchers and response assertions
- **cli/** - Command-line interface tools
- **core/** - Framework core (DSL, clients, stores, auth, config)
- **decorators/** - Test tagging and metadata management
- **interceptors/** - Request/response interception
- **logging/** - Audit logging and test execution logging
- **reporting/** - HTML and diff report generation
- **types/** - TypeScript type definitions
- **utils/** - Utilities (retry, validation, performance tracking, etc.)

### Test Structure (`tests/`)
- **integration/** - Cross-service integration tests
- **unit/** - Individual component unit tests
- **fixtures/** - Test data, mock responses, and configurations

## Development Guidelines

### When Adding New Features
1. Follow the existing architectural patterns (DSL → Service → Data → Infrastructure layers)
2. Add appropriate TypeScript types in `src/types/RestifiedTypes.ts`
3. Include comprehensive error handling with custom error types
4. Add both unit and integration tests
5. Update exports in `src/index.ts`

### Code Conventions
- Use strict TypeScript settings and explicit return types
- Follow existing import patterns with path mapping
- Implement proper error handling with custom error classes
- Add JSDoc comments for public APIs
- Use async/await for asynchronous operations

### Testing Approach
- Use Mocha as the test runner with ts-node
- Leverage the framework's own DSL for integration tests
- Mock external dependencies in unit tests
- Use test decorators for proper categorization
- Run linting and type checking before commits

## Configuration Management

The framework supports environment-specific configuration through JSON files in `config/` directory. Configuration is loaded hierarchically: defaults → file → environment variables → user overrides.

## Build and Distribution

- Source code in `src/` compiles to `dist/` directory
- Package includes both CommonJS and TypeScript declarations
- CLI tool available as `restifiedts` binary after installation
- Supports both library usage and standalone CLI usage