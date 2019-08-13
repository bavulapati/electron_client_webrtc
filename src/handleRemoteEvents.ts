import robot from 'robotjs';
import { IEventData } from './interfaces';
import { logger } from './logger';

// Speed up the mouse.
robot.setMouseDelay(2);

const blockedKeyCode: string[] = [
    'AltLeft',
    'AltRight',
    'MetaLeft',
    'MetaRight',
    'Escape',
    'F1',
    'F2',
    'F3',
    'F4',
    'F5',
    'F6',
    'F7',
    'F8',
    'F9',
    'F10',
    'F11',
    'F12',
    'ControlLeft',
    'ControlRight',
    'PrintScreen',
    'Backspace',
    'Insert',
    'Home',
    'Delete',
    'End',
    ''
];

export function handleRemoteEvents(eventData: IEventData): void {
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
            logger.info('Got Data Channel Message:', eventData.keyCode);
            if (blockedKeyCode.includes(eventData.keyCode.trim()) === false) {
                robot.keyToggle(eventData.keyCode.trim(), 'down');
            } else {
                logger.info('Got a message which is not allowed');
            }
            break;
        case 'keyup':
            logger.info('Got Data Channel Message:', eventData.keyCode);
            if (blockedKeyCode.includes(eventData.keyCode.trim()) === false) {
                robot.keyToggle(eventData.keyCode.trim(), 'up');
            } else {
                logger.info('Got a message which is not allowed');
            }
            break;
        default:
            logger.info('unhandled eventdata ', event);
    }
}
