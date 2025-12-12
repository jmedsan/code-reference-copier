import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ProcessDetector {
    async getChildProcesses(parentPid: number): Promise<string[]> {
        try {
            const { stdout } = await execAsync(`pstree -p ${parentPid} | grep -o '([0-9]*)' | tr -d '()' | xargs -I {} ps -p {} -o comm --no-headers 2>/dev/null || echo`);
            return stdout.trim().split('\n').filter(line => line.trim().length > 0);
        } catch (error) {
            console.error(`Failed to get child processes for PID ${parentPid}:`, error);
            return [];
        }
    }
}
