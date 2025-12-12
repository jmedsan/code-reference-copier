import * as vscode from 'vscode';

export class ConfigurationManager {
    getTargetApplications(): string[] {
        const config = vscode.workspace.getConfiguration('codeReferenceCopier');
        const apps = config.get<string[]>('autoPasteApplications', []);
        return apps.filter(app => typeof app === 'string' && app.trim().length > 0);
    }

    isAutoPasteEnabled(): boolean {
        return process.platform === 'linux' && this.getTargetApplications().length > 0;
    }
}
