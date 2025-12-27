import * as vscode from 'vscode';
import { ProcessDetector } from './processDetector';

const MAX_DEPTH = 3;

export class TerminalDetector {
    private processDetector: ProcessDetector;

    constructor(processDetector?: ProcessDetector) {
        this.processDetector = processDetector || new ProcessDetector();
    }

    async findMatchingTerminal(targetApps: string[]): Promise<vscode.Terminal | null> {
        const terminals = vscode.window.terminals;

        for (const terminal of terminals) {
            const processId = await terminal.processId;
            if (processId) {
                const found = await this.searchProcessTree(processId, targetApps, 1);
                if (found) {
                    return terminal;
                }
            }
        }

        return null;
    }

    private async searchProcessTree(pid: number, targetApps: string[], currentDepth: number): Promise<boolean> {
        if (currentDepth > MAX_DEPTH) {
            return false;
        }

        const childProcesses = await this.processDetector.getChildProcesses(pid);

        for (const process of childProcesses) {
            // Check if this process matches any target app
            for (const targetApp of targetApps) {
                // Match targetApp as complete word in command line using word boundary
                // \b ensures word start, (?:\s|$) ensures word end (space or end of string)
                const pattern = new RegExp(`\\b${targetApp}(?:\\s|$)`);
                if (pattern.test(process.commandLine)) {
                    return true;
                }
            }
        }

        // If not found at this level, recursively check children
        for (const process of childProcesses) {
            const found = await this.searchProcessTree(process.pid, targetApps, currentDepth + 1);
            if (found) {
                return true;
            }
        }

        return false;
    }

    async pasteToTerminal(terminal: vscode.Terminal, text: string): Promise<boolean> {
        try {
            terminal.sendText(text, false);
            terminal.show();
            return true;
        } catch (error) {
            console.error('Failed to paste to terminal:', error);
            return false;
        }
    }
}
