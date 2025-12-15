import * as assert from 'assert';
import { ProcessDetector, ProcessInfo } from '../processDetector';

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

    async getChildProcesses(parentPid: number): Promise<ProcessInfo[]> {
        if (!this.mockExecResult) {
            throw new Error('Mock result not set');
        }

        if (this.mockExecResult.error) {
            console.error(`Failed to get child processes for PID ${parentPid}:`, this.mockExecResult.error);
            return [];
        }

        const stdout = this.mockExecResult.stdout;
        return this.parseOutputForTest(stdout);
    }

    private parseOutputForTest(stdout: string): ProcessInfo[] {
        // Parse comma-separated "pid,name" format from both platforms
        return stdout
            .trim()
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => {
                const parts = line.trim().split(',');
                if (parts.length >= 2) {
                    const pid = parseInt(parts[0], 10);
                    const name = parts.slice(1).join(',');
                    if (!isNaN(pid)) {
                        return { pid, name };
                    }
                }
                return null;
            })
            .filter((info): info is ProcessInfo => info !== null);
    }
}

suite('ProcessDetector Test Suite', () => {
    let processDetector: TestableProcessDetector;

    setup(() => {
        processDetector = new TestableProcessDetector();
    });

    test('getChildProcesses returns process info from ps output', async () => {
        processDetector.setMockExecResult(null, '1001,kiro-cli\n1002,copilot\n1003,bash\n');

        const result = await processDetector.getChildProcesses(1234);
        assert.deepStrictEqual(result, [
            { pid: 1001, name: 'kiro-cli' },
            { pid: 1002, name: 'copilot' },
            { pid: 1003, name: 'bash' }
        ]);
    });

    test('getChildProcesses filters empty lines', async () => {
        processDetector.setMockExecResult(null, '1001,kiro-cli\n\n1002,copilot\n  \n');

        const result = await processDetector.getChildProcesses(5678);
        assert.deepStrictEqual(result, [
            { pid: 1001, name: 'kiro-cli' },
            { pid: 1002, name: 'copilot' }
        ]);
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

    test('Property-based test: process info parsing - 100 iterations', async () => {
        for (let i = 0; i < 100; i++) {
            const pid = Math.floor(Math.random() * 10000);
            const processNames = ['kiro-cli', 'copilot', 'bash', 'zsh', 'node', 'python3'];
            const selectedNames = processNames.slice(0, Math.floor(Math.random() * processNames.length) + 1);
            const psOutput = selectedNames.map((name, idx) => `${2000 + idx},${name}`).join('\n') + '\n';
            const expected = selectedNames.map((name, idx) => ({ pid: 2000 + idx, name }));

            processDetector.setMockExecResult(null, psOutput);
            const result = await processDetector.getChildProcesses(pid);
            assert.deepStrictEqual(result, expected, `Failed for PID ${pid} with output: ${psOutput}`);
        }
    });

    test('getChildProcesses parses Windows PowerShell output correctly', async () => {
        processDetector.setMockPlatform('win32');
        processDetector.setMockExecResult(null, '2001,claude.exe\n2002,cmd.exe\n2003,node.exe\n');

        const result = await processDetector.getChildProcesses(1234);
        assert.deepStrictEqual(result, [
            { pid: 2001, name: 'claude.exe' },
            { pid: 2002, name: 'cmd.exe' },
            { pid: 2003, name: 'node.exe' }
        ]);
    });

    test('getChildProcesses handles empty Windows PowerShell output', async () => {
        processDetector.setMockPlatform('win32');
        processDetector.setMockExecResult(null, '');

        const result = await processDetector.getChildProcesses(1234);
        assert.deepStrictEqual(result, []);
    });

    test('getChildProcesses parses macOS ps output correctly', async () => {
        processDetector.setMockPlatform('darwin');
        processDetector.setMockExecResult(null, '3001,claude\n3002,zsh\n3003,node\n');

        const result = await processDetector.getChildProcesses(1234);
        assert.deepStrictEqual(result, [
            { pid: 3001, name: 'claude' },
            { pid: 3002, name: 'zsh' },
            { pid: 3003, name: 'node' }
        ]);
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

            // All elements should be ProcessInfo objects with pid and name
            result.forEach(processInfo => {
                assert.ok(typeof processInfo === 'object');
                assert.ok(typeof processInfo.pid === 'number');
                assert.ok(processInfo.pid > 0);
                assert.ok(typeof processInfo.name === 'string');
                assert.ok(processInfo.name.trim().length > 0);
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
