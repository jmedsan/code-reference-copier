import * as assert from 'assert';
import * as vscode from 'vscode';
import { TerminalDetector } from '../terminalDetector';
import { ProcessDetector } from '../processDetector';

// Mock VS Code Terminal
class MockTerminal implements vscode.Terminal {
    name: string;
    processId: Thenable<number | undefined>;
    creationOptions: vscode.TerminalOptions | vscode.ExtensionTerminalOptions;
    exitStatus: vscode.TerminalExitStatus | undefined;
    state: vscode.TerminalState;
    shellIntegration: vscode.TerminalShellIntegration | undefined;

    private sentTexts: string[] = [];
    private showCalled = false;

    constructor(name: string, processId?: number) {
        this.name = name;
        this.processId = Promise.resolve(processId);
        this.creationOptions = {};
        this.state = { isInteractedWith: false, shell: 'other' as any };
        this.shellIntegration = undefined;
    }

    sendText(text: string, shouldExecute?: boolean): void {
        this.sentTexts.push(text);
    }

    show(preserveFocus?: boolean): void {
        this.showCalled = true;
    }

    hide(): void {}
    dispose(): void {}

    getSentTexts(): string[] { return this.sentTexts; }
    wasShowCalled(): boolean { return this.showCalled; }
}

// Mock ProcessDetector
class MockProcessDetector extends ProcessDetector {
    private mockResults: Map<number, string[]> = new Map();

    setMockResult(pid: number, processes: string[]) {
        this.mockResults.set(pid, processes);
    }

    async getChildProcesses(parentPid: number): Promise<string[]> {
        return this.mockResults.get(parentPid) || [];
    }
}

suite('TerminalDetector Test Suite', () => {
    let terminalDetector: TerminalDetector;
    let mockProcessDetector: MockProcessDetector;
    let originalTerminals: readonly vscode.Terminal[];

    setup(() => {
        mockProcessDetector = new MockProcessDetector();
        terminalDetector = new TerminalDetector(mockProcessDetector);
        originalTerminals = vscode.window.terminals;
    });

    teardown(() => {
        // Restore original terminals
        Object.defineProperty(vscode.window, 'terminals', { value: originalTerminals });
    });

    test('findMatchingTerminal returns null when no terminals exist', async () => {
        Object.defineProperty(vscode.window, 'terminals', { value: [] });

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, null);
    });

    test('findMatchingTerminal returns null when no matching processes found', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal] });

        mockProcessDetector.setMockResult(1234, ['bash', 'vim']);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, null);
    });

    test('findMatchingTerminal returns terminal with matching process', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal] });

        mockProcessDetector.setMockResult(1234, ['bash', 'kiro-cli', 'vim']);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, mockTerminal);
    });

    test('findMatchingTerminal handles case-sensitive matching', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal] });

        mockProcessDetector.setMockResult(1234, ['bash', 'KIRO-CLI', 'vim']);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, null);
    });

    test('findMatchingTerminal returns first matching terminal', async () => {
        const mockTerminal1 = new MockTerminal('terminal1', 1234);
        const mockTerminal2 = new MockTerminal('terminal2', 5678);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal1, mockTerminal2] });

        mockProcessDetector.setMockResult(1234, ['kiro-cli']);
        mockProcessDetector.setMockResult(5678, ['copilot']);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli', 'copilot']);
        assert.strictEqual(result, mockTerminal1);
    });

    test('findMatchingTerminal skips terminals without processId', async () => {
        const mockTerminal1 = new MockTerminal('terminal1'); // No processId
        const mockTerminal2 = new MockTerminal('terminal2', 5678);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal1, mockTerminal2] });

        mockProcessDetector.setMockResult(5678, ['kiro-cli']);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, mockTerminal2);
    });

    test('pasteToTerminal sends text and shows terminal', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        const text = '/path/to/file.js:10-20';

        const result = await terminalDetector.pasteToTerminal(mockTerminal, text);

        assert.strictEqual(result, true);
        assert.deepStrictEqual(mockTerminal.getSentTexts(), [text]);
        assert.strictEqual(mockTerminal.wasShowCalled(), true);
    });

    test('pasteToTerminal handles errors gracefully', async () => {
        const mockTerminal = {
            sendText: () => { throw new Error('Terminal error'); },
            show: () => {}
        } as unknown as vscode.Terminal;

        const result = await terminalDetector.pasteToTerminal(mockTerminal, 'test');
        assert.strictEqual(result, false);
    });

    test('findMatchingTerminal returns null when terminals exist but none run target apps', async () => {
        const mockTerminal1 = new MockTerminal('terminal1', 1234);
        const mockTerminal2 = new MockTerminal('terminal2', 5678);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal1, mockTerminal2] });

        mockProcessDetector.setMockResult(1234, ['bash', 'vim']);
        mockProcessDetector.setMockResult(5678, ['node', 'npm']);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, null);
    });

    test('findMatchingTerminal returns null when target applications array is empty', async () => {
        const mockTerminal1 = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal1] });

        mockProcessDetector.setMockResult(1234, ['bash', 'kiro-cli']);

        const result = await terminalDetector.findMatchingTerminal([]);
        assert.strictEqual(result, null);
    });

    test('findMatchingTerminal returns null when process detection fails for all terminals', async () => {
        const mockTerminal1 = new MockTerminal('terminal1', 1234);
        const mockTerminal2 = new MockTerminal('terminal2', 5678);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal1, mockTerminal2] });

        // Simulate process detection failure - returns empty arrays
        mockProcessDetector.setMockResult(1234, []);
        mockProcessDetector.setMockResult(5678, []);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, null);
    });
});
