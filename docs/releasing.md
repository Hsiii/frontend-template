# Releasing

This repo is template source plus release tooling. The root package is private.
Only `create-hsi-app` is published to public npm.

## Release Flow

1. Start from a clean worktree on `main`.
2. Run one of:
    - `npm run release`
    - `pnpm run release`
    - `yarn run release`
    - `bun run release`
3. If the current version is not yet on npm, choose whether to release it as-is
   or bump first.
4. Otherwise choose `patch`, `minor`, or `major`.
5. The script will:
    - bump the root `package.json` version
    - bump `packages/create-hsi-app/package.json`
    - update `templateTag` in
      `packages/create-hsi-app/bin/create-hsi-app.mjs`
    - run `check`
    - commit
    - create the matching `v*` tag
    - push `main`
    - push the tag
    - run `npm login --registry=https://registry.npmjs.org`
    - publish `packages/create-hsi-app` to public npm
    - skip the release commit if no version files changed
    - require a version bump when the matching `v*` tag already exists on a
      different commit

## Dry Run

Use one of:

- `npm run release -- --dry-run`
- `pnpm run release -- --dry-run`
- `yarn run release --dry-run`
- `bun run release -- --dry-run`

The dry run updates files and runs checks, but skips commit, tag, push, npm
login, and npm publish.

## npm Publish

Public npm publish is performed by the release script. npm may prompt you to
press ENTER to open the browser login flow before publishing.

```bash
npm login --registry=https://registry.npmjs.org
npm publish --registry=https://registry.npmjs.org
```

## Legacy Package

Keep `hsi-app` deprecated on npm.

## Notes

- `scripts/` is ignored by npm tarballs.
- `create-hsi-app` removes repo-only tooling from generated apps.
- Direct GitHub template clones still include repo-only tooling by design.
