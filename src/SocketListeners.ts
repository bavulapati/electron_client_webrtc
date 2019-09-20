import { socketMessages } from './constants/socketMessages';
import { IBmrServer, IIceCandidateMsg, ServerStatus } from './interfaces';
import { logger } from './logger';
import { hangupAction, receivedRemoteAnswer, receivedRemoteIceCandidate, startAction } from './WebRTC';

/**
 * Listeners for socket messages
 */
export class SocketListeners {
    private static socketListenersInstance: SocketListeners;

    private constructor() {
    }

    public static GET_INSTANCE(): SocketListeners {
        if (this.socketListenersInstance === undefined) {
            this.socketListenersInstance = new SocketListeners();
        }

        return this.socketListenersInstance;
    }

    /**
     * Add all listeners
     */
    public addAll(socket: SocketIOClient.Socket, room: string): void {

        logger.info('adding all socket listeners');
        // const connectionQuery: IConnectionQuery = <IConnectionQuery>(socket.io.opts.query);
        // socket.emit(socketMessages.register, room);
        // room = bmrUtilityResponse.bmr_serial_key;

        socket.on('connect', () => {
            logger.info('socket connected');
            socket.emit(socketMessages.createOrJoinRoom, room);
        });

        socket.on('disconnect', () => {
            logger.info('socket disconnected.');
        });

        socket.on(socketMessages.registerResponse, (err?: Error) => {
            if (err === undefined) {
                logger.error(err);
            } else {
                logger.info('socket registered');
            }
        });

        socket.on('error', (err: string) => {
            logger.error(err);
            // socket.close();
        });

        socket.on(socketMessages.created, (roomName: string) => {
            logger.info(`Created a room as ${roomName} and joined`);
            // ipcRenderer.send('show-main-window');
        });

        socket.on(socketMessages.full, (roomName: string) => {
            logger.info(`Message from client: Room ${roomName} is full :^(`);
        });

        socket.on(socketMessages.joined, (roomName: string) => {
            logger.info(`Joined room ${roomName}`);
            // ipcRenderer.send('show-main-window');
        });

        socket.on(socketMessages.startCall, (roomName: string) => {
            logger.info('viewer wants to connect');
            startAction(room, socket);
        });

        socket.on(socketMessages.iceCandidate, (roomName: string, iceCandidate: IIceCandidateMsg) => {
            logger.info(`received ${socketMessages.iceCandidate} as : ${JSON.stringify(iceCandidate)}`);
            receivedRemoteIceCandidate(iceCandidate);
        });

        socket.on(socketMessages.answer, (description: RTCSessionDescriptionInit) => {
            logger.info(`received ${socketMessages.answer} as : ${description}`);
            receivedRemoteAnswer(description);
        });

        socket.on(socketMessages.hangUp, (roomName: string) => {
            logger.info('host received hang up.');
            hangupAction();
        });

        socket.on(socketMessages.serverList, (servers: IBmrServer[]) => {
            console.log('on serverlist');
            console.log(JSON.stringify(servers));
        });

        // this.webrtc.on(socketMessages.statusUpdate, (status: ServerStatus) => {
        //     logger.info(`emiting status update - ${status}`);
        //     socket.emit(socketMessages.statusUpdate, status);
        // });

    }
}
