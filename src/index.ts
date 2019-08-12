import io from 'socket.io-client';
import { BmrUtilities } from './bmrUtilities';
import { singalingServer } from './constants/strings';
import { IBmrUtilityResponse, IConnectionQuery } from './interfaces';
import { logger } from './logger';
import { SocketListeners } from './SocketListeners';

logger.info('Launching host');

const bmrUtilityResponse: IBmrUtilityResponse = {
    user_name: 'vinaybmr@myworld.com',
    bmr_serial_key: BmrUtilities.GET_INSTANCE()
        .getRoomName(),
    access_token: 'lifetime_host_access_token',
    remote_disabled: 0
};

const connectionQuery: IConnectionQuery = {
    accessToken: bmrUtilityResponse.access_token,
    userName: bmrUtilityResponse.user_name
};

// lsExample()
//     .then()
//     .catch();

const socket: SocketIOClient.Socket = io(singalingServer, { query: connectionQuery });

SocketListeners.GET_INSTANCE()
    .addAll(socket, bmrUtilityResponse.bmr_serial_key);
