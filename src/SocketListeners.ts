import { socketMessages } from './constants/socketMessages';
import { IBmrServer, IIceCandidateMsg } from './interfaces';
import { logger } from './logger';
import { WebRTC } from './WebRTC';

/**
 * Listeners for socket messages
 */
export class SocketListeners {
    private static socketListenersInstance: SocketListeners;
    private readonly webrtc: WebRTC;

    private constructor() {
        this.webrtc = WebRTC.GET_INSTANCE();
    }

    public static GET_INSTANCE(): SocketListeners {
        if (this.socketListenersInstance === undefined) {
            this.socketListenersInstance = new SocketListeners();
        }

        return this.socketListenersInstance;
    }

    /**
     * onSocketConnect
     */
    public addAll(socket: SocketIOClient.Socket, room: string): void {

        logger.info('adding all socket listeners');
        // socket.emit(socketMessages.register, bmrUtilityResponse);
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

        socket.on(socketMessages.startCall, () => {
            logger.info('viewer wants to connect');
            this.webrtc.startAction(room, socket);
        });

        socket.on(socketMessages.iceCandidate, (iceCandidate: IIceCandidateMsg) => {
            logger.info(`received ${socketMessages.iceCandidate} as : ${JSON.stringify(iceCandidate)}`);
            this.webrtc.receivedRemoteIceCandidate(iceCandidate);
        });

        socket.on(socketMessages.answer, (description: RTCSessionDescriptionInit) => {
            logger.info(`received ${socketMessages.answer} as : ${description}`);
            this.webrtc.receivedRemoteAnswer(description);
        });

        socket.on(socketMessages.hangUp, () => {
            logger.info('host received hang up.');
            this.webrtc.hangupAction();
        });

        socket.on(socketMessages.serverList, (servers: IBmrServer[]) => {
            console.log('on serverlist');
            console.log(JSON.stringify(servers));
        });

    }
}
