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

## Manual Installation

1. Build the .vsix file (see above)
2. In VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Select the generated .vsix file
4. Reload VS Code when prompted

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
