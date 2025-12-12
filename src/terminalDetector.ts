import * as vscode from 'vscode';
import { ProcessDetector } from './processDetector';

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
                const childProcesses = await this.processDetector.getChildProcesses(processId);

                for (const process of childProcesses) {
                    for (const targetApp of targetApps) {
                        if (process === targetApp) {
                            return terminal;
                        }
                    }
                }
            }
        }

        return null;
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
