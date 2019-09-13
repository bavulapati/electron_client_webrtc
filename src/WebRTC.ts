import { socketMessages } from './constants/socketMessages';
import { handleRemoteEvents } from './handleRemoteEvents';
import { IEventData, IIceCandidateMsg, ServerStatus } from './interfaces';
import { logger } from './logger';

/**
 * functions that handles the Real-Time Communications using WebRTC
 */
let sendChannel: RTCDataChannel | undefined;
let localPeerConnection: RTCPeerConnection | undefined;
let localStream: MediaStream | undefined;
// tslint:disable-next-line: typedef
const mediaStreamConstraints = {
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
const offerOptions: RTCOfferOptions = {
    offerToReceiveVideo: true
};

// Handles start button action: creates local MediaStream.
export function startAction(room: string, socket: SocketIOClient.Socket): void {
    // tslint:disable-next-line: no-any // tslint:disable-next-line: no-unsafe-any
    (<any>navigator.mediaDevices).getUserMedia(mediaStreamConstraints)
        .then((mediaStream: MediaStream) => { gotLocalMediaStream(mediaStream, room, socket); })
        .catch(handleLocalMediaStreamError);
    logger.info('Requesting local stream.');
}

export function receivedRemoteIceCandidate(rTCIceCandidateInit: IIceCandidateMsg): void {

    if (rTCIceCandidateInit.candidate.trim().length !== 0) {
        const newIceCandidate: RTCIceCandidate = new RTCIceCandidate({
            candidate: rTCIceCandidateInit.candidate,
            sdpMLineIndex: rTCIceCandidateInit.label,
            sdpMid: rTCIceCandidateInit.id
        });

        if (localPeerConnection !== undefined) {
            localPeerConnection.addIceCandidate(newIceCandidate)
                .then(() => {
                    handleConnectionSuccess();
                })
                .catch((error: Error) => {
                    handleConnectionFailure(error);
                });
        }
    }
    logger.info(`ICE candidate:\n${rTCIceCandidateInit.candidate}.`);
}

// Logs answer to offer creation and sets peer connection session descriptions.
export function receivedRemoteAnswer(description: RTCSessionDescriptionInit): void {
    if (description !== null && localPeerConnection !== undefined) {
        logger.info(`Answer from remotePeerConnection:\n${description.sdp}.`);
        logger.info('localPeerConnection setRemoteDescription start.');
        localPeerConnection.setRemoteDescription(new RTCSessionDescription(description))
            .then(() => {
                if (localPeerConnection !== undefined) { setRemoteDescriptionSuccess(localPeerConnection); }
            })
            .catch(setSessionDescriptionError);
    }
}

// Handles hangup action: ends up call, closes connections and resets peers.
export function hangupAction(): void {
    if (sendChannel !== undefined) {
        sendChannel.close();
        logger.info(`Closed data channel with label: ${sendChannel.label}`);
    }
    if (localPeerConnection !== undefined) {
        localPeerConnection.close();
        localPeerConnection = undefined;
    }
    logger.info('Ending call.');
    // socket.close();
}

// Sets the MediaStream as the video element src.
function gotLocalMediaStream(mediaStream: MediaStream, room: string, socket: SocketIOClient.Socket): void {
    localStream = mediaStream;
    logger.info('Received local stream.');
    answerCall(room, socket);
}

// Logs that the connection failed.
function handleConnectionFailure(error: Error): void {
    logger.info(`failed to add ICE Candidate:\n${error.toString()}.`);
}

// Logs that the connection succeeded.
function handleConnectionSuccess(): void {
    logger.info(`host addIceCandidate success.`);
}

// Define MediaStreams callbacks.

// Handles error by logging a message to the console.
function handleLocalMediaStreamError(error: Event): void {
    logger.info(`navigator.getUserMedia error: ${error.toString()}.`);
}

// Gets the name of a certain peer connection.
function getPeerName(peerConnection: RTCPeerConnection): string {
    return (peerConnection === localPeerConnection) ?
        'localPeerConnection' : 'remotePeerConnection';
}

// Logs changes to the connection state.
function handleConnectionChange(event: Event): void {
    const peerConnection: RTCPeerConnection | null = <RTCPeerConnection>event.target;
    logger.info('ICE state change event: ', event);
    logger.info(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
    if (peerConnection.iceConnectionState === 'disconnected') {
        hangupAction();
    }
}

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection: RTCPeerConnection, functionName: string): void {
    const peerName: string = getPeerName(peerConnection);
    logger.info(`${peerName} ${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection: RTCPeerConnection): void {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error: Error): void {
    logger.info(`Failed to create session description: ${error.toString()}.`);
}

// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description: RTCSessionDescriptionInit, room: string, socket: SocketIOClient.Socket): void {
    logger.info(`Offer from localPeerConnection:\n${description.sdp}`);

    logger.info('localPeerConnection setLocalDescription start.');
    if (localPeerConnection !== undefined) {
        localPeerConnection.setLocalDescription(description)
            .then(() => {
                if (localPeerConnection !== undefined) { setLocalDescriptionSuccess(localPeerConnection); }
            })
            .catch(setSessionDescriptionError);
    }

    socket.emit(socketMessages.offer, description, room);

}

// Handles call button action: creates peer connection.
function answerCall(room: string, socket: SocketIOClient.Socket): void {

    logger.info('Answering call.');

    if (localStream !== undefined) {

        // Get local media stream tracks.
        const videoTracks: MediaStreamTrack[] = localStream.getVideoTracks();
        const audioTracks: MediaStreamTrack[] = localStream.getAudioTracks();
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
                urls: ['turn:bmrturn.idrivelite.com:3478'],
                username: 'bmr-turn-user',
                credential: 'insecure-key'
            }]
        };

        // Create peer connections and add behavior.
        localPeerConnection = new RTCPeerConnection(servers);
        logger.info('Created local peer connection object localPeerConnection.');

        createDataChannel(socket);

        localPeerConnection.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
            handleConnection(event, room, socket);
        });
        localPeerConnection.addEventListener('iceconnectionstatechange', (event: Event) => {
            handleConnectionChange(event);
        });

        // Add local stream to connection and create offer to connect.

        localStream.getTracks()
            .forEach((track: MediaStreamTrack) => {
                if (localPeerConnection !== undefined && localStream !== undefined) {
                    localPeerConnection.addTrack(track, localStream);
                }
            });

        logger.info('Added local stream to localPeerConnection.');

        logger.info('localPeerConnection createOffer start.');
        localPeerConnection.createOffer(offerOptions)
            .then((description: RTCSessionDescriptionInit) => { createdOffer(description, room, socket); })
            .catch(setSessionDescriptionError);
    }
}

// Define RTC peer connection behavior.

// Connects with new peer candidate.
function handleConnection(event: RTCPeerConnectionIceEvent, room: string, socket: SocketIOClient.Socket): void {
    const peerConnection: RTCPeerConnection | null = <RTCPeerConnection>event.target;
    const iceCandidate: RTCIceCandidate | null = event.candidate;

    if (iceCandidate !== null && iceCandidate.sdpMid !== null && iceCandidate.sdpMLineIndex !== null) {
        const candidateMsg: IIceCandidateMsg = {
            candidate: iceCandidate.candidate,
            id: iceCandidate.sdpMid,
            label: iceCandidate.sdpMLineIndex
        };

        socket.emit(socketMessages.iceCandidate, candidateMsg, room);

        logger.info(`${getPeerName(peerConnection)} ICE candidate:\n${iceCandidate.candidate}.`);
    }
}

function onSendChannelStateChange(socket: SocketIOClient.Socket): void {
    const readyState: RTCDataChannelState = sendChannel === undefined ? 'closed' : sendChannel.readyState;
    logger.info(`Send channel state is: ${readyState}`);
    if (readyState === 'open') {
        logger.info('Send channel is open');
        socket.emit(socketMessages.statusUpdate, ServerStatus.insession);
    }
    if (sendChannel !== undefined && readyState === 'closed') {
        socket.emit(socketMessages.statusUpdate, ServerStatus.online);
        logger.info('The Data Channel is Closed');
        // tslint:disable-next-line: no-null-keyword
        sendChannel.onmessage = null;
        // tslint:disable-next-line: no-null-keyword
        sendChannel.onopen = null;
        // tslint:disable-next-line: no-null-keyword
        sendChannel.onerror = null;
        // tslint:disable-next-line: no-null-keyword
        sendChannel.onclose = null;
    }
}

function createDataChannel(socket: SocketIOClient.Socket): void {
    if (localPeerConnection !== undefined) {
        sendChannel = localPeerConnection.createDataChannel('sendDataChannel');

        sendChannel.onerror = (error: RTCErrorEvent): void => {
            logger.error('Data Channel Error:', error);
        };

        sendChannel.onmessage = (event: MessageEvent): void => {
            handleRemoteEvents(<IEventData>JSON.parse(<string>event.data));
        };

        logger.info('Created send data channel');

        sendChannel.onclose = sendChannel.onopen = (): void => { onSendChannelStateChange(socket); };
        // sendChannel.onclose = onSendChannelStateChange;
    }
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection: RTCPeerConnection): void {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}
