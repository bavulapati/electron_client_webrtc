import { exec } from 'child_process';
import fs from 'fs';
import util from 'util';
import { getTokenCommand, serialKeyFile } from './constants/strings';
import { GetTokenResponseStatus, IGetTokenResponse, IGetTokenResponseData } from './interfaces';
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

    public async getUserDetails(): Promise<IGetTokenResponseData> {
        return new Promise(
            async (
                resolve: (value: IGetTokenResponseData) => void,
                reject: (reason: string) => void): Promise<void> => {
                // reject(`Testing remote quit`);
                try {
                    const getTokenResponse: IGetTokenResponse
                        = <IGetTokenResponse>JSON.parse(await this.execPromisified(getTokenCommand));
                    if (getTokenResponse.status === GetTokenResponseStatus.failure) {
                        reject('cloud_manage returned with failure status');
                    } else {
                        resolve(getTokenResponse.data);
                    }
                } catch (err) {
                    logger.error(`error getting user details ${err}`);

                    reject(`${err}`);
                }
            });
    }

    private async execPromisified(command: string): Promise<string> {
        return new Promise(
            async (
                resolve: (value: string) => void,
                reject: (reason: string) => void): Promise<void> => {

                logger.info(`executing command: ${command}`);
                const execP: (command: string) => Promise<{
                    stdout: string;
                    stderr: string;
                }> = util.promisify(exec);
                try {
                    const { stdout, stderr } = await execP(command);
                    if (stderr === null) {
                        logger.error('stderr:', stderr);
                        reject(stderr);
                    } else {
                        logger.info('stdout:', stdout);
                        resolve(stdout);
                    }
                } catch (err) {
                    logger.error(`error executing '${command}' - ${err}`);
                    reject(`${err}`);
                }
            });
    }

}
