# Code Reference Copier

Copy file references with line ranges using the standard CLI format. Auto-paste to terminal applications on Linux.

## Features

- Copy current file reference: `/absolute/path/to/file.js`
- Copy file reference with single line: `/absolute/path/to/file.js:15`
- Copy file reference with line range: `/absolute/path/to/file.js:10-25`
- Copy code reference with selected text attached
- **Auto-paste to terminal applications** (Linux only)
- Works with any file type in VS Code
- Uses absolute paths with OS-appropriate separators
- Keyboard shortcuts:
  - `Ctrl+Alt+K` (Linux/Windows) / `Cmd+Alt+K` (Mac) - Copy reference only
  - `Ctrl+Alt+T` (Linux/Windows) / `Cmd+Alt+T` (Mac) - Copy reference with text

## Usage

### Basic Usage

1. Open any file in VS Code
2. Optionally select text (single or multiple lines)
3. Use one of these commands:
   - **Copy reference only**: `Ctrl+Alt+K` / `Cmd+Alt+K` OR Command Palette → "Copy Code Reference"
   - **Copy reference with text**: `Ctrl+Alt+T` / `Cmd+Alt+T` OR Command Palette → "Copy Code Reference with Text"
4. Reference is copied to clipboard or auto-pasted to terminal

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

**Base reference settings:**

- `codeReferenceCopier.templatePath` - Format for file without selection
  - Default: `{PATH} `
  - Variables: `{PATH}`

- `codeReferenceCopier.templateSingleLine` - Format for single line selection
  - Default: `{PATH}:{LINE1} `
  - Variables: `{PATH}`, `{LINE1}`

- `codeReferenceCopier.templateMultiLine` - Format for multi-line selection
  - Default: `{PATH}:{LINE1}-{LINE2} `
  - Variables: `{PATH}`, `{LINE1}`, `{LINE2}`

**Text-append settings:**

- `codeReferenceCopier.templateWithText` - Appended when using "Copy with Text" command
  - Default: `\n\n{TEXT}\n\n`
  - Variables: `{TEXT}`
  - This template is **appended** to the base reference format (not a replacement)

**Example custom configuration:**
```json
{
  "codeReferenceCopier.templatePath": "{PATH}",
  "codeReferenceCopier.templateSingleLine": "{PATH}@{LINE1}",
  "codeReferenceCopier.templateMultiLine": "{PATH}#{LINE1}:{LINE2}",
  "codeReferenceCopier.templateWithText": "\n```\n{TEXT}\n```\n"
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

**With selected text appended (default template):**
```
/home/user/project/src/main.js:15

const value = calculate();

```

*Note: References include a trailing space by default for immediate typing convenience.*

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
