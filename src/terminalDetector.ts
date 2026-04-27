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
                // Custom terminal profiles (e.g. `path: "claude"`) launch the target
                // app directly as the terminal process, so check its own command line
                // before recursing into children.
                const selfCmd = await this.processDetector.getProcessCommandLine(processId);
                if (selfCmd && this.matchesAny(selfCmd, targetApps)) {
                    return terminal;
                }

                const found = await this.searchProcessTree(processId, targetApps, 1);
                if (found) {
                    return terminal;
                }
            }
        }

        return null;
    }

    private matchesAny(commandLine: string, targetApps: string[]): boolean {
        for (const targetApp of targetApps) {
            const pattern = new RegExp(`\\b${targetApp}(?:\\s|$)`);
            if (pattern.test(commandLine)) {
                return true;
            }
        }
        return false;
    }

    private async searchProcessTree(pid: number, targetApps: string[], currentDepth: number): Promise<boolean> {
        if (currentDepth > MAX_DEPTH) {
            return false;
        }

        const childProcesses = await this.processDetector.getChildProcesses(pid);

        for (const process of childProcesses) {
            if (this.matchesAny(process.commandLine, targetApps)) {
                return true;
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
