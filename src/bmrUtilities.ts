import { exec } from 'child_process';
import fs from 'fs';
import util from 'util';
import { serialKeyFile } from './constants/strings';
import { logger } from './logger';
/**
 * Utilities for BMR
 */
export class BmrUtilities {
    private static bmrUtilities: BmrUtilities;
    private constructor() { }
    public static GET_INSTANCE(): BmrUtilities {
        if (this.bmrUtilities === undefined) {
            this.bmrUtilities = new BmrUtilities();
        }

        return this.bmrUtilities;
    }

    public getRoomName(): string {
        const room: string = fs.readFileSync(serialKeyFile)
            .toString()
            .trim();
        logger.info(`room name ${room}`);

        return room;
    }

    public async execPromisified(command: string): Promise<string> {
        logger.info(`executing command: ${command}`);
        const execP: (command: string) => Promise<{
            stdout: string;
            stderr: string;
        }> = util.promisify(exec);

        const { stdout, stderr } = await execP(command);
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);

        return stdout;
    }
}

export async function lsExample(): Promise<void> {
    const execP: (command: string) => Promise<{
        stdout: string;
        stderr: string;
    }> = util.promisify(exec);

    const { stdout, stderr } = await execP('ls');
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
}
