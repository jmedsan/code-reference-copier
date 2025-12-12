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

    getTemplatePath(): string {
        const config = vscode.workspace.getConfiguration('codeReferenceCopier');
        return config.get<string>('templatePath', '{PATH} ');
    }

    getTemplateSingleLine(): string {
        const config = vscode.workspace.getConfiguration('codeReferenceCopier');
        return config.get<string>('templateSingleLine', '{PATH}:{LINE1} ');
    }

    getTemplateMultiLine(): string {
        const config = vscode.workspace.getConfiguration('codeReferenceCopier');
        return config.get<string>('templateMultiLine', '{PATH}:{LINE1}-{LINE2} ');
    }

    getTemplateWithText(): string {
        const config = vscode.workspace.getConfiguration('codeReferenceCopier');
        return config.get<string>('templateWithText', '\n\n{TEXT}\n\n');
    }
}
