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
const socket: SocketIOClient.Socket = io('http://localhost:8080', { query: connectionQuery });

socket.on('connect', async () => {
    logger.info('socket connected');
    const room: string = getRoomName();
    if (socket.hasListeners(socketMessages.createOrJoinRoom) === false) {
        await new SocketListeners(socket, room).addAll();
    }
    socket.emit(socketMessages.createOrJoinRoom, room);
});

socket.on('disconnect', () => {
    logger.info('socket disconnected.');
});

function getRoomName(): string {
    const room: string = fs.readFileSync('/usr/local/serial.txt')
        .toString();
    logger.info(`room name ${room}`);

    return room;
}
