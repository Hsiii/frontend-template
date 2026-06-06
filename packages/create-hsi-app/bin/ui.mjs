import * as prompts from '@clack/prompts';
import color from 'picocolors';

const branch = color.dim('│');

export function intro(appName, targetPath) {
    prompts.intro(color.inverse(' create-hsi-app '));
    console.log(branch);
    console.log(
        `${color.cyan('◇')}  Scaffolding ${color.bold(appName)} in ${targetPath}`
    );
    console.log(branch);
}

export function closePrompts() {
    console.log('└─');
    console.log();
}

export function section(title) {
    console.log(color.bold(color.magentaBright(title)));
}

export function gap() {
    console.log(branch);
}

export function warn(message) {
    console.log(`${color.yellow('▲')}  ${message}`);
}

export function fail(message) {
    prompts.cancel(color.red(message));
    process.exit(1);
}

export function ready(appName, lines) {
    console.log();
    console.log(color.green(`App scaffolded: ${appName}`));
    console.log();
    section('Next steps');

    for (const line of lines) {
        console.log(line);
    }
}

export async function confirm(options) {
    const value = await prompts.confirm(options);
    return unwrapPrompt(value);
}

export async function select(options) {
    const value = await prompts.select(options);
    return unwrapPrompt(value);
}

export async function text(options) {
    const value = await prompts.text(options);
    return unwrapPrompt(value);
}

function unwrapPrompt(value) {
    if (prompts.isCancel(value)) {
        prompts.cancel('Cancelled.');
        process.exit(1);
    }

    return value;
}
