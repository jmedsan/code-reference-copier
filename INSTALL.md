# Installation Instructions

## From VS Code Marketplace

1. Open VS Code
2. Go to Extensions view (`Ctrl+Shift+X`)
3. Search for "Code Reference Copier"
4. Click "Install"

## Manual Installation (.vsix file)

### Option 1: VS Code Interface
1. Download the .vsix file
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Type "Extensions: Install from VSIX..."
5. Select the downloaded .vsix file
6. Reload VS Code when prompted

### Option 2: Command Line
```bash
code --install-extension code-reference-copier-1.0.0.vsix
```

## Verification

After installation:
1. Open any file in VS Code
2. Press `Ctrl+Shift+P`
3. Look for "Copy Code Reference" command
4. Test by running the command

## Uninstallation

1. Go to Extensions view (`Ctrl+Shift+X`)
2. Find "Code Reference Copier"
3. Click the gear icon → "Uninstall"

## Troubleshooting

**Command not appearing:**
- Ensure VS Code version is 1.60.0+
- Reload VS Code window
- Check if extension is enabled in Extensions view

**Clipboard not working:**
- Check console for error messages (`Help` → `Toggle Developer Tools`)
- Ensure VS Code has clipboard permissions
