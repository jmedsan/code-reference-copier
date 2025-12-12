import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../configurationManager';

// Mock VS Code workspace configuration
class MockWorkspaceConfiguration implements vscode.WorkspaceConfiguration {
    private config: { [key: string]: any } = {};

    get<T>(section: string, defaultValue?: T): T {
        return this.config[section] !== undefined ? this.config[section] : defaultValue!;
    }

    has(section: string): boolean {
        return this.config.hasOwnProperty(section);
    }

    inspect<T>(section: string): { key: string; defaultValue?: T; globalValue?: T; workspaceValue?: T; workspaceFolderValue?: T; } | undefined {
        return undefined;
    }

    update(section: string, value: any): Thenable<void> {
        this.config[section] = value;
        return Promise.resolve();
    }

    setConfig(key: string, value: any) {
        this.config[key] = value;
    }

    readonly [key: string]: any;
}

suite('ConfigurationManager Test Suite', () => {
    let configManager: ConfigurationManager;
    let mockConfig: MockWorkspaceConfiguration;
    let originalPlatform: string;

    setup(() => {
        configManager = new ConfigurationManager();
        mockConfig = new MockWorkspaceConfiguration();
        originalPlatform = process.platform;

        // Mock vscode.workspace.getConfiguration
        (vscode.workspace as any).getConfiguration = (section?: string) => {
            return mockConfig;
        };
    });

    teardown(() => {
        // Restore original platform
        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('getTargetApplications returns empty array by default', () => {
        const apps = configManager.getTargetApplications();
        assert.deepStrictEqual(apps, []);
    });

    test('getTargetApplications returns configured applications', () => {
        mockConfig.setConfig('autoPasteApplications', ['kiro-cli', 'copilot']);
        const apps = configManager.getTargetApplications();
        assert.deepStrictEqual(apps, ['kiro-cli', 'copilot']);
    });

    test('getTargetApplications filters out invalid entries', () => {
        mockConfig.setConfig('autoPasteApplications', ['kiro-cli', '', '  ', 'copilot', null, undefined]);
        const apps = configManager.getTargetApplications();
        assert.deepStrictEqual(apps, ['kiro-cli', 'copilot']);
    });

    test('isAutoPasteEnabled returns false on non-Linux platforms', () => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        mockConfig.setConfig('autoPasteApplications', ['kiro-cli']);
        assert.strictEqual(configManager.isAutoPasteEnabled(), false);

        Object.defineProperty(process, 'platform', { value: 'darwin' });
        assert.strictEqual(configManager.isAutoPasteEnabled(), false);
    });

    test('isAutoPasteEnabled returns false on Linux with empty applications', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        mockConfig.setConfig('autoPasteApplications', []);
        assert.strictEqual(configManager.isAutoPasteEnabled(), false);
    });

    test('isAutoPasteEnabled returns true on Linux with configured applications', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        mockConfig.setConfig('autoPasteApplications', ['kiro-cli']);
        assert.strictEqual(configManager.isAutoPasteEnabled(), true);
    });
});
