# Code Reference Copier

Copy file references with line ranges using the standard CLI format. Auto-paste to terminal applications on Linux.

## Features

- Copy current file reference: `/absolute/path/to/file.js`
- Copy file reference with single line: `/absolute/path/to/file.js:15`
- Copy file reference with line range: `/absolute/path/to/file.js:10-25`
- **Auto-paste to terminal applications** (Linux only)
- Works with any file type in VS Code
- Uses absolute paths with OS-appropriate separators
- Keyboard shortcut: `Ctrl+Alt+K` (Linux/Windows) / `Cmd+Alt+K` (Mac)

## Usage

### Basic Usage

1. Open any file in VS Code
2. Optionally select text (single or multiple lines)
3. Use keyboard shortcut `Ctrl+Alt+K` / `Cmd+Alt+K` OR
4. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run "Copy Code Reference"
5. Reference is copied to clipboard or auto-pasted to terminal

### Auto-Paste Configuration (Linux Only)

Configure terminal applications for auto-paste functionality:

1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "Code Reference Copier"
3. Add terminal application names to "Auto Paste Applications"

**Example configuration:**
```json
{
  "codeReferenceCopier.autoPasteApplications": ["kiro-cli", "copilot"]
}
```

When auto-paste is enabled and a matching terminal is found, the reference will be pasted directly to the terminal instead of copied to clipboard.

### Custom Format Templates

Customize the output format using template variables:

1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "Code Reference Copier"
3. Configure template options

**Available settings:**

- `codeReferenceCopier.templatePath` - Format for file without selection
  - Default: `{PATH} `
  - Variables: `{PATH}`

- `codeReferenceCopier.templateSingleLine` - Format for single line selection
  - Default: `{PATH}:{LINE1} `
  - Variables: `{PATH}`, `{LINE1}`

- `codeReferenceCopier.templateMultiLine` - Format for multi-line selection
  - Default: `{PATH}:{LINE1}-{LINE2} `
  - Variables: `{PATH}`, `{LINE1}`, `{LINE2}`

**Example custom configuration:**
```json
{
  "codeReferenceCopier.templatePath": "{PATH}",
  "codeReferenceCopier.templateSingleLine": "{PATH}@{LINE1}",
  "codeReferenceCopier.templateMultiLine": "{PATH}#{LINE1}:{LINE2}"
}
```

## Examples

**No selection (entire file):**
```
/home/user/project/src/main.js
```

**Single line selected:**
```
/home/user/project/src/main.js:15
```

**Multiple lines selected:**
```
/home/user/project/src/main.js:10-25
```

*Note: All references include a trailing space for immediate typing convenience.*

## Platform Support

- **All platforms**: Basic copy-to-clipboard functionality
- **Linux only**: Auto-paste to terminal applications
- **Windows/macOS**: Auto-paste gracefully falls back to clipboard

## Requirements

- VS Code 1.60.0 or higher
- Linux (for auto-paste functionality)

## Installation

Install from the VS Code Marketplace or download the .vsix file for manual installation.

## License

MIT
