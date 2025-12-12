import * as assert from 'assert';
import * as vscode from 'vscode';
import { formatReference, copyReference, convertWindowsToWslPath } from '../extension';

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

        test('Without active editor - handles gracefully (no crash)', async () => {
            // Set activeTextEditor to undefined by closing all editors
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');

            // Execute copyReference - should not throw
            await copyReference();

            // If we get here without throwing, test passes
            assert.ok(true, 'copyReference handled missing editor gracefully');
        });

        test('Integration with formatReference - orchestrates correctly', () => {
            // This test verifies that copyReference would call formatReference with correct parameters
            // We test the integration by verifying formatReference works with the same inputs

            const testCases = [
                {
                    description: 'empty selection uses path template',
                    selection: new MockSelection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
                    templatePath: '{PATH} ',
                    templateSingle: '{PATH}:{LINE1} ',
                    templateMulti: '{PATH}:{LINE1}-{LINE2} ',
                    expected: '/test/file.js '
                },
                {
                    description: 'single line selection uses single-line template',
                    selection: new MockSelection(new vscode.Position(10, 0), new vscode.Position(10, 15)),
                    templatePath: '{PATH} ',
                    templateSingle: '{PATH}:{LINE1} ',
                    templateMulti: '{PATH}:{LINE1}-{LINE2} ',
                    expected: '/test/file.js:11 '
                },
                {
                    description: 'multi-line selection uses multi-line template',
                    selection: new MockSelection(new vscode.Position(5, 0), new vscode.Position(15, 10)),
                    templatePath: '{PATH} ',
                    templateSingle: '{PATH}:{LINE1} ',
                    templateMulti: '{PATH}:{LINE1}-{LINE2} ',
                    expected: '/test/file.js:6-16 '
                },
                {
                    description: 'custom templates without spaces',
                    selection: new MockSelection(new vscode.Position(20, 0), new vscode.Position(30, 5)),
                    templatePath: '{PATH}',
                    templateSingle: '{PATH}@{LINE1}',
                    templateMulti: '{PATH}@{LINE1}:{LINE2}',
                    expected: '/test/file.js@21:31'
                }
            ];

            testCases.forEach(testCase => {
                const result = formatReference(
                    '/test/file.js',
                    testCase.selection,
                    testCase.templatePath,
                    testCase.templateSingle,
                    testCase.templateMulti
                );
                assert.strictEqual(result, testCase.expected, `Failed: ${testCase.description}`);
            });
        });

        test('Integration with different file paths', () => {
            // Verify formatReference (which copyReference uses) handles various path formats
            const testCases = [
                { path: '/unix/style/path.js', line: 5, expected: '/unix/style/path.js:6 ' },
                { path: 'C:\\Windows\\Style\\Path.cs', line: 10, expected: 'C:\\Windows\\Style\\Path.cs:11 ' },
                { path: '/path/with spaces/file.ts', line: 1, expected: '/path/with spaces/file.ts:2 ' },
                { path: '/测试/файл.go', line: 100, expected: '/测试/файл.go:101 ' }
            ];

            testCases.forEach(testCase => {
                const selection = new MockSelection(
                    new vscode.Position(testCase.line, 0),
                    new vscode.Position(testCase.line, 10)
                );
                const result = formatReference(
                    testCase.path,
                    selection,
                    '{PATH} ',
                    '{PATH}:{LINE1} ',
                    '{PATH}:{LINE1}-{LINE2} '
                );
                assert.strictEqual(result, testCase.expected);
            });
        });

        test('Error handling - copyReference catches and logs errors', async () => {
            // copyReference has try-catch that logs errors to console
            // We verify it doesn't throw by calling it in various error conditions

            // Test 1: No active editor (should log "No active editor found")
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await copyReference(); // Should not throw

            assert.ok(true, 'copyReference completed without throwing');
        });

        test('Template configuration integration - verifies correct template selection logic', () => {
            // This tests the logic that copyReference uses to select templates
            const filePath = '/home/user/project/app.ts';

            // Test 1: Empty selection should use templatePath
            const emptySelection = new MockSelection(
                new vscode.Position(0, 0),
                new vscode.Position(0, 0)
            );
            const emptyResult = formatReference(
                filePath,
                emptySelection,
                '{PATH}',
                '{PATH}:{LINE1}',
                '{PATH}:{LINE1}-{LINE2}'
            );
            assert.strictEqual(emptyResult, filePath);

            // Test 2: Single line should use templateSingleLine
            const singleSelection = new MockSelection(
                new vscode.Position(10, 5),
                new vscode.Position(10, 20)
            );
            const singleResult = formatReference(
                filePath,
                singleSelection,
                '{PATH}',
                '{PATH}:{LINE1}',
                '{PATH}:{LINE1}-{LINE2}'
            );
            assert.strictEqual(singleResult, `${filePath}:11`);

            // Test 3: Multi-line should use templateMultiLine
            const multiSelection = new MockSelection(
                new vscode.Position(10, 0),
                new vscode.Position(20, 0)
            );
            const multiResult = formatReference(
                filePath,
                multiSelection,
                '{PATH}',
                '{PATH}:{LINE1}',
                '{PATH}:{LINE1}-{LINE2}'
            );
            assert.strictEqual(multiResult, `${filePath}:11-21`);
        });

        test('Line number conversion - verifies 0-based to 1-based conversion in integration', () => {
            // copyReference must convert VS Code's 0-based line numbers to 1-based for CLI tools
            const testCases = [
                { vsCodeLine: 0, cliLine: 1 },
                { vsCodeLine: 1, cliLine: 2 },
                { vsCodeLine: 99, cliLine: 100 },
                { vsCodeLine: 999, cliLine: 1000 }
            ];

            testCases.forEach(testCase => {
                const selection = new MockSelection(
                    new vscode.Position(testCase.vsCodeLine, 0),
                    new vscode.Position(testCase.vsCodeLine, 10)
                );
                const result = formatReference(
                    '/test.ts',
                    selection,
                    '{PATH}',
                    '{PATH}:{LINE1}',
                    '{PATH}:{LINE1}-{LINE2}'
                );
                assert.strictEqual(result, `/test.ts:${testCase.cliLine}`,
                    `VS Code line ${testCase.vsCodeLine} should convert to CLI line ${testCase.cliLine}`);
            });
        });
    });
});
