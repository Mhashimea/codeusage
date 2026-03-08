# Contributing to Afterburn

Thank you for your interest in contributing to Afterburn! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18+
- npm or pnpm

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/afterburn.git
   cd afterburn
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Run tests:
   ```bash
   npm test
   ```

## Project Structure

```
afterburn/
├── src/
│   ├── cli.ts           # CLI entry point and commands
│   ├── index.ts          # Public API exports
│   ├── analyzer.ts       # Core analysis engine
│   ├── git.ts            # Git integration
│   ├── ai-provider.ts    # AI tool detection
│   ├── llm/              # LLM provider integrations
│   ├── rules/            # Static analysis rules
│   │   ├── index.ts      # Rule runner
│   │   └── ab*.ts        # Individual rule definitions
│   ├── registry/         # Package registry clients
│   └── config/           # Configuration handling
├── test/
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test fixtures
└── docs/                 # Documentation
```

## Adding a New Rule

Rules follow the pattern `AB0XX`. To add a new rule:

1. Create a new file `src/rules/abXXX-rule-name.ts`:
   ```typescript
   import { Rule, Severity } from './types.js';

   export const abXXX: Rule = {
     id: 'ABXXX',
     name: 'Rule Name',
     description: 'What this rule detects',
     severity: Severity.Warning,
     appliesTo: ['.ts', '.js'], // File extensions
     patterns: [
       {
         pattern: /your-regex-here/g,
         message: 'Description of the issue',
       },
     ],
   };
   ```

2. Register the rule in `src/rules/index.ts`

3. Add test fixtures in `test/fixtures/sample-project/src/`

4. Add integration tests in `test/integration/rules.test.ts`

## Code Style

- Use TypeScript with strict mode
- Follow existing code patterns
- Run linting before committing:
  ```bash
  npm run lint:fix
  ```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests once (no watch)
npm run test:run

# Run specific test file
npm test -- src/rules/ab001-credentials.test.ts
```

### Test Requirements

- All new features should have tests
- Integration tests for rules should verify detection accuracy
- Performance tests should not regress

## Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   ```

3. Follow conventional commit messages:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/changes
   - `chore:` - Maintenance tasks

4. Push and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Ensure CI passes before requesting review

## Reporting Issues

When reporting issues, please include:

- Afterburn version (`afterburn --version`)
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Relevant error messages or logs

## License

By contributing to Afterburn, you agree that your contributions will be licensed under the MIT License.
