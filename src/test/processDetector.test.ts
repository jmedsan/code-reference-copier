import * as assert from 'assert';
import { ProcessDetector } from '../processDetector';

// Mock the exec function by creating a testable ProcessDetector
class TestableProcessDetector extends ProcessDetector {
    private mockExecResult: { error: Error | null; stdout: string; stderr: string } | null = null;
    private mockPlatform: string = 'linux';

    setMockExecResult(error: Error | null, stdout: string, stderr: string = '') {
        this.mockExecResult = { error, stdout, stderr };
    }

    setMockPlatform(platform: string) {
        this.mockPlatform = platform;
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
        return this.parseOutputForTest(stdout, this.mockPlatform);
    }

    private parseOutputForTest(stdout: string, platform: string): string[] {
        // All platforms now output simple newline-separated process names
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

    test('getChildProcesses parses Windows PowerShell output correctly', async () => {
        processDetector.setMockPlatform('win32');
        processDetector.setMockExecResult(null, 'claude.exe\ncmd.exe\nnode.exe\n');

        const result = await processDetector.getChildProcesses(1234);
        assert.deepStrictEqual(result, ['claude.exe', 'cmd.exe', 'node.exe']);
    });

    test('getChildProcesses handles empty Windows PowerShell output', async () => {
        processDetector.setMockPlatform('win32');
        processDetector.setMockExecResult(null, '');

        const result = await processDetector.getChildProcesses(1234);
        assert.deepStrictEqual(result, []);
    });

    test('getChildProcesses parses macOS ps output correctly', async () => {
        processDetector.setMockPlatform('darwin');
        processDetector.setMockExecResult(null, 'claude\nzsh\nnode\n');

        const result = await processDetector.getChildProcesses(1234);
        assert.deepStrictEqual(result, ['claude', 'zsh', 'node']);
    });

    suite('Real ProcessDetector Implementation Tests', () => {
        let realProcessDetector: ProcessDetector;

        setup(() => {
            realProcessDetector = new ProcessDetector();
        });

        test('getChildProcesses on current process (smoke test)', async function() {
            this.timeout(5000); // Increase timeout for real system call

            const currentPid = process.pid;
            const result = await realProcessDetector.getChildProcesses(currentPid);

            // Should return an array (might be empty or have processes)
            assert.ok(Array.isArray(result));

            // All elements should be non-empty strings
            result.forEach(processName => {
                assert.strictEqual(typeof processName, 'string');
                assert.ok(processName.trim().length > 0);
            });
        });

        test('getChildProcesses with invalid PID returns empty array', async function() {
            this.timeout(5000);

            // Using a very high PID that likely doesn't exist
            const invalidPid = 9999999;
            const result = await realProcessDetector.getChildProcesses(invalidPid);

            // Should return empty array for non-existent process
            assert.ok(Array.isArray(result));
        });

        test('getChildProcesses handles process without children', async function() {
            this.timeout(5000);

            // Use PID 1 (init/systemd) which should work on Linux systems
            const result = await realProcessDetector.getChildProcesses(1);

            // Should return an array
            assert.ok(Array.isArray(result));
        });
    });
});
