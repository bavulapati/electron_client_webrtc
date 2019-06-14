import { ipcRenderer } from 'electron';
import fs from 'fs';
import robot from 'robotjs';
import io from 'socket.io-client';
import { socketMessages } from './constants/socketMessages';
import { logger } from './logger';

logger.info('Launching host');

// Speed up the mouse.
robot.setMouseDelay(2);

let room: string;

let client: string;

interface ICandidateMsg {
    label: number;
    id: string;
    candidate: string;
}

interface IConnectionQuery {
    accessToken: string;
}

const connectionQuery: IConnectionQuery = {
    accessToken: 'ddddvalid' // valid if 'valid'
};

// tslint:disable-next-line: no-http-string
const socket: SocketIOClient.Socket = io('http://localhost:8080', { query: connectionQuery });

socket.on('connect', () => {
    logger.info('socket connected');
    fs.readFile('/usr/local/serial.txt', (err: NodeJS.ErrnoException | null, data: Buffer): void => {
        if (err !== null) {
            logger.error(err);
        } else {
            room = data.toString()
                .trim();
            socket.emit(socketMessages.createOrJoinRoom, room);
        }
    });
});

socket.on('disconnect', () => {
    logger.info('socket disconnected.');
});

socket.on('error', (err: string) => {
    logger.error(err);
    // socket.close();
});

socket.on(socketMessages.created, (roomName: string, clientId: string) => {
    logger.info(`Created a room as ${roomName} and joined as ${clientId}`);
    client = clientId;
    ipcRenderer.send('show-main-window');
});

socket.on(socketMessages.full, (roomName: string) => {
    logger.info(`Message from client: Room ${roomName} is full :^(`);
});

socket.on(socketMessages.joined, (roomName: string, clientId: string) => {
    logger.info(`Joined room ${roomName} as ${clientId}`);
    client = clientId;
    ipcRenderer.send('show-main-window');
});

socket.on(socketMessages.startCall, () => {
    logger.info('viewer wants to connect');
    startAction();
});

socket.on(socketMessages.iceCandidate, (iceCandidate: ICandidateMsg) => {
    logger.info(`received ${socketMessages.iceCandidate} as : ${iceCandidate}`);
    receivedRemoteIceCandidate(iceCandidate);
});

socket.on(socketMessages.answer, (description: RTCSessionDescriptionInit) => {
    logger.info(`received ${socketMessages.answer} as : ${description}`);
    receivedRemoteAnswer(description);
});

socket.on(socketMessages.hangUp, () => {
    logger.info('host received hang up.');
    hangupAction();
});

// Define initial start time of the call (defined as connection between peers).
let startTime: number;

let localStream: MediaStream;

let localPeerConnection: RTCPeerConnection | undefined;

let sendChannel: RTCDataChannel;

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

// Handles hangup action: ends up call, closes connections and resets peers.
function hangupAction(): void {
    sendChannel.close();
    logger.info(`Closed data channel with label: ${sendChannel.label}`);
    if (localPeerConnection !== undefined) { localPeerConnection.close(); }
    localPeerConnection = undefined;
    logger.info('Ending call.');
    // socket.close();
}

// Define MediaStreams callbacks.

// Sets the MediaStream as the video element src.
function gotLocalMediaStream(mediaStream: MediaStream): void {
    localStream = mediaStream;
    logger.info('Received local stream.');
    answerCall();
}

// Handles error by logging a message to the console.
function handleLocalMediaStreamError(error: Event): void {
    logger.info(`navigator.getUserMedia error: ${error.toString()}.`);
}

// Handles start button action: creates local MediaStream.
function startAction(): void {
    // tslint:disable-next-line: no-any // tslint:disable-next-line: no-unsafe-any
    (<any>navigator.mediaDevices).getUserMedia(mediaStreamConstraints)
        .then(gotLocalMediaStream)
        .catch(handleLocalMediaStreamError);
    logger.info('Requesting local stream.');
}

// Handles call button action: creates peer connection.
function answerCall(): void {

    logger.info('Answering call.');
    startTime = window.performance.now();

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
            urls: ['turn:ec2-54-169-187-87.ap-southeast-1.compute.amazonaws.com:3478'],
            username: 'bmr-turn-user',
            credential: 'insecure-key'
        }]
    };

    // Create peer connections and add behavior.
    localPeerConnection = new RTCPeerConnection(servers);
    logger.info('Created local peer connection object localPeerConnection.');

    creaeDataChannel();

    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);

    // Add local stream to connection and create offer to connect.

    localStream.getTracks()
        .forEach((track: MediaStreamTrack) => {
            if (localPeerConnection !== undefined) { localPeerConnection.addTrack(track, localStream); }
        });

    logger.info('Added local stream to localPeerConnection.');

    logger.info('localPeerConnection createOffer start.');
    localPeerConnection.createOffer(offerOptions)
        .then(createdOffer)
        .catch(setSessionDescriptionError);
}

function handleRemoteEvents(eventData: IEventData): void {
    let button: string = 'left';
    switch (eventData.button) {
        case 0:
            button = 'left';
            break;
        case 1:
            button = 'middle';
            break;
        case 2:
            button = 'right';
            break;
        default:
            logger.info('unhandled button');
    }
    switch (eventData.eventType) {
        case 'mousemove':
            robot.moveMouse(eventData.x, eventData.y);
            break;
        case 'mousedown':
            robot.mouseToggle('down', button);
            break;
        case 'mouseup':
            robot.mouseToggle('up', button);
            break;
        case 'keydown':
            logger.info('Got Data Channel Message:', eventData);
            robot.keyToggle(eventData.keyCode, 'down');
            break;
        case 'keyup':
            robot.keyToggle(eventData.keyCode, 'up');
            break;
        default:
            logger.info('unhandled eventdata ', event);
    }
}

function creaeDataChannel(): void {
    if (localPeerConnection !== undefined) {
        sendChannel = localPeerConnection.createDataChannel('sendDataChannel');
    }
    sendChannel.onerror = (error: RTCErrorEvent): void => {
        logger.error('Data Channel Error:', error);
    };

    sendChannel.onmessage = (event: MessageEvent): void => {
        handleRemoteEvents(<IEventData>JSON.parse(<string>event.data));
    };

    logger.info('Created send data channel');

    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;
}

function onSendChannelStateChange(): void {
    const readyState: RTCDataChannelState = sendChannel.readyState;
    logger.info(`Send channel state is: ${readyState}`);
    if (readyState === 'open') {
        logger.info('Send channel is open');
    }
    if (readyState === 'closed') {
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

// Define RTC peer connection behavior.

// Connects with new peer candidate.
function handleConnection(event: RTCPeerConnectionIceEvent): void {
    const peerConnection: RTCPeerConnection | null = <RTCPeerConnection>event.target;
    const iceCandidate: RTCIceCandidate | null = event.candidate;

    if (iceCandidate !== null && iceCandidate.sdpMid !== null && iceCandidate.sdpMLineIndex !== null) {
        const candidateMsg: ICandidateMsg = {
            candidate: iceCandidate.candidate,
            id: iceCandidate.sdpMid,
            label: iceCandidate.sdpMLineIndex
        };

        socket.emit(socketMessages.iceCandidate, candidateMsg, room, client);

        logger.info(`${getPeerName(peerConnection)} ICE candidate:\n${iceCandidate.candidate}.`);
    }
}

function receivedRemoteIceCandidate(rTCIceCandidateInit: ICandidateMsg): void {

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
    logger.info(`ICE candidate:\n${rTCIceCandidateInit.candidate}.`);
}

// Logs that the connection succeeded.
function handleConnectionSuccess(): void {
    logger.info(`host addIceCandidate success.`);
}

// Logs that the connection failed.
function handleConnectionFailure(error: Error): void {
    logger.info(`failed to add ICE Candidate:\n${error.toString()}.`);
}

// Logs changes to the connection state.
function handleConnectionChange(event: Event): void {
    const peerConnection: RTCPeerConnection | null = <RTCPeerConnection>event.target;
    logger.info('ICE state change event: ', event);
    logger.info(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

// Define helper functions.

// Gets the name of a certain peer connection.
function getPeerName(peerConnection: RTCPeerConnection): string {
    return (peerConnection === localPeerConnection) ?
        'localPeerConnection' : 'remotePeerConnection';
}

// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description: RTCSessionDescriptionInit): void {
    logger.info(`Offer from localPeerConnection:\n${description.sdp}`);

    logger.info('localPeerConnection setLocalDescription start.');
    if (localPeerConnection !== undefined) {
        localPeerConnection.setLocalDescription(description)
            .then(() => {
                if (localPeerConnection !== undefined) { setLocalDescriptionSuccess(localPeerConnection); }
            })
            .catch(setSessionDescriptionError);
    }

    socket.emit(socketMessages.offer, description, room, client);

}

// Logs answer to offer creation and sets peer connection session descriptions.
function receivedRemoteAnswer(description: RTCSessionDescriptionInit): void {
    logger.info(`Answer from remotePeerConnection:\n${description.sdp}.`);

    logger.info('localPeerConnection setRemoteDescription start.');
    if (localPeerConnection !== undefined) {
        localPeerConnection.setRemoteDescription(new RTCSessionDescription(description))
            .then(() => {
                if (localPeerConnection !== undefined) { setRemoteDescriptionSuccess(localPeerConnection); }
            })
            .catch(setSessionDescriptionError);
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
// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection: RTCPeerConnection): void {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

interface IMouseCoordinates {
    x: number;
    y: number;
}

interface IEventData extends IMouseCoordinates {
    eventType: string;
    button: number;
    keyCode: string;
}
