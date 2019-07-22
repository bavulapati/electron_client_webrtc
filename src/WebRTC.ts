import { socketMessages } from './constants/socketMessages';
import { handleRemoteEvents } from './handleRemoteEvents';
import { IEventData, IIceCandidateMsg } from './interfaces';
import { logger } from './logger';

/**
 * Class that handles the Real-Time Communications using WebRTC
 */
export class WebRTC {
    private readonly socket: SocketIOClient.Socket;
    private readonly room: string;

    private sendChannel: RTCDataChannel | undefined;
    private localPeerConnection: RTCPeerConnection | undefined;
    private localStream: MediaStream | undefined;
    // tslint:disable-next-line: typedef
    private readonly mediaStreamConstraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'screen',
                minHeight: 405,
                minWidth: 720
            }
        }
    };
    // Set up to exchange only video.
    private readonly offerOptions: RTCOfferOptions = {
        offerToReceiveVideo: true
    };

    constructor(socket: SocketIOClient.Socket, room: string) {
        this.socket = socket;
        this.room = room;
    }

    // Handles start button action: creates local MediaStream.
    public startAction(): void {
        // tslint:disable-next-line: no-any // tslint:disable-next-line: no-unsafe-any
        (<any>navigator.mediaDevices).getUserMedia(this.mediaStreamConstraints)
            .then(this.gotLocalMediaStream)
            .catch(this.handleLocalMediaStreamError);
        logger.info('Requesting local stream.');
    }

    public receivedRemoteIceCandidate(rTCIceCandidateInit: IIceCandidateMsg): void {

        const newIceCandidate: RTCIceCandidate = new RTCIceCandidate({
            candidate: rTCIceCandidateInit.candidate,
            sdpMLineIndex: rTCIceCandidateInit.label,
            sdpMid: rTCIceCandidateInit.id
        });

        if (this.localPeerConnection !== undefined) {
            this.localPeerConnection.addIceCandidate(newIceCandidate)
                .then(() => {
                    this.handleConnectionSuccess();
                })
                .catch((error: Error) => {
                    this.handleConnectionFailure(error);
                });
        }
        logger.info(`ICE candidate:\n${rTCIceCandidateInit.candidate}.`);
    }

    // Logs answer to offer creation and sets peer connection session descriptions.
    public receivedRemoteAnswer(description: RTCSessionDescriptionInit): void {
        logger.info(`Answer from remotePeerConnection:\n${description.sdp}.`);

        logger.info('localPeerConnection setRemoteDescription start.');
        if (this.localPeerConnection !== undefined) {
            this.localPeerConnection.setRemoteDescription(new RTCSessionDescription(description))
                .then(() => {
                    if (this.localPeerConnection !== undefined) { this.setRemoteDescriptionSuccess(this.localPeerConnection); }
                })
                .catch(this.setSessionDescriptionError);
        }
    }

    // Handles hangup action: ends up call, closes connections and resets peers.
    public hangupAction(): void {
        if (this.sendChannel !== undefined) {
            this.sendChannel.close();
            logger.info(`Closed data channel with label: ${this.sendChannel.label}`);
        }
        if (this.localPeerConnection !== undefined) {
            this.localPeerConnection.close();
            this.localPeerConnection = undefined;
        }
        logger.info('Ending call.');
        // socket.close();
    }

    // Sets the MediaStream as the video element src.
    private gotLocalMediaStream(mediaStream: MediaStream): void {
        this.localStream = mediaStream;
        logger.info('Received local stream.');
        this.answerCall();
    }

    // Logs that the connection failed.
    private handleConnectionFailure(error: Error): void {
        logger.info(`failed to add ICE Candidate:\n${error.toString()}.`);
    }

    // Logs that the connection succeeded.
    private handleConnectionSuccess(): void {
        logger.info(`host addIceCandidate success.`);
    }

    // Define MediaStreams callbacks.

    // Handles error by logging a message to the console.
    private handleLocalMediaStreamError(error: Event): void {
        logger.info(`navigator.getUserMedia error: ${error.toString()}.`);
    }

    // Gets the name of a certain peer connection.
    private getPeerName(peerConnection: RTCPeerConnection): string {
        return (peerConnection === this.localPeerConnection) ?
            'localPeerConnection' : 'remotePeerConnection';
    }

    // Logs changes to the connection state.
    private handleConnectionChange(event: Event): void {
        const peerConnection: RTCPeerConnection | null = <RTCPeerConnection>event.target;
        logger.info('ICE state change event: ', event);
        logger.info(`${this.getPeerName(peerConnection)} ICE state: ` +
            `${peerConnection.iceConnectionState}.`);
    }

    // Logs success when setting session description.
    private setDescriptionSuccess(peerConnection: RTCPeerConnection, functionName: string): void {
        const peerName: string = this.getPeerName(peerConnection);
        logger.info(`${peerName} ${functionName} complete.`);
    }

    // Logs success when localDescription is set.
    private setLocalDescriptionSuccess(peerConnection: RTCPeerConnection): void {
        this.setDescriptionSuccess(peerConnection, 'setLocalDescription');
    }

    // Logs error when setting session description fails.
    private setSessionDescriptionError(error: Error): void {
        logger.info(`Failed to create session description: ${error.toString()}.`);
    }

    // Logs offer creation and sets peer connection session descriptions.
    private createdOffer(description: RTCSessionDescriptionInit): void {
        logger.info(`Offer from localPeerConnection:\n${description.sdp}`);

        logger.info('localPeerConnection setLocalDescription start.');
        if (this.localPeerConnection !== undefined) {
            this.localPeerConnection.setLocalDescription(description)
                .then(() => {
                    if (this.localPeerConnection !== undefined) { this.setLocalDescriptionSuccess(this.localPeerConnection); }
                })
                .catch(this.setSessionDescriptionError);
        }

        this.socket.emit(socketMessages.offer, description, this.room);

    }

    // Handles call button action: creates peer connection.
    private answerCall(): void {

        logger.info('Answering call.');

        if (this.localStream !== undefined) {

            // Get local media stream tracks.
            const videoTracks: MediaStreamTrack[] = this.localStream.getVideoTracks();
            const audioTracks: MediaStreamTrack[] = this.localStream.getAudioTracks();
            if (videoTracks.length > 0) {
                logger.info(`Using video device: ${videoTracks[0].label}.`);
            }
            if (audioTracks.length > 0) {
                logger.info(`Using audio device: ${audioTracks[0].label}.`);
            }

            // Allows for RTC server configuration.
            const servers: RTCConfiguration = {
                iceServers: [{
                    // urls: ['stun:stun.l.google.com:19302']
                    urls: ['turn:ec2-54-169-187-87.ap-southeast-1.compute.amazonaws.com:3478'],
                    username: 'bmr-turn-user',
                    credential: 'insecure-key'
                }]
            };

            // Create peer connections and add behavior.
            this.localPeerConnection = new RTCPeerConnection(servers);
            logger.info('Created local peer connection object localPeerConnection.');

            this.creaeDataChannel();

            this.localPeerConnection.addEventListener('icecandidate', this.handleConnection);
            this.localPeerConnection.addEventListener('iceconnectionstatechange', this.handleConnectionChange);

            // Add local stream to connection and create offer to connect.

            this.localStream.getTracks()
                .forEach((track: MediaStreamTrack) => {
                    if (this.localPeerConnection !== undefined && this.localStream !== undefined) {
                        this.localPeerConnection.addTrack(track, this.localStream);
                    }
                });

            logger.info('Added local stream to localPeerConnection.');

            logger.info('localPeerConnection createOffer start.');
            this.localPeerConnection.createOffer(this.offerOptions)
                .then(this.createdOffer)
                .catch(this.setSessionDescriptionError);
        }
    }

    // Define RTC peer connection behavior.

    // Connects with new peer candidate.
    private handleConnection(event: RTCPeerConnectionIceEvent): void {
        const peerConnection: RTCPeerConnection | null = <RTCPeerConnection>event.target;
        const iceCandidate: RTCIceCandidate | null = event.candidate;

        if (iceCandidate !== null && iceCandidate.sdpMid !== null && iceCandidate.sdpMLineIndex !== null) {
            const candidateMsg: IIceCandidateMsg = {
                candidate: iceCandidate.candidate,
                id: iceCandidate.sdpMid,
                label: iceCandidate.sdpMLineIndex
            };

            this.socket.emit(socketMessages.iceCandidate, candidateMsg, this.room);

            logger.info(`${this.getPeerName(peerConnection)} ICE candidate:\n${iceCandidate.candidate}.`);
        }
    }

    private onSendChannelStateChange(): void {
        const readyState: RTCDataChannelState = this.sendChannel === undefined ? 'closed' : this.sendChannel.readyState;
        logger.info(`Send channel state is: ${readyState}`);
        if (readyState === 'open') {
            logger.info('Send channel is open');
        }
        if (this.sendChannel !== undefined && readyState === 'closed') {
            logger.info('The Data Channel is Closed');
            // tslint:disable-next-line: no-null-keyword
            this.sendChannel.onmessage = null;
            // tslint:disable-next-line: no-null-keyword
            this.sendChannel.onopen = null;
            // tslint:disable-next-line: no-null-keyword
            this.sendChannel.onerror = null;
            // tslint:disable-next-line: no-null-keyword
            this.sendChannel.onclose = null;
        }
    }

    private creaeDataChannel(): void {
        if (this.localPeerConnection !== undefined) {
            this.sendChannel = this.localPeerConnection.createDataChannel('sendDataChannel');

            this.sendChannel.onerror = (error: RTCErrorEvent): void => {
                logger.error('Data Channel Error:', error);
            };

            this.sendChannel.onmessage = (event: MessageEvent): void => {
                handleRemoteEvents(<IEventData>JSON.parse(<string>event.data));
            };

            logger.info('Created send data channel');

            this.sendChannel.onopen = this.onSendChannelStateChange;
            this.sendChannel.onclose = this.onSendChannelStateChange;
        }
    }

    // Logs success when remoteDescription is set.
    private setRemoteDescriptionSuccess(peerConnection: RTCPeerConnection): void {
        this.setDescriptionSuccess(peerConnection, 'setRemoteDescription');
    }

}
