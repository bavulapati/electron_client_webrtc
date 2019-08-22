import { remote } from 'electron';
import io from 'socket.io-client';
import { BmrUtilities, lsExample } from './bmrUtilities';
import { singalingServer } from './constants/strings';
import { IBmrUtilityResponse, IConnectionQuery, IGetTokenResponseData } from './interfaces';
import { logger } from './logger';
import { SocketListeners } from './SocketListeners';

logger.info('Launching host');

// const bmrUtilityResponse: IBmrUtilityResponse = {
//     user_name: 'vinaybmr@myworld.com',
//     bmr_serial_key: BmrUtilities.GET_INSTANCE()
//         .getRoomName(),
//     access_token: 'lifetime_host_access_token',
//     remote_disabled: 0
// };

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
        userName: userDetails.username
    };
    logger.info(`accessToken: ${connectionQuery.accessToken} and userName: ${connectionQuery.userName}`);
    const socket: SocketIOClient.Socket = io(singalingServer, { query: connectionQuery });

    SocketListeners.GET_INSTANCE()
        .addAll(socket, BmrUtilities.GET_INSTANCE()
            .getRoomName());
}

// const connectionQuery: IConnectionQuery = {
//     accessToken: bmrUtilityResponse.access_token,
//     userName: bmrUtilityResponse.user_name
// };

// lsExample()
//     .then()
//     .catch();

// const socket: SocketIOClient.Socket = io(singalingServer, { query: connectionQuery });

// SocketListeners.GET_INSTANCE()
//     .addAll(socket, bmrUtilityResponse.bmr_serial_key);
