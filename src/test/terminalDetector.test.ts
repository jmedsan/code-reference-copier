import * as assert from 'assert';
import * as vscode from 'vscode';
import { TerminalDetector } from '../terminalDetector';
import { ProcessDetector, ProcessInfo } from '../processDetector';

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

    sendText(text: string, _shouldExecute?: boolean): void {
        this.sentTexts.push(text);
    }

    show(_preserveFocus?: boolean): void {
        this.showCalled = true;
    }

    hide(): void {}
    dispose(): void {}

    getSentTexts(): string[] { return this.sentTexts; }
    wasShowCalled(): boolean { return this.showCalled; }
}

// Mock ProcessDetector
class MockProcessDetector extends ProcessDetector {
    private mockResults: Map<number, ProcessInfo[]> = new Map();

    setMockResult(pid: number, processes: Array<{ pid: number; commandLine: string }>) {
        this.mockResults.set(pid, processes);
    }

    async getChildProcesses(parentPid: number): Promise<ProcessInfo[]> {
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

        mockProcessDetector.setMockResult(1234, [
            { pid: 2000, commandLine: 'bash' },
            { pid: 2001, commandLine: 'vim' }
        ]);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, null);
    });

    test('findMatchingTerminal returns terminal with matching process', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal] });

        mockProcessDetector.setMockResult(1234, [
            { pid: 2000, commandLine: 'bash' },
            { pid: 2001, commandLine: 'kiro-cli' },
            { pid: 2002, commandLine: 'vim' }
        ]);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, mockTerminal);
    });

    test('findMatchingTerminal matches target app in full command line', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal] });

        mockProcessDetector.setMockResult(1234, [
            { pid: 2000, commandLine: 'bash' },
            { pid: 2001, commandLine: 'node /home/user/.npm-global/bin/qwen' },
            { pid: 2002, commandLine: 'vim' }
        ]);

        const result = await terminalDetector.findMatchingTerminal(['qwen']);
        assert.strictEqual(result, mockTerminal);
    });

    test('findMatchingTerminal handles case-sensitive matching', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal] });

        mockProcessDetector.setMockResult(1234, [
            { pid: 2000, commandLine: 'bash' },
            { pid: 2001, commandLine: 'KIRO-CLI-CHAT' },
            { pid: 2002, commandLine: 'vim' }
        ]);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, null);
    });

    test('findMatchingTerminal returns first matching terminal', async () => {
        const mockTerminal1 = new MockTerminal('terminal1', 1234);
        const mockTerminal2 = new MockTerminal('terminal2', 5678);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal1, mockTerminal2] });

        mockProcessDetector.setMockResult(1234, [{ pid: 2000, commandLine: 'kiro-cli' }]);
        mockProcessDetector.setMockResult(5678, [{ pid: 3000, commandLine: 'copilot' }]);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli', 'copilot']);
        assert.strictEqual(result, mockTerminal1);
    });

    test('findMatchingTerminal skips terminals without processId', async () => {
        const mockTerminal1 = new MockTerminal('terminal1'); // No processId
        const mockTerminal2 = new MockTerminal('terminal2', 5678);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal1, mockTerminal2] });

        mockProcessDetector.setMockResult(5678, [{ pid: 3000, commandLine: 'kiro-cli' }]);

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

        mockProcessDetector.setMockResult(1234, [
            { pid: 2000, commandLine: 'bash' },
            { pid: 2001, commandLine: 'vim' }
        ]);
        mockProcessDetector.setMockResult(5678, [
            { pid: 3000, commandLine: 'node' },
            { pid: 3001, commandLine: 'npm' }
        ]);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, null);
    });

    test('findMatchingTerminal returns null when target applications array is empty', async () => {
        const mockTerminal1 = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal1] });

        mockProcessDetector.setMockResult(1234, [
            { pid: 2000, commandLine: 'bash' },
            { pid: 2001, commandLine: 'kiro-cli' }
        ]);

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

    test('findMatchingTerminal finds process at depth 2 (nested child)', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal] });

        // Level 1: terminal -> bash (PID 2000)
        mockProcessDetector.setMockResult(1234, [{ pid: 2000, commandLine: 'bash' }]);
        // Level 2: bash -> kiro-cli (PID 2100)
        mockProcessDetector.setMockResult(2000, [{ pid: 2100, commandLine: 'kiro-cli' }]);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, mockTerminal);
    });

    test('findMatchingTerminal finds process at depth 3 (deeply nested)', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal] });

        // Level 1: terminal -> bash (PID 2000)
        mockProcessDetector.setMockResult(1234, [{ pid: 2000, commandLine: 'bash' }]);
        // Level 2: bash -> wrapper script (PID 2100)
        mockProcessDetector.setMockResult(2000, [{ pid: 2100, commandLine: 'wrapper.sh' }]);
        // Level 3: wrapper -> kiro-cli (PID 2200)
        mockProcessDetector.setMockResult(2100, [{ pid: 2200, commandLine: 'kiro-cli' }]);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, mockTerminal);
    });

    test('findMatchingTerminal does not search beyond depth 3', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal] });

        // Level 1: terminal -> bash (PID 2000)
        mockProcessDetector.setMockResult(1234, [{ pid: 2000, commandLine: 'bash' }]);
        // Level 2: bash -> script1 (PID 2100)
        mockProcessDetector.setMockResult(2000, [{ pid: 2100, commandLine: 'script1' }]);
        // Level 3: script1 -> script2 (PID 2200)
        mockProcessDetector.setMockResult(2100, [{ pid: 2200, commandLine: 'script2' }]);
        // Level 4: script2 -> kiro-cli (PID 2300) - should NOT be found
        mockProcessDetector.setMockResult(2200, [{ pid: 2300, commandLine: 'kiro-cli' }]);

        const result = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(result, null);
    });

    test('findMatchingTerminal searches multiple children at each level and matches command lines', async () => {
        const mockTerminal = new MockTerminal('terminal1', 1234);
        Object.defineProperty(vscode.window, 'terminals', { value: [mockTerminal] });

        // Level 1: terminal -> bash (PID 2000), zsh (PID 2001)
        mockProcessDetector.setMockResult(1234, [
            { pid: 2000, commandLine: 'bash' },
            { pid: 2001, commandLine: 'zsh' }
        ]);
        // Level 2: bash -> vim (PID 2100)
        mockProcessDetector.setMockResult(2000, [{ pid: 2100, commandLine: 'vim' }]);
        // Level 2: zsh -> node script (PID 2101) - matches 'qwen' in full command line
        mockProcessDetector.setMockResult(2001, [{ pid: 2101, commandLine: 'node /home/user/.npm-global/bin/qwen' }]);

        // Should match 'qwen' even though it's part of the full command line
        const result = await terminalDetector.findMatchingTerminal(['qwen']);
        assert.strictEqual(result, mockTerminal);

        // Should not match when target app not in command line
        const noMatchResult = await terminalDetector.findMatchingTerminal(['kiro-cli']);
        assert.strictEqual(noMatchResult, null);
    });
});
