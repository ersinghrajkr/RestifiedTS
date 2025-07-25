# Changelog

All notable changes to RestifiedTS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-07-24

### Added
- **Fluent DSL Architecture** - Clean `given().when().then()` syntax inspired by RestAssured
- **TypeScript First Design** - Full type safety and IntelliSense support throughout
- **Multi-Protocol Support** - REST APIs, GraphQL endpoints, and WebSocket connections
- **Multi-Client Architecture** - Test multiple services within a single test suite
- **Variable Resolution System** - Dynamic data with Faker.js integration and template variables
- **Comprehensive Authentication** - Bearer tokens, Basic auth, API keys, and OAuth2 support
- **Performance Testing** - Response time assertions and concurrent load testing
- **Schema Validation** - JSON Schema and Zod validation support
- **Snapshot Testing** - Compare API responses against saved baselines
- **Advanced Reporting** - HTML reports with diff visualization and execution metrics
- **CLI Tools** - Generate test templates and initialize project structure

### Features

#### Core DSL
- Double execute pattern for clean request/assertion separation
- Fluent method chaining with proper TypeScript types
- Context-aware variable resolution
- Extensible assertion engine

#### Authentication & Security
- Bearer token authentication with automatic refresh
- Basic authentication with credential encoding
- API key authentication (header and query parameter)
- OAuth2 client credentials flow
- Custom authentication provider support

#### Multi-Client Support
- Named client instances for different services
- Per-client configuration (timeouts, headers, retry logic)
- Service discovery and dynamic client creation
- Cross-service integration testing

#### Variable System
- Global and local variable scopes
- Faker.js integration with v8+ syntax support
- Built-in placeholders (random UUIDs, timestamps, math functions)
- Environment variable resolution
- JSONPath-based data extraction

#### Testing Capabilities
- Response time assertions and performance monitoring
- Concurrent request execution and load testing
- WebSocket connection management and message testing
- GraphQL query and mutation support
- Custom assertion methods and schema validation
- Snapshot comparison with diff reporting

#### CLI and Tooling
- Interactive test generation wizard
- Modern test templates with best practices
- Project scaffolding and configuration setup
- Integration with popular test runners (Mocha, Jest)

### Technical

#### TypeScript Configuration
- ES2020 target with modern JavaScript features
- Strict type checking and null safety
- Experimental decorators for test tagging
- Path mapping for clean imports
- Comprehensive type definitions

#### Architecture
- Domain-driven design with clear separation of concerns
- Singleton pattern for resource management
- Plugin system for extensibility
- Event-driven execution pipeline
- Proper resource cleanup to prevent memory leaks

#### Testing Framework Integration
- Full Mocha compatibility with `this` context preservation
- Chai integration for additional assertions
- Test tagging system (@smoke, @regression, @integration)
- Parallel test execution support
- Comprehensive error handling and reporting

### Bug Fixes
- Fixed process hanging issues with proper cleanup mechanisms
- Resolved arrow function compatibility issues with Mocha
- Fixed variable resolution edge cases
- Corrected TypeScript compilation errors
- Improved error messages and stack traces

### Documentation
- Comprehensive getting started guide
- Complete API reference documentation
- Advanced configuration examples
- Multi-service integration patterns
- Troubleshooting guide with common solutions
- NPM publishing workflow documentation

### Dependencies
- axios: ^1.6.5 - HTTP client with retry logic
- @faker-js/faker: ^8.4.1 - Dynamic data generation
- chai: ^4.3.10 - Assertion library
- commander: ^11.1.0 - CLI framework
- ws: ^8.16.0 - WebSocket client
- graphql-request: ^6.1.0 - GraphQL client
- zod: ^4.0.5 - Schema validation
- jsonpath: ^1.1.1 - JSONPath expressions
- handlebars: ^4.7.8 - Template processing

### Development Dependencies
- typescript: ^5.3.3 - TypeScript compiler
- mocha: ^10.2.0 - Test runner
- @types/chai: ^4.3.11 - Chai type definitions
- eslint: ^8.56.0 - Code linting
- prettier: ^3.1.1 - Code formatting

### Breaking Changes
- Requires Node.js 18+ for modern JavaScript features
- Double execute pattern is mandatory (not backward compatible)
- Faker.js v8+ syntax required for variable resolution
- Arrow functions not supported in test definitions (Mocha compatibility)

### Migration Guide
See [RESTIFIEDTS-GUIDE.md](./RESTIFIEDTS-GUIDE.md) for detailed migration instructions from previous versions or other testing frameworks.

---

## Future Releases

### Planned Features
- Database integration testing
- Advanced reporting dashboard
- Performance benchmarking
- CI/CD pipeline integrations
- Docker container testing
- gRPC protocol support

---

RestifiedTS v1.0.0 represents a complete, production-ready API testing framework built from the ground up with TypeScript and modern development practices.