import template from 'mustache';
import username from 'username';
import chalk from 'chalk';
import shell from 'shelljs';
import uuid from 'uuid';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

interface Dictionary {
  [name: string]: any;
}

type SourceType = 'javascript' | 'typescript';

export interface GeneratorOptions {
  templatePath: string;
  projectName: string;
  projectPath: string;
  sourceType: SourceType;
}

const COMMON_FOLDER = 'common';
const KEYS_FOLDER = 'keys';
const WINDOWS_FOLDER = 'windows';

export class Generator {
  private projectPatterns: Dictionary = {};
  private packageJson: Dictionary = {};
  private options: GeneratorOptions;

  constructor(options: GeneratorOptions) {
    const { projectName } = options;

    this.projectPatterns = {
      DisplayName: projectName,
      ProjectTemplate: projectName,
      projecttemplate: projectName.toLowerCase(),
    };

    this.options = options;
  }

  public run(): void {
    const { projectPath } = this.options;

    console.log(chalk.white.bold('Setting up new ReactXP app in %s'), projectPath);
    fs.mkdirSync(projectPath);
    this.setPackageJson();

    this.generateApp();
    this.generatePackageJson();
    this.installDependencies();
    this.printInstructions();
  }

  private generateApp(): void {
    const { templatePath, sourceType } = this.options;
    const certificateThumbprint = this.buildWindowsCertificate();
    const ignorePaths = ['_package.json'];

    const contnetPatterns = {
      ...this.projectPatterns,
      ...certificateThumbprint && { certificateThumbprint },
      currentUser: username.sync(),
      packageGuid: uuid.v4(),
      projectGuid: uuid.v4(),
    };

    const pathPatterns = {
      ...this.projectPatterns,
      '_eslintrc': '.eslintrc',
      '_gitignore': '.gitignore',
      '_tsconfig.json': 'tsconfig.json',
      '_tslint.json': 'tslint.json',
    };

    const srcFolders = [COMMON_FOLDER, sourceType];
    if (!certificateThumbprint) {
      console.log(chalk.bold.yellow('[windows] Using Default Certificate. Use Visual Studio to renew it.'));
      srcFolders.push(KEYS_FOLDER);
    }

    srcFolders
      .map(folderName => path.join(templatePath, folderName))
      .forEach(srcPath => (
        this.walk(srcPath, ignorePaths).forEach((absolutePath: string) => {
          this.copy(absolutePath, this.buildDestPath(srcPath, absolutePath, pathPatterns), contnetPatterns);
        })
      ));
  }

  private generatePackageJson(): void {
    const { projectPath, projectName } = this.options;
    const packageJsonPath = path.resolve(projectPath, 'package.json');
    const packageJsonContent = {
      ...this.packageJson, dependencies: {}, devDependencies: {}, name: projectName.toLowerCase(),
    };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2));
  }

  private printInstructions(): void {
    const { projectName, projectPath } = this.options;
    const xcodeProjectPath = `${ path.resolve(projectPath, 'ios', projectName) }.xcodeproj`;

    console.log(chalk.green.bold('%s was successfully created. \n'), projectName);
    console.log(chalk.green.bold('To run your app on Web:'));
    console.log('  cd %s', projectPath);
    console.log(chalk.white.bold('  npm run start:web \n'));

    console.log(chalk.green.bold('To build Web production version of your app:'));
    console.log('  cd %s', projectPath);
    console.log(chalk.white.bold('  npm run build:web \n'));

    console.log(chalk.green.bold('To run your app on iOS:'));
    console.log('  cd %s', projectPath);
    console.log(chalk.white.bold('  npm run start:ios'));
    console.log('  - or -');
    console.log('  open %s project in Xcode', path.relative(projectPath, xcodeProjectPath));
    console.log('  press the Run button \n');

    console.log(chalk.green.bold('To run your app on Android:'));
    console.log('  cd %s', projectPath);
    console.log('  Have an Android emulator running (quickest way to get started), or a device connected.');
    console.log(chalk.white.bold('  npm run start:android'));
    console.log('  - or -');
    console.log(chalk.white.bold('  open android/ project in Android Studio'));
    console.log('  press the Run button \n');

    console.log(chalk.green.bold('To run your app on Windows:'));
    console.log('  cd %s', projectPath);
    console.log(chalk.white.bold('  npm run start:windows'));
  }

  private installDependencies(): void {
    const { projectPath } = this.options;
    shell.cd(projectPath);

    this.npmInstall(this.packageJson.devDependencies, 'devDependencies', ['--save-dev']);
    this.npmInstall(this.packageJson.dependencies, 'reactxp');

    const peerDependencies = require(path.join(projectPath, 'node_modules', 'reactxp', 'package.json')).peerDependencies;
    if (!peerDependencies) {
      console.log(chalk.red(`Missing react/react-native/react-native-windows peer dependencies in ReactXP's package.json. Aborting`));
      return shell.exit(1);
    }

    if (!peerDependencies.react) {
      console.log(chalk.red(`Missing react peer dependency in ReactXP's package.json. Aborting`));
      return shell.exit(1);
    }

    if (!peerDependencies['react-dom']) {
      console.log(chalk.red(`Missing react-dom peer dependency in ReactXP's package.json. Aborting`));
      return shell.exit(1);
    }

    if (!peerDependencies['react-native']) {
      console.log(chalk.red(`Missing react-native peer dependency in ReactXP's package.json. Aborting`));
      return shell.exit(1);
    }

    if (!peerDependencies['react-native-windows']) {
      console.log(chalk.red(`Missing react-native-windows peer dependency in ReactXP's package.json. Aborting`));
      return shell.exit(1);
    }

    this.npmInstall(peerDependencies, 'peerDependencies');
  }

  private npmInstall(deps: Dictionary, description: string, options: string[] = []): void {
    const packages = Object.keys(deps)
      .map((key: string) => `${ key }@${ deps[key] }`).join(' ');

    const npmCommand = ['npm', 'install', packages, '--save-exact', '--ignore-scripts', ...options];
    const npmInstall = npmCommand.join(' ');

    console.log(chalk.white.bold('\nInstalling %s. This might take a couple minutes.'), description);
    console.log(chalk.white('%s'), npmInstall);

    if (shell.exec(npmInstall).code !== 0) {
      console.log(chalk.red('NPM Error: could not install %s. Aborting.'), description);
      shell.exit(1);
    }
  }

  private setPackageJson(): void {
    const { templatePath, sourceType } = this.options;
    const packageJson = fs.readFileSync(path.join(templatePath, sourceType, '_package.json'));
    this.packageJson = JSON.parse(packageJson as any);
  }

  private buildDestPath(srcPath: string, absolutePath: string, patterns: Dictionary): string {
    let destPath = path.resolve(this.options.projectPath, path.relative(srcPath, absolutePath));

    Object
      .keys(patterns)
      .forEach(regexp => destPath = destPath.replace(new RegExp(regexp, 'g'), patterns[regexp]));

    return destPath;
  }

  private copy(srcPath: string, destPath: string, patterns: Dictionary): void {
    if (fs.lstatSync(srcPath).isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath);
      }

      return;
    } else {
      const permissions = fs.statSync(srcPath).mode;

      if (this.isBinary(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      } else {
        const content = template.render(fs.readFileSync(srcPath, 'utf8'), patterns);
        fs.writeFileSync(destPath, content, { encoding: 'utf8', mode: permissions });
      }
    }
  }

  private isBinary(srcPath: string): boolean {
    return ['.png', '.jpg', '.jar', '.ico', '.pfx'].indexOf(path.extname(srcPath)) >= 0;
  }

  private walk(srcPath: string, ignorePaths: string[] = []): string[] {
    const isIgnored = (file: string) => ignorePaths.some(p => file.indexOf(p) >= 0);

    if (!fs.lstatSync(srcPath).isDirectory()) {
      return isIgnored(srcPath) ? [] : [srcPath];
    }

    return []
      .concat
      .apply([srcPath], fs.readdirSync(srcPath).map(child => this.walk(path.join(srcPath, child))))
      .filter((absolutePath: string) => !isIgnored(absolutePath));
  }

  private buildWindowsCertificate(): string {
    const { projectPath, projectName } = this.options;

    if (os.platform() !== 'win32') {
      return '';
    }

    console.log(chalk.white.bold('[windows] Generating self-signed certificate...'));
    const certificatesDestPath = path.join(projectPath, WINDOWS_FOLDER, projectName);
    const certGenCommandArgs = [
      `$cert = New-SelfSignedCertificate -KeyUsage DigitalSignature -KeyExportPolicy Exportable -Subject "CN=${ username.sync() }" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}Subject Type:End Entity") -CertStoreLocation "Cert:\\CurrentUser\\My"`,
      '$pwd = ConvertTo-SecureString -String password -Force -AsPlainText',
      `New-Item -ErrorAction Ignore -ItemType directory -Path ${ path.join(projectPath, 'windows', projectName) }`,
      `Export-PfxCertificate -Cert "cert:\\CurrentUser\\My\\$($cert.Thumbprint)" -FilePath ${ path.join(projectPath, 'windows', projectName, projectName) }_TemporaryKey.pfx -Password $pwd`,
      '$cert.Thumbprint',
    ].join(';');

    if (!fs.existsSync(certificatesDestPath)) {
      fs.mkdirpSync(certificatesDestPath);
    }

    const { code, stdout } = shell.exec(['powershell', '-command', certGenCommandArgs].join(' '));
    if (code === 0) {
      console.log(chalk.green.bold('[windows] Self-signed certificate generated successfully.'));

      const output = stdout.toString().trim().split('\n');
      return output[output.length - 1];
    }

    console.log(chalk.bold.yellow('[windows] Failed to generate Self-signed certificate'));
    return '';
  }

}
