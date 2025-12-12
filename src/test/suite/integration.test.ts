import * as assert from 'assert';
import * as vscode from 'vscode';

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
});
