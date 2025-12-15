import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ProcessInfo {
    pid: number;
    name: string;
}

export class ProcessDetector {
    async getChildProcesses(parentPid: number): Promise<ProcessInfo[]> {
        try {
            const platform = process.platform;
            let command: string;

            if (platform === 'win32') {
                // Windows: use PowerShell to get child processes with PID and name
                // PowerShell is available on all modern Windows (5.1+ built-in since Win10)
                command = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'ParentProcessId=${parentPid}' | ForEach-Object { '{0},{1}' -f $_.ProcessId,$_.Name }"`;
            } else {
                // Linux/macOS: use ps + pure shell (works on all Unix systems, no dependencies)
                command = `ps -eo ppid=,pid=,comm= 2>/dev/null | while IFS= read -r l; do set -- $l; [ "$1" = "${parentPid}" ] && echo "$2,$3"; done || true`;
            }

            const { stdout } = await execAsync(command);
            return this.parseOutput(stdout);
        } catch (error) {
            console.error(`Failed to get child processes for PID ${parentPid}:`, error);
            return [];
        }
    }

    private parseOutput(stdout: string): ProcessInfo[] {
        // Parse comma-separated "pid,name" format from both platforms
        return stdout
            .trim()
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => {
                const parts = line.trim().split(',');
                if (parts.length >= 2) {
                    const pid = parseInt(parts[0], 10);
                    const name = parts.slice(1).join(','); // Handle names with commas
                    if (!isNaN(pid)) {
                        return { pid, name };
                    }
                }
                return null;
            })
            .filter((info): info is ProcessInfo => info !== null);
    }
}
