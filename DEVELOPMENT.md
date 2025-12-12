# Development Setup

## Prerequisites

- Node.js 16+
- npm or yarn
- VS Code

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile TypeScript:
   ```bash
   npm run compile
   ```

## Development

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test the extension in the new VS Code window

## Building

Create .vsix package:
```bash
npm run package
# OR
npx vsce package
```

## Testing

### System Dependencies (Linux only)

On Linux, VS Code's test runner requires several system libraries. Install the build dependencies:

**Debian/Ubuntu:**
```bash
sudo apt-get update
sudo apt-get install libx11-dev libxkbfile-dev libcairo2-dev libgtk-3-0
```

**Fedora/RHEL/CentOS:**
```bash
sudo dnf install libX11-devel libxkbfile-devel cairo-devel gtk3
```

### Running Tests

```bash
npm test
```

### Test Coverage

Generate coverage report:

```bash
npx c8 --reporter=text --reporter=html npm test
```

**Important**: Clean up coverage artifacts after running:
```bash
rm -rf coverage/
```

**Coverage goals**:
- Overall: >85%
- Function coverage: 100% (all functions tested)
- configurationManager.ts: 100%
- terminalDetector.ts: 100%
- Core modules (extension.ts, processDetector.ts): >80%

The test suite includes:
- Property-based testing (100 random iterations)
- Integration tests for copyReference() and formatReference()
- Edge cases (Unicode, empty paths, large numbers)

## Manual Installation

1. Build the .vsix file (see above)
2. In VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Select the generated .vsix file
4. Reload VS Code when prompted

## Publishing

### Setup (one-time)
1. Create account at https://marketplace.visualstudio.com/
2. Create publisher/organization at https://marketplace.visualstudio.com/manage/publishers
3. Generate Personal Access Token at https://dev.azure.com/ (User settings → Personal access tokens, Marketplace scope)
4. Authenticate: `npx vsce login <publisher-name>`

### Publish Release
Publish with version increment:
```bash
npx vsce publish patch    # Bug fixes: 1.0.0 → 1.0.1
npx vsce publish minor    # New features: 1.0.0 → 1.1.0
npx vsce publish major    # Breaking changes: 1.0.0 → 2.0.0
```

This updates the version and publishes in one command. The extension will appear on the Marketplace within minutes.

## Project Structure

```
├── src/
│   ├── extension.ts          # Main extension code
│   └── test/                 # Test files
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
├── README.md                # Marketplace documentation
├── INSTALL.md               # Installation instructions
└── DEVELOPMENT.md           # This file
```
