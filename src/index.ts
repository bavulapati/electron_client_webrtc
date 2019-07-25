import fs from 'fs';
import robot from 'robotjs';
import io from 'socket.io-client';
import { socketMessages } from './constants/socketMessages';
import { IBmrUtilityResponse, IConnectionQuery } from './interfaces';
import { logger } from './logger';
import { SocketListeners } from './SocketListeners';

logger.info('Launching host');

// Speed up the mouse.
robot.setMouseDelay(2);

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

// tslint:disable-next-line: no-http-string
const socket: SocketIOClient.Socket = io('http://ec2-52-221-240-156.ap-southeast-1.compute.amazonaws.com:8080', { query: connectionQuery });

SocketListeners.GET_INSTANCE()
    .addAll(socket, getRoomName());

function getRoomName(): string {
    const room: string = fs.readFileSync('/usr/local/serial.txt')
        .toString()
        .trim();
    logger.info(`room name ${room}`);

    return room;
}
