# Contributing to RestifiedTS

Thank you for your interest in contributing to RestifiedTS! This document provides guidelines for contributing to the project.

## 🚀 Quick Start for Contributors

### Prerequisites
- Node.js 18+
- TypeScript 5.3+
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/ersinghrajkr/RestifiedTS.git
cd RestifiedTS

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

## 📝 Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow existing naming conventions
- Use regular functions (not arrow functions) in test examples
- Include proper JSDoc comments for public APIs
- Ensure all examples use the double execute pattern

### Testing Requirements
- Add unit tests for new features
- Include integration tests for end-to-end scenarios
- Ensure all tests use proper cleanup patterns
- Test examples must work with the current DSL

### Commit Guidelines
Follow conventional commits format:
```
feat: add GraphQL mutation support
fix: resolve process hanging issue
docs: update authentication examples
test: add WebSocket integration tests
```

## 🔧 Project Structure

```
src/
├── core/
│   ├── dsl/           # Main DSL implementation
│   ├── clients/       # HTTP, GraphQL, WebSocket clients
│   ├── auth/          # Authentication providers
│   └── stores/        # Variable and response storage
├── cli/               # Command-line interface
├── utils/             # Utility functions
└── types/             # TypeScript definitions

tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── fixtures/          # Test data
```

## 🐛 Bug Reports

When reporting bugs, please include:
- RestifiedTS version
- Node.js version
- Operating system
- Minimal reproduction code
- Expected vs actual behavior

## ✨ Feature Requests

For new features:
- Check existing issues first
- Describe the use case clearly
- Provide example usage
- Consider backward compatibility

## 🔀 Pull Request Process

1. **Fork and Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation if needed

3. **Test Everything**
   ```bash
   npm run build
   npm test
   npm run lint
   ```

4. **Commit and Push**
   ```bash
   git commit -m "feat: add your feature"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Use descriptive title
   - Link related issues
   - Describe changes made
   - Include testing steps

## 📖 Documentation

- Update README.md for user-facing changes
- Update RESTIFIEDTS-GUIDE.md for advanced features
- Include JSDoc comments for new APIs
- Provide working examples

## 🏷️ Release Process

Releases follow semantic versioning:
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

## 🤝 Community

- Be respectful and inclusive
- Help others in discussions
- Share knowledge and experiences
- Follow the code of conduct

## 📞 Contact

For questions about contributing:
- **Email**: [er.singhrajkr@gmail.com](mailto:er.singhrajkr@gmail.com)
- **Issues**: [GitHub Issues](https://github.com/ersinghrajkr/RestifiedTS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ersinghrajkr/RestifiedTS/discussions)

---

**Thank you for helping make RestifiedTS better!** 🚀

*Maintained by Raj Kumar*