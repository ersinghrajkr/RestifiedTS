# RestifiedTS Examples

This directory contains examples and demonstrations of RestifiedTS features.

## Structure

### `/examples/` - Usage Examples
- **k6-faker-integration.example.ts** - Shows how to use xk6-faker compatible integration
- **k6-integration-usage.example.ts** - K6 performance testing examples  
- **k6-typescript-integration.example.ts** - TypeScript K6 integration
- **playwright-style-usage.example.ts** - Playwright-style configuration
- **restified.config.example.ts** - Configuration file examples
- **xk6-faker-pattern.example.ts** - xk6-faker compatibility patterns
- **enterprise-endpoints-with-data.ts** - Complex enterprise endpoint examples

### `/examples/tests/` - Demo Tests and Examples
- **demo-enterprise-features.ts** - Comprehensive enterprise feature demonstration
- **test-enterprise-features.ts** - Enterprise feature testing examples
- **enterprise-data-generation.test.ts** - Data generation examples
- **enterprise-multi-service.test.ts** - Multi-service testing examples
- **comprehensive-features.test.ts** - Full feature showcase
- **comprehensive-reporting.test.ts** - Reporting examples
- **enterprise/** - Enterprise feature test examples

## Usage

These files are for reference and demonstration purposes. They show how to use various RestifiedTS features in real-world scenarios.

### Running Examples

```bash
# Run a demo
npx ts-node examples/tests/demo-enterprise-features.ts

# Run enterprise tests
npx ts-node examples/tests/test-enterprise-features.ts
```

### Note

The files in `/examples/tests/` may have dependencies on enterprise modules that require additional setup. They are provided as examples of advanced usage patterns.