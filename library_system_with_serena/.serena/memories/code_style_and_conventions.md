# Code Style and Conventions

## TypeScript Configuration
The project uses strict TypeScript configuration with the following key settings:
- **Strict mode**: Enabled (all strict type-checking options)
- **ES Module Interop**: Enabled
- **Force Consistent Casing**: Enabled (important for cross-platform compatibility)

## Naming Conventions

### Files and Directories
- Use kebab-case for file names: `user-service.ts`, `book-repository.ts`
- TypeScript files use `.ts` extension
- Index files for module exports: `index.ts`

### Code Elements
- **Classes**: PascalCase (e.g., `BookRepository`, `UserService`)
- **Interfaces/Types**: PascalCase with 'I' prefix optional (e.g., `User`, `IUser`)
- **Functions/Methods**: camelCase (e.g., `getUserById`, `calculateTotal`)
- **Variables/Constants**: camelCase for variables, UPPER_SNAKE_CASE for constants
- **Private members**: Prefix with underscore optional (e.g., `_privateMethod`)

## Documentation
- Use JSDoc comments for public APIs
- Example from current code:
```typescript
/**
 * Library Management System
 * Main entry point
 */
```

## Code Organization
- **Source directory**: `src/`
- **Build output**: `dist/`
- **Entry point**: `src/index.ts`

## Type Safety
- Always use explicit types when they cannot be inferred
- Avoid `any` type unless absolutely necessary
- Use type assertions sparingly

## Module System
- Use ES6 import/export syntax
- CommonJS output for Node.js compatibility

## Best Practices
- Keep functions small and focused
- Follow SOLID principles
- Write self-documenting code
- Use meaningful variable and function names

## To Be Established
- Linting rules (ESLint configuration needed)
- Formatting rules (Prettier configuration needed)
- Testing conventions (testing framework needed)
