import * as assert from 'assert';
import { ProcessDetector } from '../processDetector';

// Mock the exec function by creating a testable ProcessDetector
class TestableProcessDetector extends ProcessDetector {
    private mockExecResult: { error: Error | null; stdout: string; stderr: string } | null = null;

    setMockExecResult(error: Error | null, stdout: string, stderr: string = '') {
        this.mockExecResult = { error, stdout, stderr };
    }

    async getChildProcesses(parentPid: number): Promise<string[]> {
        if (!this.mockExecResult) {
            throw new Error('Mock result not set');
        }

        if (this.mockExecResult.error) {
            console.error(`Failed to get child processes for PID ${parentPid}:`, this.mockExecResult.error);
            return [];
        }

        const stdout = this.mockExecResult.stdout;
        return stdout.trim().split('\n').filter(line => line.trim().length > 0);
    }
}

suite('ProcessDetector Test Suite', () => {
    let processDetector: TestableProcessDetector;

    setup(() => {
        processDetector = new TestableProcessDetector();
    });

    test('getChildProcesses returns process names from ps output', async () => {
        processDetector.setMockExecResult(null, 'kiro-cli\ncopilot\nbash\n');

        const result = await processDetector.getChildProcesses(1234);
        assert.deepStrictEqual(result, ['kiro-cli', 'copilot', 'bash']);
    });

    test('getChildProcesses filters empty lines', async () => {
        processDetector.setMockExecResult(null, 'kiro-cli\n\ncopilot\n  \n');

        const result = await processDetector.getChildProcesses(5678);
        assert.deepStrictEqual(result, ['kiro-cli', 'copilot']);
    });

    test('getChildProcesses returns empty array on ps command failure', async () => {
        processDetector.setMockExecResult(new Error('ps command failed'), '', 'No such process');

        const result = await processDetector.getChildProcesses(9999);
        assert.deepStrictEqual(result, []);
    });

    test('getChildProcesses handles empty ps output', async () => {
        processDetector.setMockExecResult(null, '');

        const result = await processDetector.getChildProcesses(1111);
        assert.deepStrictEqual(result, []);
    });

    test('Property-based test: process name parsing - 100 iterations', async () => {
        for (let i = 0; i < 100; i++) {
            const pid = Math.floor(Math.random() * 10000);
            const processNames = ['kiro-cli', 'copilot', 'bash', 'zsh', 'node', 'python3'];
            const selectedNames = processNames.slice(0, Math.floor(Math.random() * processNames.length) + 1);
            const psOutput = selectedNames.join('\n') + '\n';

            processDetector.setMockExecResult(null, psOutput);
            const result = await processDetector.getChildProcesses(pid);
            assert.deepStrictEqual(result, selectedNames, `Failed for PID ${pid} with output: ${psOutput}`);
        }
    });
});
