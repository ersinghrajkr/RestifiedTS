# RestifiedTS Project

This project was initialized with RestifiedTS CLI for API testing.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Update configuration in `config/default.json` with your API settings.

3. Run the sample tests:
   ```bash
   npm test
   ```

## Project Structure

- `tests/integration/` - Integration tests for APIs
- `tests/unit/` - Unit tests
- `tests/setup/` - Global setup and teardown
- `tests/fixtures/` - Test data and utilities
- `config/` - Environment-specific configurations

## Commands

- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:smoke` - Run smoke tests (@smoke tagged)
- `npm run test:regression` - Run regression tests (@regression tagged)
- `npm run test:coverage` - Run tests with coverage report

## Generating New Tests

Use RestifiedTS CLI to generate new test files:

```bash
# Generate API test
npx restifiedts generate --type api --name UserAPI

# Generate GraphQL test
npx restifiedts generate --type graphql --name UserGraphQL

# Scaffold complete service
npx restifiedts scaffold --service UserService --include-graphql
```

## Documentation

- [RestifiedTS Documentation](https://github.com/restifiedts)
- [API Testing Best Practices](https://github.com/restifiedts/docs)

## License

MIT
