# Technology Stack

## Core Technologies
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 20.x
- **Module System**: CommonJS
- **Target**: ES2020

## Development Tools
- **TypeScript Compiler**: tsc (for building)
- **Development Runtime**: ts-node (for running without compilation)

## Project Configuration
- **tsconfig.json**: 
  - Strict mode enabled
  - Source maps enabled
  - Declaration files generated
  - Force consistent casing in file names

## Data Storage
- SQLite database (cipher-sessions.db in data/ directory)

## Dependencies
Current dependencies (from package.json):
- @types/node: ^20.0.0
- typescript: ^5.0.0
- ts-node: ^10.0.0

## Not Yet Configured
- Testing framework (needs to be added)
- Linting tool (ESLint recommended)
- Code formatter (Prettier recommended)
- CI/CD pipeline
