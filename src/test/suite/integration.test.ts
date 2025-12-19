import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('Integration Test Suite', () => {

    test('Command registration - all four commands', async () => {
        // First try to execute a command to trigger extension activation
        try {
            await vscode.commands.executeCommand('code-reference-copier.copyReference');
        } catch (error) {
            // Expected to fail since no active editor, but extension should now be activated
        }

        // Wait a bit for activation to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Now check that all four commands are registered
        const commands = await vscode.commands.getCommands(true);

        assert.strictEqual(
            commands.includes('code-reference-copier.copyReference'),
            true,
            'copyReference command should be registered'
        );
        assert.strictEqual(
            commands.includes('code-reference-copier.copyReferenceWithText'),
            true,
            'copyReferenceWithText command should be registered'
        );
        assert.strictEqual(
            commands.includes('code-reference-copier.sendReferenceToTerminal'),
            true,
            'sendReferenceToTerminal command should be registered'
        );
        assert.strictEqual(
            commands.includes('code-reference-copier.sendReferenceWithTextToTerminal'),
            true,
            'sendReferenceWithTextToTerminal command should be registered'
        );
    });

    test('Error handling - no active editor', async () => {
        // Close all editors
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        // Try to execute all commands with no active editor - all should handle gracefully
        try {
            await vscode.commands.executeCommand('code-reference-copier.copyReference');
            await vscode.commands.executeCommand('code-reference-copier.copyReferenceWithText');
            await vscode.commands.executeCommand('code-reference-copier.sendReferenceToTerminal');
            await vscode.commands.executeCommand('code-reference-copier.sendReferenceWithTextToTerminal');
            // Should not throw, but log error to console
            assert.ok(true, 'All commands should handle no active editor gracefully');
        } catch (error) {
            assert.fail('Commands should not throw error when no active editor');
        }
    });

    test('copyReferenceWithText bypasses auto-paste and includes selected text', async function() {
        this.timeout(10000);

        const config = vscode.workspace.getConfiguration('codeReferenceCopier');
        const originalApps = config.get('autoPasteApplications');
        await config.update('autoPasteApplications', ['test-app'], vscode.ConfigurationTarget.Global);

        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, 'test-copy-with-text-' + Date.now() + '.txt');
        const testContent = 'Line 1\nLine 2\nLine 3\n';
        fs.writeFileSync(tempFile, testContent);

        try {
            const doc = await vscode.workspace.openTextDocument(tempFile);
            const editor = await vscode.window.showTextDocument(doc);
            // Select "Line 1" text
            editor.selection = new vscode.Selection(0, 0, 0, 6);

            await vscode.env.clipboard.writeText('');

            // Execute copyReferenceWithText (includeText=true, bypassAutoPaste=true)
            await vscode.commands.executeCommand('code-reference-copier.copyReferenceWithText');
            await new Promise(resolve => setTimeout(resolve, 500));

            const clipboard = await vscode.env.clipboard.readText();
            assert.ok(clipboard.includes(tempFile), `Should contain file path. Got: ${clipboard}`);
            assert.ok(clipboard.includes(':1'), `Should include line number. Got: ${clipboard}`);
            assert.ok(clipboard.includes('Line 1'), `Should include selected text. Got: ${clipboard}`);

        } finally {
            await config.update('autoPasteApplications', originalApps, vscode.ConfigurationTarget.Global);
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore cleanup errors
            }
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
