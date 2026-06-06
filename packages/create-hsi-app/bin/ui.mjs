import * as prompts from '@clack/prompts';
import color from 'picocolors';

const branch = color.dim('│');

export function intro(appName, targetPath) {
    prompts.intro(color.inverse(' create-hsi-app '));
    console.log(
        `${color.cyan('◇')}  Scaffolding ${color.bold(appName)} in ${targetPath}`
    );
    console.log(branch);
}

export function step(message, options = {}) {
    const prefix = options.last ? '└─' : '├─';
    console.log(`${prefix} ${message}`);
}

export function warn(message) {
    prompts.log.warn(message);
}

export function fail(message) {
    prompts.cancel(color.red(message));
    process.exit(1);
}

export function done(appName) {
    prompts.outro(color.green(`Success. Created ${appName}`));
}

export function renderSummary(lines) {
    prompts.note(lines.join('\n'), 'Summary');
}

export function renderNextSteps(lines) {
    prompts.note(lines.join('\n'), 'Next steps');
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
