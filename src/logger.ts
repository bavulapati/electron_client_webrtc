import electronLog from 'electron-log';

function isDev(): boolean {
    if (process.mainModule !== undefined) {
        return process.mainModule.filename.indexOf('app.asar') === -1;
    }

    return false;
}
// Configure logger to use info level and max file size to be 1 MB
function configureLogger(): void {
    electronLog.transports.file.fileName = 'application.log';
    electronLog.transports.file.level = 'info';
    if (isDev() === false) {
        electronLog.transports.console.level = 'info';
    }
    // electronLog.transports.file.maxSize = 1024 * 1024;

    electronLog.catchErrors({
        onError: (error: Error): void => {
            electronLog.error(error.stack);
        }
    });
    electronLog.debug('Configured the logger');
}

configureLogger();

export { electronLog as logger };
