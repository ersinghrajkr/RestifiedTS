# Changelog

All notable changes to RestifiedTS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2025-07-26

### 🔧 Bug Fixes

#### **Double Execute Pattern Corrections**
- **Fixed**: Comprehensive features test now uses proper double execute pattern
- **Fixed**: All DSL chains properly separated between request execution and assertion execution
- **Improved**: Consistent API usage patterns across all generated tests and examples

#### **API Testing Reliability**
- **Enhanced**: Authentication flow in comprehensive test with proper request/assertion separation
- **Enhanced**: Performance testing with correct async execution patterns
- **Enhanced**: Security testing with proper error handling patterns

### 📋 Technical Details

The comprehensive features demo and all CLI-generated tests now consistently follow RestifiedTS's double execute pattern:

```typescript
// ✅ Correct Pattern (v1.2.1)
const response = await restified
  .given().baseURL('https://api.example.com')
  .when().get('/posts/1')
  .execute(); // First execute() - sends the request

await response
  .statusCode(200)
  .jsonPath('$.title').isString()
  .execute(); // Second execute() - runs assertions
```

This ensures reliable request execution and proper assertion handling across all framework features.

**Migration**: No breaking changes - existing code continues to work unchanged.

---

## [1.2.0] - 2025-07-26

### 🌟 Major Features Added

#### **Comprehensive Features Demo**
- **NEW**: Complete comprehensive test showcasing ALL RestifiedTS features in a single production-ready example
- **Features Demonstrated**: Configuration management, authentication flows, variable templating, multi-client management, performance testing, security testing, database integration, GraphQL/WebSocket testing, snapshot testing, report generation, error handling, and logging
- **Production Patterns**: Realistic authentication workflows with token management, concurrent API testing, and complete setup/teardown patterns

#### **Enhanced CLI Capabilities**
- **NEW**: `--type comprehensive` option for generating complete feature demonstrations
- **Improved**: CLI templates now use proper RestifiedTS API methods (`setGlobalVariable`, `getGlobalVariable`, etc.)
- **Enhanced**: All CLI-generated tests follow production-ready patterns and conventions

#### **Advanced Configuration Management**
- **NEW**: JSON file configuration loading support
- **NEW**: Environment variable configuration patterns
- **NEW**: Runtime configuration updates and merging
- **Improved**: Configuration validation and error handling

#### **Database Integration Enhancements**
- **Enhanced**: Mock database implementation with advanced SQL operation support
- **NEW**: Transaction rollback with proper deep copying
- **NEW**: SQL IN clause support for array parameters
- **NEW**: Mathematical SQL operations support
- **Improved**: Database connection lifecycle management

#### **Variable Resolution System Improvements**
- **Enhanced**: Template variable processing with built-in function support
- **NEW**: `$date.iso`, `$math.pi`, `$string.*` functions
- **NEW**: Nested object and array access in templates
- **Improved**: Cycle detection and error handling in template resolution

#### **Authentication & Security**
- **NEW**: Complete authentication flow examples (login → token → refresh)
- **NEW**: Security testing patterns with input validation
- **NEW**: Authentication token management and refresh workflows
- **Enhanced**: Bearer token authentication with global variable integration

#### **Performance & Load Testing**
- **NEW**: Concurrent request testing with performance metrics
- **NEW**: Load testing patterns with 10+ simultaneous requests
- **NEW**: Performance validation and timeout testing
- **Enhanced**: Response time measurement and reporting

#### **Testing Framework Enhancements**
- **NEW**: GraphQL testing patterns and endpoint configuration
- **NEW**: WebSocket testing with connection management and messaging
- **NEW**: Snapshot testing with response comparison
- **NEW**: Complete error handling and recovery patterns
- **Enhanced**: Logging and audit trail capabilities

### 🔧 Technical Improvements

#### **API Consistency**
- **Fixed**: All internal tests now use proper RestifiedTS API methods instead of internal methods
- **Standardized**: Consistent usage of `setGlobalVariable`/`getGlobalVariable` throughout
- **Improved**: Type safety and IntelliSense support for all public APIs

#### **Build & Development**
- **Enhanced**: TypeScript compilation with proper path resolution
- **Improved**: CLI binary configuration and distribution
- **Fixed**: Module resolution issues in test environments

#### **Documentation & Examples**
- **NEW**: Comprehensive documentation updates reflecting v1.2.0 features
- **Enhanced**: README with detailed comprehensive features demo section
- **Improved**: Code examples using latest API patterns

### 📦 Package Improvements

#### **Distribution**
- **Enhanced**: Package metadata with comprehensive keyword coverage
- **Improved**: CLI tooling distribution and installation
- **Optimized**: Build output size and structure

#### **Dependencies**
- **Updated**: Development tooling and testing dependencies
- **Maintained**: Zero breaking changes to existing APIs
- **Enhanced**: TypeScript support and type definitions

### 🚀 Migration Guide

This release is **fully backward compatible**. No breaking changes were introduced.

**New Features to Explore:**
```bash
# Generate comprehensive features demo
npx restifiedts generate --type comprehensive --name my-demo

# Run existing comprehensive test
npm test -- --grep "comprehensive"
```

**Recommended Updates:**
- Update any direct usage of internal methods to public APIs
- Explore new comprehensive test patterns for learning best practices
- Consider adopting new configuration management patterns

---

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