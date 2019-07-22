import robot from 'robotjs';
import { IEventData } from './interfaces';
import { logger } from './logger';

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
