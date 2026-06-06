#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

try {
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
        stdio: 'ignore',
    });
} catch {
    // Ignore environments where git is unavailable or the directory is not a repo.
}
