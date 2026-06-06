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
import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';

const templateRepo = 'https://github.com/Hsiii/frontend-template.git';
const templateTag = 'v0.5.0';
const defaultAppName = 'my-app';
const packageManagers = ['bun', 'npm', 'pnpm', 'yarn'];
const rawArgs = process.argv.slice(2);
const parsedArgs = parseCliArgs(rawArgs);
const selectedPackageManager = resolvePackageManager(parsedArgs);
const shouldInstallDependencies = !(
    parsedArgs.noInstall || readNpmBooleanFlag('noinstall')
);
const shouldSkipRepoSetup = parsedArgs.noRepo || readNpmBooleanFlag('norepo');
const isInteractive = input.isTTY && output.isTTY;
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

    if (shouldInstallDependencies) {
        installDependencies();
    }

    const repoSetup = await maybeSetupRepo();

    console.log(`\nCreated ${appName} in ${targetPath}\n`);
    if (repoSetup === 'github') {
        console.log(
            'Created a local git repository and configured GitHub origin.'
        );
    } else if (repoSetup === 'local') {
        console.log('Initialized a local git repository.');
    }
    if (shouldInstallDependencies) {
        console.log(`Installed dependencies with ${selectedPackageManager}.`);
    }
    console.log('\nNext steps:');
    if (targetArg !== '.') {
        console.log(`  cd ${targetArg}`);
    }
    if (!shouldInstallDependencies) {
        console.log(`  ${installCommand()}`);
    }
    console.log(`  ${devCommand()}`);
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

async function maybeSetupRepo() {
    if (shouldSkipRepoSetup || !isInteractive) {
        return null;
    }

    const rl = readline.createInterface({ input, output });

    try {
        const shouldCreateRepo = await promptYesNo(
            rl,
            'Create a git repository?',
            true
        );

        if (!shouldCreateRepo) {
            return null;
        }

        initLocalRepo();

        if (!canUseGitHubCli()) {
            return 'local';
        }

        const defaultRepoName = basename(targetPath);
        const repoName = await promptWithDefault(
            rl,
            'Repository name',
            defaultRepoName
        );
        const visibility = await promptChoice(rl, 'Visibility', [
            { label: 'private', value: 'private', default: true },
            { label: 'public', value: 'public' },
        ]);

        run(
            'gh',
            [
                'repo',
                'create',
                repoName,
                `--${visibility}`,
                '--source=.',
                '--remote=origin',
            ],
            { cwd: targetPath }
        );

        return 'github';
    } finally {
        rl.close();
    }
}

function initLocalRepo() {
    run('git', ['init', '-b', 'main'], { cwd: targetPath });
    run('git', ['config', 'core.hooksPath', '.githooks'], { cwd: targetPath });
}

function canUseGitHubCli() {
    return Boolean(
        run('gh', ['auth', 'status'], {
            cwd: targetPath,
            capture: true,
            allowFailure: true,
        })
    );
}

async function promptYesNo(rl, label, defaultValue) {
    const hint = defaultValue ? 'Y/n' : 'y/N';

    while (true) {
        const answer = (await rl.question(`${label} [${hint}] `))
            .trim()
            .toLowerCase();

        if (!answer) {
            return defaultValue;
        }

        if (['y', 'yes'].includes(answer)) {
            return true;
        }

        if (['n', 'no'].includes(answer)) {
            return false;
        }
    }
}

async function promptWithDefault(rl, label, defaultValue) {
    const answer = (await rl.question(`${label} (${defaultValue}): `)).trim();

    return answer || defaultValue;
}

async function promptChoice(rl, label, choices) {
    const renderedChoices = choices
        .map((choice) =>
            choice.default ? `${choice.label.toUpperCase()}` : choice.label
        )
        .join('/');

    while (true) {
        const answer = (await rl.question(`${label} (${renderedChoices}): `))
            .trim()
            .toLowerCase();

        if (!answer) {
            const defaultChoice = choices.find((choice) => choice.default);

            if (defaultChoice) {
                return defaultChoice.value;
            }
        }

        const matchingChoice = choices.find(
            (choice) => choice.label === answer || choice.value === answer
        );

        if (matchingChoice) {
            return matchingChoice.value;
        }
    }
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

function fail(message) {
    console.error(`create-hsi-app: ${message}`);
    process.exit(1);
}
