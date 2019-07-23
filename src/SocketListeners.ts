import { ipcRenderer } from 'electron';
import { socketMessages } from './constants/socketMessages';
import { IIceCandidateMsg } from './interfaces';
import { logger } from './logger';
import { WebRTC } from './WebRTC';

/**
 * Listeners for socket messages
 */
export class SocketListeners {
    private readonly socket: SocketIOClient.Socket;
    private readonly room: string;
    private readonly webrtc: WebRTC;

    constructor(socket: SocketIOClient.Socket, room: string) {
        this.room = room;
        this.socket = socket;
        this.webrtc = new WebRTC(socket, room);
    }

    /**
     * onSocketConnect
     */
    public async addAll(): Promise<void> {

        logger.info('adding all socket listeners');
        // socket.emit(socketMessages.register, bmrUtilityResponse);
        // room = bmrUtilityResponse.bmr_serial_key;
        this.socket.emit(socketMessages.createOrJoinRoom, this.room);

        this.socket.on(socketMessages.registerResponse, (err?: Error) => {
            if (err === undefined) {
                logger.error(err);
            } else {
                logger.info('socket registered');
            }
        });

        this.socket.on('error', (err: string) => {
            logger.error(err);
            // socket.close();
        });

        this.socket.on(socketMessages.created, (roomName: string) => {
            logger.info(`Created a room as ${roomName} and joined`);
            ipcRenderer.send('show-main-window');
        });

        this.socket.on(socketMessages.full, (roomName: string) => {
            logger.info(`Message from client: Room ${roomName} is full :^(`);
        });

        this.socket.on(socketMessages.joined, (roomName: string) => {
            logger.info(`Joined room ${roomName}`);
            ipcRenderer.send('show-main-window');
        });

        this.socket.on(socketMessages.startCall, () => {
            logger.info('viewer wants to connect');
            this.webrtc.startAction();
        });

        this.socket.on(socketMessages.iceCandidate, (iceCandidate: IIceCandidateMsg) => {
            logger.info(`received ${socketMessages.iceCandidate} as : ${iceCandidate}`);
            this.webrtc.receivedRemoteIceCandidate(iceCandidate);
        });

        this.socket.on(socketMessages.answer, (description: RTCSessionDescriptionInit) => {
            logger.info(`received ${socketMessages.answer} as : ${description}`);
            this.webrtc.receivedRemoteAnswer(description);
        });

        this.socket.on(socketMessages.hangUp, () => {
            logger.info('host received hang up.');
            this.webrtc.hangupAction();
        });
    }
}
