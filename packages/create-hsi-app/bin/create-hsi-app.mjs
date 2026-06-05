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
const defaultAppName = 'my-hsi-app';
const targetArg = process.argv[2] ?? defaultAppName;
const targetPath = resolve(targetArg);
const appName = toPackageName(basename(targetPath));

if (existsSync(targetPath) && readdirSync(targetPath).length > 0) {
    fail(`Target directory is not empty: ${targetPath}`);
}

run('git', ['clone', '--depth', '1', templateRepo, targetPath]);

rmSync(join(targetPath, '.git'), { force: true, recursive: true });
rmSync(join(targetPath, '.github'), { force: true, recursive: true });
rmSync(join(targetPath, 'packages'), { force: true, recursive: true });

updatePackageJson();
updateBunLock();
updateAppText();
writeAppReadme();

console.log(`\nCreated ${appName} in ${targetPath}\n`);
console.log('Next steps:');
console.log(`  cd ${targetArg}`);
console.log('  bun i');
console.log('  bun run dev');

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

    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);
}

function updateBunLock() {
    const lockPath = join(targetPath, 'bun.lock');

    if (!existsSync(lockPath)) {
        return;
    }

    const lock = readFileSync(lockPath, 'utf8').replace(
        '"name": "@hsiii/hsi-app"',
        `"name": "${appName}"`
    );

    writeFileSync(lockPath, lock);
}

function updateAppText() {
    replaceInFile(join(targetPath, 'index.html'), '<title>hsi-app</title>', {
        with: `<title>${appName}</title>`,
    });
    replaceInFile(join(targetPath, 'src/components/App.tsx'), '>hsi-app<', {
        with: `>${appName}<`,
    });
}

function writeAppReadme() {
    const readme = `# ${appName}

Created from the hsi-app frontend template.

## Install

\`\`\`bash
bun i
\`\`\`

## Develop

\`\`\`bash
bun run dev
\`\`\`

## Check

\`\`\`bash
bun run check
\`\`\`
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

function fail(message) {
    console.error(`create-hsi-app: ${message}`);
    process.exit(1);
}
