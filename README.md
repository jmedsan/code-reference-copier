# Code Reference Copier

Copy file references with line ranges using the standard CLI format. Auto-paste to terminal applications on Linux, macOS, and Windows.

## Features

- Copy current file reference: `/absolute/path/to/file.js`
- Copy file reference with single line: `/absolute/path/to/file.js:15`
- Copy file reference with line range: `/absolute/path/to/file.js:10-25`
- Copy code reference with selected text attached
- **Auto-paste to terminal applications** (Linux, macOS, Windows)
- Works with any file type in VS Code
- Uses absolute paths with OS-appropriate separators
- Four commands with dedicated keyboard shortcuts:
  - **Send to Terminal** (auto-paste): `Ctrl+Alt+K` / `Cmd+Alt+K` - Send reference to terminal
  - **Send with Text to Terminal** (auto-paste): `Ctrl+Alt+T` / `Cmd+Alt+T` - Send reference with selected text to terminal
  - **Copy to Clipboard**: `Ctrl+Shift+Alt+K` / `Cmd+Shift+Alt+K` - Copy reference only
  - **Copy with Text to Clipboard**: `Ctrl+Shift+Alt+T` / `Cmd+Shift+Alt+T` - Copy reference with selected text

## Great for AI CLI Coders

The auto-paste feature is particularly useful when working with AI coding assistants like **Claude**, **Kiro**, and **GitHub Copilot** in the terminal. Instead of manually copying references, select code in VS Code and press `Ctrl+Alt+K` to instantly paste it into your AI CLI tool. Configure your preferred terminal applications in settings to enable this streamlined workflow.

## Usage

### Basic Usage

1. Open any file in VS Code
2. Optionally select text (single or multiple lines)
3. Use one of these commands:
   - **Send to Terminal** (auto-paste): `Ctrl+Alt+K` / `Cmd+Alt+K` OR Command Palette → "Send Code Reference to Terminal"
   - **Send with Text to Terminal** (auto-paste): `Ctrl+Alt+T` / `Cmd+Alt+T` OR Command Palette → "Send Code Reference with Text to Terminal"
   - **Copy to Clipboard**: `Ctrl+Shift+Alt+K` / `Cmd+Shift+Alt+K` OR Command Palette → "Copy Code Reference to Clipboard Only"
   - **Copy with Text to Clipboard**: `Ctrl+Shift+Alt+T` / `Cmd+Shift+Alt+T` OR Command Palette → "Copy Code Reference with Text to Clipboard Only"
4. Reference is either auto-pasted to the terminal or copied to clipboard, depending on the command

### Auto-Paste Configuration

Configure terminal applications for auto-paste functionality:

1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "Code Reference Copier"
3. Add terminal application names to "Auto Paste Applications"

**Example configuration:**
```json
{
  "codeReferenceCopier.autoPasteApplications": ["claude", "kiro-cli", "copilot", "edit.exe"]
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
  "codeReferenceCopier.templateWithText": "\n\n{TEXT}\n\n"
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

- **All platforms**: Copy-to-clipboard and auto-paste to terminal applications
- **Linux/macOS**: Uses `ps` + pure shell for process detection (zero external dependencies)
- **Windows**: Uses PowerShell for process detection (built-in since Windows 10)

## Requirements

- VS Code 1.60.0 or higher

## Installation

Install from the VS Code Marketplace or download the .vsix file for manual installation.

## License

MIT
