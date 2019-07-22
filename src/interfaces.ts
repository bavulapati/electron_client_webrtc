export interface IIceCandidateMsg {
    label: number;
    id: string;
    candidate: string;
}

export interface IBmrUtilityResponse {
    user_name: string;
    bmr_serial_key: string;
    access_token: string;
    remote_disabled: number;
}

export interface IConnectionQuery {
    accessToken: string;
    userName: string;
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
