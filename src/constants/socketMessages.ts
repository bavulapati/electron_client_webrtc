/**
 * List of messages to use with Socket
 */
class SocketMessages {

    public readonly message: string = 'message';
    public readonly iceCandidate: string = 'ice-candidate';
    public readonly offer: string = 'offer';
    public readonly answer: string = 'answer';
    public readonly startCall: string = 'start-call';
    public readonly hangUp: string = 'hang-up';
    public readonly createOrJoinRoom: string = 'create or join';
    public readonly created: string = 'created';
    public readonly joined: string = 'joined';
    public readonly join: string = 'join';
    public readonly ready: string = 'ready';
    public readonly full: string = 'full';
    public readonly register: string = 'register';
    public readonly registerResponse: string = 'register response';
}

export const socketMessages: SocketMessages = new SocketMessages();
