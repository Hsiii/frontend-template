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

import {
    closePrompts,
    confirm,
    fail,
    gap,
    intro,
    ready,
    section,
    select,
    text,
    warn,
} from './ui.mjs';

const templateRepo = 'https://github.com/Hsiii/frontend-template.git';
const templateTag = 'v0.5.2';
const defaultAppName = 'my-app';
const packageManagers = ['bun', 'npm', 'pnpm', 'yarn'];
const rawArgs = process.argv.slice(2);
const parsedArgs = parseCliArgs(rawArgs);
const selectedPackageManager = resolvePackageManager(parsedArgs);
let shouldInstallDependencies = !(
    parsedArgs.noInstall || readNpmBooleanFlag('noinstall')
);
const shouldSkipRepoSetup = parsedArgs.noRepo || readNpmBooleanFlag('norepo');
const isInteractive = process.stdin.isTTY && process.stdout.isTTY;
const targetArg = parsedArgs.targetArg ?? '.';
const targetPath = resolve(targetArg);
const appName = toPackageName(basename(targetPath));

main().catch((error) => {
    fail(error.message);
});

async function main() {
    if (existsSync(targetPath) && readdirSync(targetPath).length > 0) {
        fail(`Target directory is not empty: ${targetPath}`);
    }

    intro(appName, targetPath);
    const repoPlan = await planRepoSetup();
    shouldInstallDependencies = await planInstallDependencies();
    closePrompts();

    section('Cloning template');
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
    console.log();
    section('Customizing project files');
    console.log(`- package.json: name, version, scripts, packageManager`);
    console.log(`- index.html: title`);
    console.log(`- src/components/App.tsx: app name`);
    console.log(`- README.md: install/dev/check commands`);
    console.log(`- package manager config: ${packageManagerConfigFile()}`);
    if (selectedPackageManager === 'bun') {
        console.log(`- bun.lock: package name`);
    }
    updateAppText();
    updatePackageManagerFiles();
    writeAppReadme();

    if (shouldInstallDependencies) {
        console.log();
        section(`Installing dependencies with ${selectedPackageManager}`);
        installDependencies();
    }

    await applyRepoPlan(repoPlan);

    ready(appName, nextSteps());
}

function run(command, args, options = {}) {
    try {
        return execFileSync(command, args, {
            cwd: options.cwd,
            encoding: options.capture ? 'utf8' : undefined,
            stdio: options.capture ? 'pipe' : 'inherit',
        });
    } catch (error) {
        if (options.allowFailure) {
            return null;
        }

        const details = error.stderr?.toString().trim() || error.message;
        fail(`Failed to run: ${command} ${args.join(' ')}\n${details}`);
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
    delete packageJson.scripts.prepare;
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

function installDependencies() {
    switch (selectedPackageManager) {
        case 'bun':
            run('bun', ['install'], { cwd: targetPath });
            return;
        case 'npm':
            run('npm', ['install'], { cwd: targetPath });
            return;
        case 'pnpm':
            run('pnpm', ['install'], { cwd: targetPath });
            return;
        case 'yarn':
            run('yarn', ['install'], { cwd: targetPath });
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

async function planInstallDependencies() {
    if (!shouldInstallDependencies || !isInteractive) {
        return shouldInstallDependencies;
    }

    const shouldInstall = await confirm({
        message: `Should I run "${installCommand()}" for you?`,
        initialValue: true,
    });
    gap();

    return shouldInstall;
}

async function planRepoSetup() {
    if (shouldSkipRepoSetup || !isInteractive) {
        return null;
    }

    const shouldCreateRepo = await confirm({
        message: 'Create a git repository?',
        initialValue: true,
    });
    gap();

    if (!shouldCreateRepo) {
        return null;
    }

    const repoPlan = {
        git: true,
        github: false,
    };
    const hasGitHubCli = canUseGitHubCli();

    if (!hasGitHubCli) {
        warn(
            'GitHub CLI is unavailable or not authenticated; keeping a local repository only.'
        );
        return repoPlan;
    }

    const shouldCreateGitHubRepo = await confirm({
        message: 'Create a GitHub repository too?',
        initialValue: true,
    });
    gap();

    if (!shouldCreateGitHubRepo) {
        return repoPlan;
    }

    const defaultRepoName = basename(targetPath);
    const repoName = await text({
        message: 'Repository name',
        defaultValue: defaultRepoName,
        placeholder: defaultRepoName,
        validate(value) {
            return value.trim() ? undefined : 'Repository name is required.';
        },
    });
    gap();
    const visibility = await select({
        message: 'Visibility',
        options: [
            { label: 'Private', value: 'private' },
            { label: 'Public', value: 'public' },
        ],
        initialValue: 'private',
    });
    gap();

    return {
        ...repoPlan,
        github: true,
        repoName,
        visibility,
    };
}

async function applyRepoPlan(repoPlan) {
    if (!repoPlan) {
        return;
    }

    console.log();
    section('Initializing local git repository');
    initLocalRepo();

    if (!repoPlan.github) {
        return;
    }

    console.log();
    section('Creating GitHub repository');
    run(
        'gh',
        [
            'repo',
            'create',
            repoPlan.repoName,
            `--${repoPlan.visibility}`,
            '--source=.',
            '--remote=origin',
        ],
        { cwd: targetPath }
    );
}

function initLocalRepo() {
    run('git', ['init', '-b', 'main'], { cwd: targetPath });
    run('git', ['config', 'core.hooksPath', '.githooks'], { cwd: targetPath });
}

function canUseGitHubCli() {
    return (
        run('gh', ['auth', 'status'], {
            cwd: targetPath,
            capture: true,
            allowFailure: true,
        }) !== null
    );
}

function nextSteps() {
    const steps = [];

    if (targetArg !== '.') {
        steps.push(`cd ${targetArg}`);
    }

    if (!shouldInstallDependencies) {
        steps.push(installCommand());
    }

    steps.push(devCommand());

    return steps;
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

function parseCliArgs(args) {
    const parsedArgs = {
        noInstall: false,
        noRepo: false,
        packageManager: null,
        targetArg: null,
    };

    for (const arg of args) {
        switch (arg) {
            case '--bun':
                setPackageManagerOverride(parsedArgs, 'bun');
                continue;
            case '--npm':
                setPackageManagerOverride(parsedArgs, 'npm');
                continue;
            case '--pnpm':
                setPackageManagerOverride(parsedArgs, 'pnpm');
                continue;
            case '--yarn':
                setPackageManagerOverride(parsedArgs, 'yarn');
                continue;
            case '--noInstall':
                parsedArgs.noInstall = true;
                continue;
            case '--noRepo':
                parsedArgs.noRepo = true;
                continue;
            default:
                if (arg.startsWith('--')) {
                    fail(`Unsupported option: ${arg}`);
                }

                if (parsedArgs.targetArg) {
                    fail(`Unexpected argument: ${arg}`);
                }

                parsedArgs.targetArg = arg;
        }
    }

    return parsedArgs;
}

function setPackageManagerOverride(parsedArgs, packageManager) {
    if (
        parsedArgs.packageManager &&
        parsedArgs.packageManager !== packageManager
    ) {
        fail('Pass only one of --bun, --npm, --pnpm, or --yarn.');
    }

    parsedArgs.packageManager = packageManager;
}

function resolvePackageManager(parsedArgs) {
    return parsedArgs.packageManager ?? 'bun';
}

function readNpmBooleanFlag(name) {
    const value = process.env[`npm_config_${name}`];

    return value === 'true' || value === '';
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

function packageManagerConfigFile() {
    switch (selectedPackageManager) {
        case 'bun':
            return 'bunfig.toml';
        case 'npm':
            return '.npmrc';
        case 'pnpm':
            return 'pnpm-workspace.yaml';
        case 'yarn':
            return '.yarnrc.yml';
        default:
            fail(`Unsupported package manager: ${selectedPackageManager}`);
    }
}
