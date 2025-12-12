import * as vscode from 'vscode';
import { ConfigurationManager } from './configurationManager';
import { TerminalDetector } from './terminalDetector';

const configManager = new ConfigurationManager();
const terminalDetector = new TerminalDetector();

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        'code-reference-copier.copyReference',
        copyReference
    );
    context.subscriptions.push(disposable);
}

export function deactivate() {}

async function copyReference() {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            console.error('No active editor found');
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const selection = editor.selection;
        const reference = formatReference(filePath, selection);

        const pasted = await tryAutoPaste(reference);
        if (!pasted) {
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

function formatReference(filePath: string, selection: vscode.Selection): string {
    if (selection.isEmpty) {
        return filePath + ' ';
    }

    const startLine = selection.start.line + 1;
    const endLine = selection.end.line + 1;

    if (startLine === endLine) {
        return `${filePath}:${startLine} `;
    }

    return `${filePath}:${startLine}-${endLine} `;
}
