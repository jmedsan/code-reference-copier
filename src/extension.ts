import * as vscode from 'vscode';
import { ConfigurationManager } from './configurationManager';
import { TerminalDetector } from './terminalDetector';

const configManager = new ConfigurationManager();
const terminalDetector = new TerminalDetector();

export function activate(context: vscode.ExtensionContext) {
    const sendReferenceToTerminalDisposable = vscode.commands.registerCommand(
        'code-reference-copier.sendReferenceToTerminal',
        sendReferenceToTerminalCommand
    );
    const sendReferenceWithTextToTerminalDisposable = vscode.commands.registerCommand(
        'code-reference-copier.sendReferenceWithTextToTerminal',
        sendReferenceWithTextToTerminalCommand
    );
    const copyReferenceDisposable = vscode.commands.registerCommand(
        'code-reference-copier.copyReference',
        copyReferenceCommand
    );
    const copyReferenceWithTextDisposable = vscode.commands.registerCommand(
        'code-reference-copier.copyReferenceWithText',
        copyReferenceWithTextCommand
    );
    context.subscriptions.push(
        sendReferenceToTerminalDisposable,
        sendReferenceWithTextToTerminalDisposable,
        copyReferenceDisposable,
        copyReferenceWithTextDisposable
    );
}

export function deactivate() {}

export async function sendReferenceToTerminalCommand(): Promise<void> {
    return copyReference(false, false);  // includeText=false, bypassAutoPaste=false
}

export async function sendReferenceWithTextToTerminalCommand(): Promise<void> {
    return copyReference(true, false);   // includeText=true, bypassAutoPaste=false
}

export async function copyReferenceCommand(): Promise<void> {
    return copyReference(false, true);   // includeText=false, bypassAutoPaste=true
}

export async function copyReferenceWithTextCommand(): Promise<void> {
    return copyReference(true, true);    // includeText=true, bypassAutoPaste=true
}

async function copyReference(includeText: boolean, bypassAutoPaste: boolean = false) {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            console.error('No active editor found');
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const selection = editor.selection;

        const templatePath = configManager.getTemplatePath();
        const templateSingleLine = configManager.getTemplateSingleLine();
        const templateMultiLine = configManager.getTemplateMultiLine();

        // Generate base reference format
        let reference = formatReference(filePath, selection, templatePath, templateSingleLine, templateMultiLine);

        // Append-only template pattern: when includeText is true, append the selected text
        // using templateWithText. This maintains the base reference format while adding text content.
        if (includeText) {
            const selectedText = editor.document.getText(selection);
            const templateWithText = configManager.getTemplateWithText();
            reference += templateWithText.replace('{TEXT}', selectedText);
        }

        if (bypassAutoPaste || !await tryAutoPaste(reference)) {
            await vscode.env.clipboard.writeText(reference);
        }
    } catch (error) {
        console.error(`Failed to copy reference: ${error}`);
    }
}

async function tryAutoPaste(reference: string): Promise<boolean> {
    if (!configManager.isAutoPasteEnabled()) {
        return false;
    }

    const targetApps = configManager.getTargetApplications();
    const terminal = await terminalDetector.findMatchingTerminal(targetApps);

    if (terminal) {
        return await terminalDetector.pasteToTerminal(terminal, reference);
    }

    return false;
}

export function convertWindowsToWslPath(filePath: string): string {
    if (process.platform !== 'linux') {
        return filePath;
    }

    const windowsPathMatch = filePath.match(/^([a-zA-Z]):\//);
    if (!windowsPathMatch) {
        return filePath;
    }

    const driveLetter = windowsPathMatch[1].toLowerCase();
    return filePath.replace(/^[a-zA-Z]:\//, `/mnt/${driveLetter}/`);
}

export function formatReference(
    filePath: string,
    selection: vscode.Selection,
    templatePath: string,
    templateSingleLine: string,
    templateMultiLine: string
): string {
    const convertedPath = convertWindowsToWslPath(filePath);

    if (selection.isEmpty) {
        return templatePath.replace('{PATH}', convertedPath);
    }

    const startLine = selection.start.line + 1;
    const endLine = selection.end.line + 1;

    if (startLine === endLine) {
        return templateSingleLine
            .replace('{PATH}', convertedPath)
            .replace('{LINE1}', startLine.toString());
    }

    return templateMultiLine
        .replace('{PATH}', convertedPath)
        .replace('{LINE1}', startLine.toString())
        .replace('{LINE2}', endLine.toString());
}
