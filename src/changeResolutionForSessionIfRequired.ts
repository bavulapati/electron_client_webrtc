import { displayUtility, IResolution } from '@idrive-remotepc/display-utility';
import { ChildProcess, spawn } from 'child_process';
import { logger } from './logger';

let previousResolution: IResolution | undefined;
let resolutionChangedForSession: boolean = false;
let rROutput: number;

export function changeResolutionForSessionIfRequired(): boolean {
    rROutput = displayUtility.getPrimaryRROutput();
    if (rROutput === 0) {
        resolutionChangedForSession = false;

        return resolutionChangedForSession;
    }
    previousResolution = displayUtility.getCurrentResolution(rROutput);
    const prefferedResolution: IResolution = { width: 1920, height: 1080 };
    if (previousResolution !== undefined) {
        logger.info(`PrimaryDisplay resolution : ${previousResolution.width} x ${previousResolution.height}`);
        if (previousResolution.width >= prefferedResolution.width) {
            logger.info('the screen already have required resolution. Not changing resolution');
            resolutionChangedForSession = false;
        } else {
            logger.info('switching the screen resolution to required resolution.');
            const prefferedResolutionMode: string = '1920x1080_60.00';
            setResolution(displayUtility.getOutputName(rROutput), prefferedResolutionMode);
            resolutionChangedForSession = true;
        }
    }

    return resolutionChangedForSession;
}

export function revertResolutionChange(): void {
    if (resolutionChangedForSession && rROutput !== 0 && previousResolution !== undefined) {
        displayUtility.setResolution(rROutput, previousResolution);
        resolutionChangedForSession = false;
    }
}

function setResolution(outputName: string, modeName: string): void {
    const childP: ChildProcess = spawn('xrandr', ['--output', outputName, '--mode', modeName]);

    childP.stdout.on('data', (data: unknown) => {
        console.log(`stdout: ${data}`);
    });

    childP.stderr.on('data', (data: unknown) => {
        console.error(`stderr: ${data}`);
    });

    childP.on('close', (code: unknown) => {
        console.log(`child process exited with code ${code}`);
    });

}
