import fs from 'fs';
import io from 'socket.io-client';
import { lsExample } from './bmrUtilities';
import { serialKeyFile, singalingServer } from './constants/strings';
import { IBmrUtilityResponse, IConnectionQuery } from './interfaces';
import { logger } from './logger';
import { SocketListeners } from './SocketListeners';

logger.info('Launching host');

const bmrUtilityResponse: IBmrUtilityResponse = {
    user_name: 'vinaybmr@myworld.com',
    bmr_serial_key: 'BMR-SERIAL-KEY30',
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
    .addAll(socket, getRoomName());

function getRoomName(): string {
    const room: string = fs.readFileSync(serialKeyFile)
        .toString()
        .trim();
    logger.info(`room name ${room}`);

    return room;
}
