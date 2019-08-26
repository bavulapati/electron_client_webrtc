import { remote } from 'electron';
import io from 'socket.io-client';
import { BmrUtilities } from './bmrUtilities';
import { singalingServer } from './constants/strings';
import { IConnectionQuery, IGetTokenResponseData } from './interfaces';
import { logger } from './logger';
import { SocketListeners } from './SocketListeners';

logger.info('Launching host');

BmrUtilities.GET_INSTANCE()
    .getUserDetails()
    .then((response: IGetTokenResponseData) => {
        connectToServer(response);
    })
    .catch((reason: string) => {
        logger.error(reason);
        remote.app.quit();
    });

function connectToServer(userDetails: IGetTokenResponseData): void {

    const connectionQuery: IConnectionQuery = {
        accessToken: userDetails.access_token,
        userName: userDetails.username,
        isHost: true,
        serialKey: BmrUtilities.GET_INSTANCE()
        .getRoomName()
    };
    logger.info(`accessToken: ${connectionQuery.accessToken} and userName: ${connectionQuery.userName}`);
    const socket: SocketIOClient.Socket = io(singalingServer, { query: connectionQuery });

    SocketListeners.GET_INSTANCE()
        .addAll(socket, connectionQuery.serialKey);
}
