# RestifiedTS Examples

This directory contains comprehensive examples demonstrating how to use RestifiedTS for various API testing scenarios, from basic HTTP requests to complex microservices architectures.

## 📁 Directory Structure

```
examples/
├── 01-basic-usage/                    # Basic API testing examples
│   ├── simple-get-request.ts
│   ├── post-with-json.ts
│   ├── query-parameters.ts
│   └── response-validation.ts
├── 02-advanced-dsl/                   # Advanced DSL features
│   ├── variable-resolution.ts
│   ├── response-extraction.ts
│   └── conditional-logic.ts
├── 03-authentication/                 # Authentication examples
│   ├── bearer-token.ts
│   ├── basic-auth.ts
│   ├── oauth2-flow.ts
│   └── custom-auth.ts
├── 04-graphql/                       # GraphQL testing examples
│   ├── basic-queries.ts
│   ├── mutations.ts
│   ├── subscriptions.ts
│   └── schema-validation.ts
├── 05-websocket/                     # WebSocket testing examples
│   ├── basic-websocket.ts
│   ├── message-patterns.ts
│   └── websocket-auth.ts
├── 06-database/                      # Database interaction examples
│   ├── setup-teardown.ts
│   ├── data-validation.ts
│   └── transaction-testing.ts
├── 07-configuration/                 # Configuration examples
│   ├── environment-configs.ts
│   ├── multiple-clients.ts
│   └── custom-interceptors.ts
├── 08-microservices/                 # Microservices architecture examples
│   ├── service-discovery.ts
│   ├── circuit-breaker.ts
│   ├── distributed-tracing.ts
│   └── cross-service-testing.ts
├── 09-testing-patterns/              # Testing patterns and best practices
│   ├── test-organization.ts
│   ├── data-driven-tests.ts
│   ├── parallel-execution.ts
│   └── test-reporting.ts
├── 10-real-world-scenarios/          # Complete real-world examples
│   ├── e-commerce-api/
│   ├── social-media-api/
│   └── banking-api/
└── config/                          # Configuration files for examples
    ├── development.json
    ├── staging.json
    └── production.json
```

## 🚀 Getting Started

### Prerequisites
```bash
npm install
npm run build
```

### Basic Example
```typescript
import { RestifiedTS } from '../src';

// Simple GET request
await RestifiedTS
  .given()
    .baseUrl('https://jsonplaceholder.typicode.com')
  .when()
    .get('/posts/1')
  .then()
    .statusCode(200)
    .jsonPath('$.userId', 1)
  .execute();
```

## 📋 Example Categories

### 1. **Basic Usage** (`01-basic-usage/`)
Learn the fundamentals of RestifiedTS with simple examples covering:
- GET, POST, PUT, DELETE requests
- Basic authentication
- Response validation
- Error handling

### 2. **Configuration** (`02-configuration/`)
Master configuration management with examples for:
- Environment-based configuration
- Proxy and SSL setup
- Retry and timeout policies
- Global configuration patterns

### 3. **Authentication** (`03-authentication/`)
Comprehensive authentication examples including:
- Bearer token authentication
- Basic authentication
- OAuth2 flows
- Custom authentication strategies
- Token refresh mechanisms

### 4. **HTTP Client** (`04-http-client/`)
Advanced HTTP client usage covering:
- Multiple client instances
- Connection pooling
- Request/response interceptors
- Custom headers and middleware

### 5. **Validation** (`05-validation/`)
Advanced validation techniques including:
- JSON path validation
- XML/SOAP validation
- Schema validation
- Custom matchers
- Snapshot testing

### 6. **Data Management** (`06-data-management/`)
Data handling and management examples:
- Variable scoping and resolution
- Data extraction from responses
- Template processing
- File upload/download handling

### 7. **Advanced Testing** (`07-advanced-testing/`)
Advanced testing capabilities:
- Performance and load testing
- Contract testing
- Data-driven testing
- Scenario-based testing

### 8. **Microservices** (`08-microservices/`)
Microservices architecture testing:
- Service discovery
- Distributed tracing
- Circuit breaker patterns
- Cross-service communication

### 9. **GraphQL** (`09-graphql/`)
GraphQL API testing examples:
- Queries and mutations
- Subscriptions
- Schema validation
- Introspection

### 10. **Database** (`10-database/`)
Database interaction examples:
- Database setup and teardown
- Data seeding
- State verification
- Cleanup operations

### 11. **Real-World Scenarios** (`11-real-world-scenarios/`)
Complete application examples:
- E-commerce API testing
- User management systems
- Payment processing
- Order fulfillment workflows

### 12. **Enterprise Features** (`12-enterprise-features/`)
Enterprise-grade features:
- Monitoring and alerting
- Audit logging
- Compliance testing
- Security scanning

## 🔧 Running Examples

### Run Individual Examples
```bash
# Basic usage example
npx ts-node examples/01-basic-usage/simple-get-request.ts

# Authentication example
npx ts-node examples/03-authentication/oauth2-flow.ts

# Microservices example
npx ts-node examples/08-microservices/service-discovery.ts
```

### Run All Examples
```bash
npm run examples
```

### Run Examples by Category
```bash
# Run basic usage examples
npm run examples:basic

# Run microservices examples
npm run examples:microservices

# Run GraphQL examples
npm run examples:graphql
```

## 📚 Documentation

Each example includes:
- **Detailed comments** explaining the code
- **Prerequisites** and setup instructions
- **Expected outcomes** and assertions
- **Troubleshooting** tips
- **Related documentation** links

## 🤝 Contributing

To add new examples:
1. Create a new file in the appropriate category folder
2. Follow the existing naming convention
3. Include comprehensive comments and documentation
4. Add any required test data to the `common/test-data/` folder
5. Update this README if adding a new category

## 📖 Additional Resources

- [RestifiedTS Documentation](../docs/)
- [API Reference](../docs/api-reference/)
- [Architecture Guide](../docs/architecture/)
- [Best Practices](../docs/best-practices/)

## 🐛 Issues and Support

If you encounter issues with any examples:
1. Check the troubleshooting section in the example file
2. Review the [FAQ](../docs/faq.md)
3. Search existing [issues](https://github.com/your-org/restifiedts/issues)
4. Create a new issue with detailed information

## 📝 License

These examples are part of the RestifiedTS project and are licensed under the same terms as the main project.