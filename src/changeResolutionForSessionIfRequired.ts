import { ChildProcess, spawn } from 'child_process';
import { Rectangle, screen as electronScreen } from 'electron';
import { logger } from './logger';

export function changeResolutionForSessionIfRequired(): boolean {
    const screenBounds: Rectangle = electronScreen.getPrimaryDisplay().bounds;
    logger.info(`PrimaryDisplay resolution : ${screenBounds.width} x ${screenBounds.height}`);
    const prefferedWidth: number = 1920;
    const prefferedHeight: number = 1080;
    if (screenBounds.width >= prefferedWidth) {
        logger.info('the screen already have required resolution. Not changing resolution');

        return false;
    } else {
        changeResolution(`${prefferedWidth}x${prefferedHeight}`);

        return true;
    }
}

export function changeResolution(resolution?: string): void {
    const args: string[] = ['--output', 'DP-1'];
    if (resolution === undefined) {
        args.push('auto');
        logger.info('switching resolution back');
    } else {
        args.push('--mode', resolution);
        logger.info(`switching resolution to ${resolution}`);
    }
    const cProcess: ChildProcess = spawn('xrandr', args);
    cProcess.stdout.on('data', (data: unknown) => {
        logger.info(`xrandr stdout: ${data}`);
    });

    cProcess.stderr.on('data', (data: unknown) => {
        logger.error(`xrandr stderr: ${data}`);
    });

    cProcess.on('close', (code: unknown) => {
        logger.info(`child process exited with code ${code} `);
    });
}
