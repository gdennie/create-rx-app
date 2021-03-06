# Create-RX-App

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/a-tarasyuk/create-rx-app/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/create-rx-app.svg?style=flat-square)](https://www.npmjs.com/package/create-rx-app) [![David](https://img.shields.io/david/a-tarasyuk/create-rx-app.svg?style=flat-square)](https://github.com/a-tarasyuk/create-rx-app) [![David](https://img.shields.io/david/dev/a-tarasyuk/create-rx-app.svg?style=flat-square)](https://github.com/a-tarasyuk/create-rx-app)

> [ReactXP](https://github.com/Microsoft/reactxp) Project Generator

## Installation

```shell
npm install create-rx-app -g
```

## Usage
### <abbr title="Command Line Interface">CLI</abbr>

```shell
Usage: create-rx-app <project-directory> [options]

Options:

  -J, --javascript  generate project in JavaScript
  -h, --help        output usage information
```

## Creating an App
To create a new app, run:

```shell
create-rx-app AppName
```

This will create a directory called **AppName** inside the current working directory. Inside **AppName**, this will generate the initial project structure and install all of its dependencies. Once this installation is done, there are some commands you can run in the project directory:

- `npm run start:web` - runs the Web version of the app in the development mode
- `npm run build:web` - builds the Web version of the app for production to the **dist-web** folder
- `npm run start:ios` - runs the iOS version of the app and attempts to open in the iOS Simulator if you're on a Mac and have it installed
- `npm run start:android` - runs the Android version of the app and attempts to open your app on a connected Android device or emulator
- `npm run start:windows` - runs the Windows version of the app
- `npm start` - runs RN development server

## License and Copyright

This software is released under the terms of the [MIT license](https://github.com/a-tarasyuk/create-rx-app/blob/master/LICENSE.md).