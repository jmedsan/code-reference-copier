import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ProcessInfo {
    pid: number;
    commandLine: string;
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
                // Linux/macOS: use ps + pure shell to capture full command line (works on all Unix systems, no dependencies)
                // Save pid, shift to remove ppid/pid, then output "pid,full_command_line" format
                command = `ps -eo ppid=,pid=,args= 2>/dev/null | while IFS= read -r l; do set -- $l; if [ "$1" = "${parentPid}" ]; then pid=$2; shift 2; echo "$pid,$*"; fi; done || true`;
            }

            const { stdout } = await execAsync(command);
            return this.parseOutput(stdout);
        } catch (error) {
            console.error(`Failed to get child processes for PID ${parentPid}:`, error);
            return [];
        }
    }

    private parseOutput(stdout: string): ProcessInfo[] {
        // Parse comma-separated "pid,commandLine" format from both platforms
        return stdout
            .trim()
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => {
                const parts = line.trim().split(',');
                if (parts.length >= 2) {
                    const pid = parseInt(parts[0], 10);
                    const commandLine = parts.slice(1).join(','); // Handle command lines with commas
                    if (!isNaN(pid)) {
                        return { pid, commandLine };
                    }
                }
                return null;
            })
            .filter((info): info is ProcessInfo => info !== null);
    }
}

