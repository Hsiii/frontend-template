import * as prompts from '@clack/prompts';
import color from 'picocolors';

export function intro(appName, targetPath) {
    prompts.intro(color.inverse(' create-hsi-app '));
    console.log();
    console.log(
        `${color.cyan('◇')}  Scaffolding ${color.bold(appName)} in ${targetPath}`
    );
    console.log();
}

export function step(message) {
    console.log(`${color.dim('•')} ${message}`);
}

export function warn(message) {
    prompts.log.warn(message);
}

export function fail(message) {
    prompts.cancel(color.red(message));
    process.exit(1);
}

export function ready(targetPath, lines) {
    console.log();
    console.log(`${color.green('Ready:')} ${targetPath}`);

    for (const line of lines) {
        console.log(`  ${line}`);
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
