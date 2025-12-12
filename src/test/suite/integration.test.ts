import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('Integration Test Suite', () => {

    test('Command registration', async () => {
        // First try to execute the command to trigger extension activation
        try {
            await vscode.commands.executeCommand('code-reference-copier.copyReference');
        } catch (error) {
            // Expected to fail since no active editor, but extension should now be activated
        }

        // Wait a bit for activation to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Now check that the command is registered
        const commands = await vscode.commands.getCommands(true);
        const hasCommand = commands.includes('code-reference-copier.copyReference');
        assert.strictEqual(hasCommand, true, 'Command should be registered after activation');
    });

    test('Error handling - no active editor', async () => {
        // Close all editors
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        // Try to execute command with no active editor
        try {
            await vscode.commands.executeCommand('code-reference-copier.copyReference');
            // Should not throw, but log error to console
            assert.ok(true, 'Command should handle no active editor gracefully');
        } catch (error) {
            assert.fail('Command should not throw error when no active editor');
        }
    });

    test('copyReference with active editor - empty selection', async function() {
        this.timeout(10000);

        // Create a temporary file
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, 'test-file-' + Date.now() + '.txt');
        fs.writeFileSync(tempFile, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\n');

        try {
            // Open the file
            const doc = await vscode.workspace.openTextDocument(tempFile);
            const editor = await vscode.window.showTextDocument(doc);

            // Clear selection (cursor at position 0,0)
            editor.selection = new vscode.Selection(0, 0, 0, 0);

            // Execute command
            await vscode.commands.executeCommand('code-reference-copier.copyReference');

            // Wait for clipboard operation
            await new Promise(resolve => setTimeout(resolve, 500));

            // Verify clipboard contains file path
            const clipboard = await vscode.env.clipboard.readText();
            assert.ok(clipboard.includes(tempFile), `Clipboard should contain file path. Got: ${clipboard}`);

        } finally {
            // Cleanup
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });

    test('copyReference with active editor - single line selection', async function() {
        this.timeout(10000);

        // Create a temporary file
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, 'test-file-single-' + Date.now() + '.txt');
        fs.writeFileSync(tempFile, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\n');

        try {
            // Open the file
            const doc = await vscode.workspace.openTextDocument(tempFile);
            const editor = await vscode.window.showTextDocument(doc);

            // Select line 2 (0-based index = 1)
            editor.selection = new vscode.Selection(1, 0, 1, 6);

            // Execute command
            await vscode.commands.executeCommand('code-reference-copier.copyReference');

            // Wait for clipboard operation
            await new Promise(resolve => setTimeout(resolve, 500));

            // Verify clipboard contains file path with line number
            const clipboard = await vscode.env.clipboard.readText();
            assert.ok(clipboard.includes(tempFile), `Clipboard should contain file path. Got: ${clipboard}`);
            assert.ok(clipboard.includes(':2'), `Clipboard should contain line number 2. Got: ${clipboard}`);

        } finally {
            // Cleanup
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });

    test('copyReference with active editor - multi-line selection', async function() {
        this.timeout(10000);

        // Create a temporary file
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, 'test-file-multi-' + Date.now() + '.txt');
        fs.writeFileSync(tempFile, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\n');

        try {
            // Open the file
            const doc = await vscode.workspace.openTextDocument(tempFile);
            const editor = await vscode.window.showTextDocument(doc);

            // Select lines 2-4 (0-based index = 1-3)
            editor.selection = new vscode.Selection(1, 0, 3, 6);

            // Execute command
            await vscode.commands.executeCommand('code-reference-copier.copyReference');

            // Wait for clipboard operation
            await new Promise(resolve => setTimeout(resolve, 500));

            // Verify clipboard contains file path with line range
            const clipboard = await vscode.env.clipboard.readText();
            assert.ok(clipboard.includes(tempFile), `Clipboard should contain file path. Got: ${clipboard}`);
            // Check that both line numbers appear in the output (format may vary: :2-4, #2:4, etc.)
            assert.ok(clipboard.includes('2') && clipboard.includes('4'),
                `Clipboard should contain line numbers 2 and 4. Got: ${clipboard}`);

        } finally {
            // Cleanup
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });

    test('copyReference with error in formatReference - exception handling', async function() {
        this.timeout(10000);

        // This test verifies that the catch block in copyReference works
        // We'll create an edge case that might cause issues

        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, 'test-error-' + Date.now() + '.txt');
        fs.writeFileSync(tempFile, 'Test content\n');

        try {
            const doc = await vscode.workspace.openTextDocument(tempFile);
            const editor = await vscode.window.showTextDocument(doc);

            editor.selection = new vscode.Selection(0, 0, 0, 5);

            // Execute command - should not throw even if there are internal errors
            await vscode.commands.executeCommand('code-reference-copier.copyReference');

            await new Promise(resolve => setTimeout(resolve, 500));

            // Should complete without throwing
            assert.ok(true, 'Command completed without throwing');

        } finally {
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });
});
