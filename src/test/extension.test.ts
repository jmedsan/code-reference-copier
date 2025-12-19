import * as assert from 'assert';
import * as vscode from 'vscode';
import { formatReference, copyReferenceCommand, copyReferenceWithTextCommand, sendReferenceToTerminalCommand, sendReferenceWithTextToTerminalCommand, convertWindowsToWslPath } from '../extension';

// Mock VS Code Selection class for testing
class MockSelection implements vscode.Selection {
    constructor(
        public start: vscode.Position,
        public end: vscode.Position
    ) {}

    get isEmpty(): boolean {
        return this.start.line === this.end.line && this.start.character === this.end.character;
    }

    get isSingleLine(): boolean {
        return this.start.line === this.end.line;
    }

    get isReversed(): boolean {
        return false;
    }

    get active(): vscode.Position { return this.end; }
    get anchor(): vscode.Position { return this.start; }

    contains(): boolean { return false; }
    isEqual(): boolean { return false; }
    intersection(): vscode.Selection | undefined { return undefined; }
    union(): vscode.Selection { return this; }
    with(): vscode.Selection { return this; }
}

// Common template strings
const TEMPLATE_DEFAULT = {
    path: '{PATH} ',
    singleLine: '{PATH}:{LINE1} ',
    multiLine: '{PATH}:{LINE1}-{LINE2} '
};

// Common test file paths
const TEST_FILE = '/test/file.js';
const LONG_PATH = '/very/long/path/'.repeat(50) + 'file.js';
const UNICODE_PATH = '/测试/файл/🚀/file.js';

suite('Extension Test Suite', () => {

    suite('convertWindowsToWslPath Tests', () => {

        test('Converts lowercase Windows path to WSL on Linux', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'linux' });

            const result = convertWindowsToWslPath('c:/dev/project/file.ts');
            assert.strictEqual(result, '/mnt/c/dev/project/file.ts');

            Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

        test('Converts uppercase Windows path to WSL on Linux', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'linux' });

            const result = convertWindowsToWslPath('C:/dev/project/file.ts');
            assert.strictEqual(result, '/mnt/c/dev/project/file.ts');

            Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

        test('Converts all drive letters (a-z)', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'linux' });

            const drives = ['a', 'b', 'd', 'z', 'A', 'D', 'Z'];
            drives.forEach(drive => {
                const input = `${drive}:/test/file.ts`;
                const expected = `/mnt/${drive.toLowerCase()}/test/file.ts`;
                const result = convertWindowsToWslPath(input);
                assert.strictEqual(result, expected, `Drive ${drive} conversion failed`);
            });

            Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

        test('Returns unchanged for non-Windows paths on Linux', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'linux' });

            const paths = [
                '/home/user/file.ts',
                '/mnt/c/already/wsl/path.ts',
                './relative/path.ts',
                '../parent/path.ts',
                'no-leading-slash.ts'
            ];

            paths.forEach(path => {
                const result = convertWindowsToWslPath(path);
                assert.strictEqual(result, path, `Path ${path} should remain unchanged`);
            });

            Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

        test('Returns unchanged on non-Linux platforms', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'win32' });

            const result = convertWindowsToWslPath('c:/dev/project/file.ts');
            assert.strictEqual(result, 'c:/dev/project/file.ts');

            Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

        test('Handles already converted WSL paths', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'linux' });

            const result = convertWindowsToWslPath('/mnt/d/project/file.ts');
            assert.strictEqual(result, '/mnt/d/project/file.ts');

            Object.defineProperty(process, 'platform', { value: originalPlatform });
        });
    });

    suite('Property-based Tests', () => {

        test('Property 1: Reference format correctness - 100 iterations', () => {
            for (let i = 0; i < 100; i++) {
                const filePath = `/test/file${i}.js`;
                const startLine = Math.floor(Math.random() * 1000);
                const endLine = startLine + Math.floor(Math.random() * 100);

                // Test empty selection
                const emptySelection = new MockSelection(
                    new vscode.Position(startLine, 0),
                    new vscode.Position(startLine, 0)
                );
                const emptyResult = formatReference(filePath, emptySelection, TEMPLATE_DEFAULT.path, TEMPLATE_DEFAULT.singleLine, TEMPLATE_DEFAULT.multiLine);
                assert.strictEqual(emptyResult, filePath + ' ', `Empty selection should return file path with trailing space`);

                // Test single line selection
                const singleLineSelection = new MockSelection(
                    new vscode.Position(startLine, 0),
                    new vscode.Position(startLine, 10)
                );
                const singleResult = formatReference(filePath, singleLineSelection, TEMPLATE_DEFAULT.path, TEMPLATE_DEFAULT.singleLine, TEMPLATE_DEFAULT.multiLine);
                assert.strictEqual(singleResult, `${filePath}:${startLine + 1} `, `Single line should include line number with trailing space`);

                // Test multi-line selection
                if (endLine > startLine) {
                    const multiLineSelection = new MockSelection(
                        new vscode.Position(startLine, 0),
                        new vscode.Position(endLine, 0)
                    );
                    const multiResult = formatReference(filePath, multiLineSelection, TEMPLATE_DEFAULT.path, TEMPLATE_DEFAULT.singleLine, TEMPLATE_DEFAULT.multiLine);
                    assert.strictEqual(multiResult, `${filePath}:${startLine + 1}-${endLine + 1} `, `Multi-line should include range with trailing space`);
                }
            }
        });

        test('Property 2: Path format consistency', () => {
            const testPaths = [
                '/unix/style/path.js',
                'C:\\Windows\\Style\\Path.js',
                '/very/long/path/with/many/segments/file.js',
                '/path/with spaces/file.js',
                '/path/with-dashes/file_with_underscores.js'
            ];

            testPaths.forEach(path => {
                const selection = new MockSelection(
                    new vscode.Position(0, 0),
                    new vscode.Position(0, 0)
                );
                const result = formatReference(path, selection, TEMPLATE_DEFAULT.path, TEMPLATE_DEFAULT.singleLine, TEMPLATE_DEFAULT.multiLine);
                assert.strictEqual(result, path + ' ', `Path should be preserved exactly with trailing space: ${path}`);
            });
        });

        test('Property 3: Line number accuracy', () => {
            // Test various line numbers
            for (let line = 0; line < 100; line++) {
                const selection = new MockSelection(
                    new vscode.Position(line, 0),
                    new vscode.Position(line, 5)
                );
                const result = formatReference(TEST_FILE, selection, TEMPLATE_DEFAULT.path, TEMPLATE_DEFAULT.singleLine, TEMPLATE_DEFAULT.multiLine);
                const expectedLine = line + 1; // Convert to 1-based
                assert.strictEqual(result, `${TEST_FILE}:${expectedLine} `, `Line ${line} should convert to ${expectedLine} with trailing space`);
            }
        });
    });

    suite('Edge Case Tests', () => {

        test('Empty file path', () => {
            const selection = new MockSelection(
                new vscode.Position(0, 0),
                new vscode.Position(0, 0)
            );
            const result = formatReference('', selection, TEMPLATE_DEFAULT.path, TEMPLATE_DEFAULT.singleLine, TEMPLATE_DEFAULT.multiLine);
            assert.strictEqual(result, ' ');
        });

        test('Very long file paths', () => {
            const selection = new MockSelection(
                new vscode.Position(0, 0),
                new vscode.Position(0, 0)
            );
            const result = formatReference(LONG_PATH, selection, TEMPLATE_DEFAULT.path, TEMPLATE_DEFAULT.singleLine, TEMPLATE_DEFAULT.multiLine);
            assert.strictEqual(result, LONG_PATH + ' ');
        });

        test('Unicode characters in path', () => {
            const selection = new MockSelection(
                new vscode.Position(0, 0),
                new vscode.Position(0, 0)
            );
            const result = formatReference(UNICODE_PATH, selection, TEMPLATE_DEFAULT.path, TEMPLATE_DEFAULT.singleLine, TEMPLATE_DEFAULT.multiLine);
            assert.strictEqual(result, UNICODE_PATH + ' ');
        });

        test('Large line numbers', () => {
            const largeLine = 999999;
            const selection = new MockSelection(
                new vscode.Position(largeLine, 0),
                new vscode.Position(largeLine, 5)
            );
            const result = formatReference(TEST_FILE, selection, TEMPLATE_DEFAULT.path, TEMPLATE_DEFAULT.singleLine, TEMPLATE_DEFAULT.multiLine);
            assert.strictEqual(result, `${TEST_FILE}:${largeLine + 1} `);
        });
    });

    suite('copyReference Integration Tests', () => {

        test('Without active editor - handles gracefully', async () => {
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await copyReferenceCommand();
            assert.ok(true, 'copyReferenceCommand handled missing editor gracefully');
        });
    });

    suite('Command Handler Tests', () => {

        test('All four command handlers execute without errors', async () => {
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');

            // Test all command handlers can be called
            await sendReferenceToTerminalCommand();
            await sendReferenceWithTextToTerminalCommand();
            await copyReferenceCommand();
            await copyReferenceWithTextCommand();

            assert.ok(true, 'All four commands executed without errors');
        });
    });
});
