#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
    existsSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

const templateRepo = 'https://github.com/Hsiii/frontend-template.git';
const templateTag = 'v0.2.0';
const defaultAppName = 'my-app';
const packageManagers = ['bun', 'npm', 'pnpm', 'yarn'];
const rawArgs = process.argv.slice(2);
const selectedPackageManager = parsePackageManagerFlag(rawArgs);
const targetArg = rawArgs.find((arg) => !arg.startsWith('--')) ?? '.';
const targetPath = resolve(targetArg);
const appName = toPackageName(basename(targetPath));

if (existsSync(targetPath) && readdirSync(targetPath).length > 0) {
    fail(`Target directory is not empty: ${targetPath}`);
}

run('git', [
    '-c',
    'advice.detachedHead=false',
    'clone',
    '--branch',
    templateTag,
    '--depth',
    '1',
    templateRepo,
    targetPath,
]);

rmSync(join(targetPath, '.git'), { force: true, recursive: true });
rmSync(join(targetPath, '.github'), { force: true, recursive: true });
rmSync(join(targetPath, 'docs'), { force: true, recursive: true });
rmSync(join(targetPath, 'packages'), { force: true, recursive: true });
rmSync(join(targetPath, 'scripts'), { force: true, recursive: true });

updatePackageJson();
updateBunLock();
updateAppText();
updatePackageManagerFiles();
writeAppReadme();

console.log(`\nCreated ${appName} in ${targetPath}\n`);
console.log('Next steps:');
if (targetArg !== '.') {
    console.log(`  cd ${targetArg}`);
}
console.log(`  ${installCommand()}`);
console.log(`  ${devCommand()}`);

function run(command, args) {
    try {
        execFileSync(command, args, { stdio: 'inherit' });
    } catch {
        fail(`Failed to run: ${command} ${args.join(' ')}`);
    }
}

function updatePackageJson() {
    const packageJsonPath = join(targetPath, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    packageJson.name = appName;
    packageJson.version = '0.1.0';
    delete packageJson.repository;
    delete packageJson.publishConfig;
    delete packageJson.packageManager;
    delete packageJson.engines;
    delete packageJson.scripts.release;
    packageJson.scripts.check =
        'tsc -p tsconfig.json --noEmit && eslint . && prettier . --check && vite build';
    packageJson.packageManager = packageManagerDeclaration();

    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);
}

function updateBunLock() {
    const lockPath = join(targetPath, 'bun.lock');

    if (!existsSync(lockPath)) {
        return;
    }

    if (selectedPackageManager !== 'bun') {
        rmSync(lockPath, { force: true });
        return;
    }

    const lock = readFileSync(lockPath, 'utf8').replace(
        '"name": "frontend-template"',
        `"name": "${appName}"`
    );

    writeFileSync(lockPath, lock);
}

function updateAppText() {
    replaceInFile(
        join(targetPath, 'index.html'),
        '<title>Frontend Template</title>',
        {
            with: `<title>${appName}</title>`,
        }
    );
    replaceInFile(
        join(targetPath, 'src/components/App.tsx'),
        '>Frontend Template<',
        {
            with: `>${appName}<`,
        }
    );
}

function updatePackageManagerFiles() {
    rmSync(join(targetPath, 'bunfig.toml'), { force: true });
    rmSync(join(targetPath, '.npmrc'), { force: true });
    rmSync(join(targetPath, 'pnpm-workspace.yaml'), { force: true });
    rmSync(join(targetPath, '.yarnrc.yml'), { force: true });

    switch (selectedPackageManager) {
        case 'bun':
            writeFileSync(
                join(targetPath, 'bunfig.toml'),
                '[install]\nminimumReleaseAge = 604800\n'
            );
            return;
        case 'npm':
            writeFileSync(join(targetPath, '.npmrc'), 'min-release-age=7\n');
            return;
        case 'pnpm':
            writeFileSync(
                join(targetPath, 'pnpm-workspace.yaml'),
                'minimumReleaseAge: 10080\n'
            );
            return;
        case 'yarn':
            writeFileSync(
                join(targetPath, '.yarnrc.yml'),
                'npmMinimalAgeGate: 7d\n'
            );
            return;
        default:
            fail(`Unsupported package manager: ${selectedPackageManager}`);
    }
}

function writeAppReadme() {
    const installLine = installCommand();
    const devLine = devCommand();
    const checkLine = checkCommand();
    const securityNote = securityNoteForPackageManager();
    const readme = `# ${appName}

Created from the frontend template.

## Install

\`\`\`bash
${installLine}
\`\`\`

## Develop

\`\`\`bash
${devLine}
\`\`\`

## Check

\`\`\`bash
${checkLine}
\`\`\`

${securityNote}
`;

    writeFileSync(join(targetPath, 'README.md'), readme);
}

function replaceInFile(filePath, searchValue, replacement) {
    const source = readFileSync(filePath, 'utf8');
    writeFileSync(filePath, source.replace(searchValue, replacement.with));
}

function toPackageName(value) {
    const name = value
        .trim()
        .toLowerCase()
        .replaceAll(/[\s_]+/g, '-')
        .replaceAll(/[^a-z0-9-.]/g, '')
        .replaceAll(/^[.-]+|[.-]+$/g, '')
        .replaceAll(/-{2,}/g, '-');

    return name || defaultAppName;
}

function parsePackageManagerFlag(args) {
    const selectedFlags = args.filter((arg) =>
        ['--bun', '--npm', '--pnpm', '--yarn'].includes(arg)
    );

    if (selectedFlags.length > 1) {
        fail('Pass only one of --bun, --npm, --pnpm, or --yarn.');
    }

    switch (selectedFlags[0]) {
        case '--npm':
            return 'npm';
        case '--pnpm':
            return 'pnpm';
        case '--yarn':
            return 'yarn';
        case '--bun':
        case undefined:
            return 'bun';
        default:
            fail(`Unsupported package manager flag: ${selectedFlags[0]}`);
    }
}

function packageManagerDeclaration() {
    switch (selectedPackageManager) {
        case 'bun':
            return 'bun@1.3.9';
        case 'npm':
            return 'npm@11';
        case 'pnpm':
            return 'pnpm@10';
        case 'yarn':
            return 'yarn@4';
        default:
            fail(`Unsupported package manager: ${selectedPackageManager}`);
    }
}

function installCommand() {
    switch (selectedPackageManager) {
        case 'bun':
            return 'bun install';
        case 'npm':
            return 'npm install';
        case 'pnpm':
            return 'pnpm install';
        case 'yarn':
            return 'yarn install';
        default:
            fail(`Unsupported package manager: ${selectedPackageManager}`);
    }
}

function devCommand() {
    switch (selectedPackageManager) {
        case 'yarn':
            return 'yarn dev';
        case 'bun':
        case 'npm':
        case 'pnpm':
            return `${selectedPackageManager} run dev`;
        default:
            fail(`Unsupported package manager: ${selectedPackageManager}`);
    }
}

function checkCommand() {
    switch (selectedPackageManager) {
        case 'yarn':
            return 'yarn check';
        case 'bun':
        case 'npm':
        case 'pnpm':
            return `${selectedPackageManager} run check`;
        default:
            fail(`Unsupported package manager: ${selectedPackageManager}`);
    }
}

function securityNoteForPackageManager() {
    switch (selectedPackageManager) {
        case 'bun':
            return 'This project includes `bunfig.toml` with `minimumReleaseAge = 604800`.';
        case 'npm':
            return 'This project includes `.npmrc` with `min-release-age=7`.';
        case 'pnpm':
            return 'This project includes `pnpm-workspace.yaml` with `minimumReleaseAge: 10080`.';
        case 'yarn':
            return 'This project includes `.yarnrc.yml` with `npmMinimalAgeGate: 7d`.';
        default:
            fail(`Unsupported package manager: ${selectedPackageManager}`);
    }
}

function fail(message) {
    console.error(`create-hsi-app: ${message}`);
    process.exit(1);
}
