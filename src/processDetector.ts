import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ProcessDetector {
    async getChildProcesses(parentPid: number): Promise<string[]> {
        try {
            const platform = process.platform;
            let command: string;

            if (platform === 'win32') {
                // Windows: use PowerShell to get child processes by parent PID
                // PowerShell is available on all modern Windows (5.1+ built-in since Win10)
                command = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'ParentProcessId=${parentPid}' | Select-Object -ExpandProperty Name 2>$null"`;
            } else {
                // Linux/macOS: use ps + pure shell (works on all Unix systems, no dependencies)
                command = `ps -eo ppid=,comm= 2>/dev/null | while IFS= read -r l; do set -- $l; [ "$1" = "${parentPid}" ] && echo "$2"; done || true`;
            }

            const { stdout } = await execAsync(command);
            return this.parseOutput(stdout, platform);
        } catch (error) {
            console.error(`Failed to get child processes for PID ${parentPid}:`, error);
            return [];
        }
    }

    private parseOutput(stdout: string, platform: string): string[] {
        // All platforms now output simple newline-separated process names
        // Windows PowerShell Select-Object -ExpandProperty outputs plain names
        return stdout.trim().split('\n').filter(line => line.trim().length > 0);
    }
}
