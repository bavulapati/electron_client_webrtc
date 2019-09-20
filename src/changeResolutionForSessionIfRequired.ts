import { displayUtility, IResolution } from '@idrive-remotepc/display-utility';
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

            return resolutionChangedForSession;
        } else {
            displayUtility.setResolution(rROutput, prefferedResolution);
            resolutionChangedForSession = true;

            return resolutionChangedForSession;
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
