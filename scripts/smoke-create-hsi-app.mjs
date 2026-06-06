#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const cliScriptPath = resolve(
    repoRoot,
    'packages/create-hsi-app/bin/create-hsi-app.mjs'
);

const rawArgs = process.argv.slice(2);
const passthroughArgs = [];
let shouldSkipInstall = false;
let packageManager = 'bun';
let framework = 'vite';

for (const arg of rawArgs) {
    if (arg === '--noInstall') {
        shouldSkipInstall = true;
    }

    if (['--vite', '--next'].includes(arg)) {
        framework = arg.slice(2);
    }

    if (['--bun', '--npm', '--pnpm', '--yarn'].includes(arg)) {
        packageManager = arg.slice(2);
    }

    passthroughArgs.push(arg);
}

const hasExplicitPackageManager = rawArgs.some((arg) =>
    ['--bun', '--npm', '--pnpm', '--yarn'].includes(arg)
);

if (!hasExplicitPackageManager) {
    passthroughArgs.unshift('--bun');
}

const hasExplicitFramework = rawArgs.some((arg) =>
    ['--vite', '--next'].includes(arg)
);

if (!hasExplicitFramework) {
    passthroughArgs.unshift('--vite');
}

const smokeRoot = mkdtempSync(join(tmpdir(), 'create-hsi-app-smoke-'));
const targetPath = join(smokeRoot, 'app');

console.log(`Smoke target: ${targetPath}`);
console.log(`Framework: ${framework}`);
console.log(
    `Running: node ${cliScriptPath} ${[...passthroughArgs, targetPath].join(' ')}`
);

execFileSync(
    process.execPath,
    [cliScriptPath, ...passthroughArgs, targetPath],
    {
        cwd: repoRoot,
        stdio: 'inherit',
    }
);

console.log('\nSmoke run complete.');
console.log(`Generated app: ${targetPath}`);
console.log(`Next: cd ${targetPath}`);

if (shouldSkipInstall) {
    console.log('Install dependencies there before starting the dev server.');
} else {
    console.log(`Start it with: ${devCommand(packageManager)}`);
}

function devCommand(selectedPackageManager) {
    if (selectedPackageManager === 'yarn') {
        return 'yarn dev';
    }

    return `${selectedPackageManager} run dev`;
}
