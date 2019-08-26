import { build, CliOptions, Configuration } from 'electron-builder';

const config: Configuration = {
    appId: 'com.gitlab.bavulapati.bmr_remotehost',
    linux: {
        category: 'Network'
    },
    files: [
        '**/*',
        // tslint:disable-next-line: no-invalid-template-strings
        // '!src${/*}',
        // '!release/**/*.map',
        '!tsconfig.json',
        '!tslint.json',
        '!*.md'
    ]
};
const rawOptions: CliOptions = {
    x64: true,
    linux: ['deb'],
    config: config
};

build(rawOptions)
    .then((paths: string[]) => {
        // tslint:disable-next-line: no-console
        console.log('paths packages are at: ', paths);
    })
    .catch((reason: Error) => {
        // tslint:disable-next-line: no-console
        console.log(reason);
    });
