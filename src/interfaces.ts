export interface IIceCandidateMsg {
    label: number;
    id: string;
    candidate: string;
}

export interface IGetTokenResponse {
    status: GetTokenResponseStatus;
    data: IGetTokenResponseData;
}

export interface IGetTokenResponseData {
    username: string;
    access_token: string;
}

export enum GetTokenResponseStatus {
    success = 'success',
    failure = 'failure'
}

export interface IConnectionQuery {
    accessToken: string;
    userName: string;
    isHost: boolean;
    serialKey: string;
}

export interface IMouseCoordinates {
    x: number;
    y: number;
}

export interface IEventData extends IMouseCoordinates {
    eventType: string;
    button: number;
    keyCode: string;
}

export enum ServerStatus {
    online,
    offline,
    insession
}

export interface IBmrServer {
    id: number;
    name: string;
    serialKey: string;
    status: ServerStatus;
}
