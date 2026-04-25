# Suggested Commands

## Build and Run Commands

### Build the project
```bash
npm run build
```
Compiles TypeScript files from `src/` to JavaScript in `dist/` directory.

### Run in development mode
```bash
npm run dev
```
Runs the application directly from TypeScript source using ts-node.

### Run in production mode
```bash
npm start
```
Runs the compiled JavaScript from `dist/index.js` (requires build first).

## Package Management

### Install dependencies
```bash
npm install
```

### Add a new dependency
```bash
npm install <package-name>
```

### Add a new dev dependency
```bash
npm install -D <package-name>
```

## Git Commands (Windows)

### Check status
```bash
git status
```

### Stage changes
```bash
git add .
```

### Commit changes
```bash
git commit -m "commit message"
```

### Push to remote
```bash
git push
```

## File Operations (Windows)

### List directory contents
```bash
dir
# or
ls  # if using Git Bash
```

### Find files
```bash
dir /s /b *.ts
# or
find . -name "*.ts"  # if using Git Bash
```

### Search in files
```bash
findstr /s /i "search term" *.ts
# or
grep -r "search term" .  # if using Git Bash
```

## TypeScript Specific

### Check for type errors without building
```bash
npx tsc --noEmit
```

### Watch mode (auto-rebuild on changes)
```bash
npx tsc --watch
```
