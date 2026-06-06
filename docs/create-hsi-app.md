# create-hsi-app Usage

## Basic Commands

### npm

```bash
npm create hsi-app@latest
```

### yarn

```bash
yarn create hsi-app
```

### pnpm

```bash
pnpm create hsi-app@latest
```

### bun

```bash
bun create hsi-app@latest
```

## Arguments

`create-hsi-app [dir] [options]`

`[dir]` is optional. If omitted, the app is scaffolded into the current
directory. Repository prompts default the repo name to the target directory
name.

## Default Behavior

- Bun is the default package manager for the scaffolded app.
- Passing `--npm`, `--pnpm`, or `--yarn` overrides the default.
- Dependencies are installed automatically unless `--noInstall` is passed.
- In an interactive terminal, the CLI prompts to create a git repository unless
  `--noRepo` is passed.
- When `gh auth status` succeeds, repo setup uses GitHub CLI to create a remote
  and add `origin`. Otherwise it falls back to a local git repository only.
- When a git repository is created, `.githooks/pre-commit` is configured to run
  formatting and lint checks before commits.

## Options

- `--bun`: use Bun for the scaffolded app and write `bunfig.toml`
- `--npm`: use npm for the scaffolded app and write `.npmrc`
- `--pnpm`: use pnpm for the scaffolded app and write `pnpm-workspace.yaml`
- `--yarn`: use Yarn for the scaffolded app and write `.yarnrc.yml`
- `--noInstall`: skip the default dependency installation step
- `--noRepo`: skip the interactive repository prompt and leave git uninitialized

## Examples

Scaffold into the current directory with the default Bun setup:

```bash
npm create hsi-app@latest
```

Scaffold into a named directory:

```bash
pnpm create hsi-app@latest my-dashboard
```

Override the package manager:

```bash
bun create hsi-app@latest my-dashboard --pnpm
```

Skip dependency installation:

```bash
npm create hsi-app@latest my-dashboard -- --noInstall
```

Skip the repo prompt:

```bash
npm create hsi-app@latest my-dashboard -- --noRepo
```
