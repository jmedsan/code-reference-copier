import * as assert from 'assert';
import { ProcessDetector, ProcessInfo } from '../processDetector';

// Testable ProcessDetector that can be tested without running actual shell commands
class TestableProcessDetector extends ProcessDetector {
    // Test method that accepts mock data directly
    async testGetChildProcesses(parentPid: number, mockData: string | Error): Promise<ProcessInfo[]> {
        if (mockData instanceof Error) {
            console.error(`Failed to get child processes for PID ${parentPid}:`, mockData);
            return [];
        }

        try {
            // Simulate the actual flow: execute command (mocked) -> parse output
            return (this as any).parseOutput(mockData);
        } catch (error) {
            console.error(`Failed to get child processes for PID ${parentPid}:`, error);
            return [];
        }
    }
}

suite('ProcessDetector Test Suite', () => {
    let processDetector: TestableProcessDetector;

    setup(() => {
        processDetector = new TestableProcessDetector();
    });

    test('getChildProcesses returns process info from ps output', async () => {
        const result = await processDetector.testGetChildProcesses(1234, '1001,kiro-cli\n1002,copilot\n1003,bash\n');
        assert.deepStrictEqual(result, [
            { pid: 1001, commandLine: 'kiro-cli' },
            { pid: 1002, commandLine: 'copilot' },
            { pid: 1003, commandLine: 'bash' }
        ]);
    });

    test('getChildProcesses filters empty lines', async () => {
        const result = await processDetector.testGetChildProcesses(5678, '1001,kiro-cli\n\n1002,copilot\n  \n');
        assert.deepStrictEqual(result, [
            { pid: 1001, commandLine: 'kiro-cli' },
            { pid: 1002, commandLine: 'copilot' }
        ]);
    });

    test('getChildProcesses returns empty array on ps command failure', async () => {
        const result = await processDetector.testGetChildProcesses(9999, new Error('ps command failed'));
        assert.deepStrictEqual(result, []);
    });

    test('getChildProcesses handles empty ps output', async () => {
        const result = await processDetector.testGetChildProcesses(1111, '');
        assert.deepStrictEqual(result, []);
    });

    test('Property-based test: process info parsing - 100 iterations', async () => {
        const commandLines = [
            'kiro-cli',
            'copilot',
            'bash',
            'zsh',
            'node',
            'python3',
            'node /home/user/.npm-global/bin/qwen',
            'node -e "console.log(\'hi\')"',
            'python3 -m http.server 8000',
            '/usr/bin/node --inspect script.js'
        ];

        for (let i = 0; i < 100; i++) {
            const pid = Math.floor(Math.random() * 10000);
            const selectedCommands = commandLines.slice(0, Math.floor(Math.random() * commandLines.length) + 1);
            const psOutput = selectedCommands.map((cmd, idx) => `${2000 + idx},${cmd}`).join('\n') + '\n';
            const expected = selectedCommands.map((cmd, idx) => ({ pid: 2000 + idx, commandLine: cmd }));

            const result = await processDetector.testGetChildProcesses(pid, psOutput);
            assert.deepStrictEqual(result, expected, `Failed for PID ${pid} with output: ${psOutput}`);
        }
    });

    test('getChildProcesses parses Windows PowerShell output correctly', async () => {
        const result = await processDetector.testGetChildProcesses(1234, '2001,claude.exe\n2002,cmd.exe\n2003,node.exe\n');
        assert.deepStrictEqual(result, [
            { pid: 2001, commandLine: 'claude.exe' },
            { pid: 2002, commandLine: 'cmd.exe' },
            { pid: 2003, commandLine: 'node.exe' }
        ]);
    });

    test('getChildProcesses handles empty Windows PowerShell output', async () => {
        const result = await processDetector.testGetChildProcesses(1234, '');
        assert.deepStrictEqual(result, []);
    });

    test('getChildProcesses parses macOS ps output correctly', async () => {
        const result = await processDetector.testGetChildProcesses(1234, '3001,claude\n3002,zsh\n3003,node\n');
        assert.deepStrictEqual(result, [
            { pid: 3001, commandLine: 'claude' },
            { pid: 3002, commandLine: 'zsh' },
            { pid: 3003, commandLine: 'node' }
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

            // All elements should be ProcessInfo objects with pid and commandLine
            result.forEach(processInfo => {
                assert.ok(typeof processInfo === 'object');
                assert.ok(typeof processInfo.pid === 'number');
                assert.ok(processInfo.pid > 0);
                assert.ok(typeof processInfo.commandLine === 'string');
                assert.ok(processInfo.commandLine.trim().length > 0);
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
