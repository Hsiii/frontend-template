# create-hsi-app

Scaffold an opinionated Vite + React + TypeScript app with strict checks, curated defaults, and package-age gating for supply-chain security.

## The Stack

- Vite
- React 19
- TypeScript 6
- TanStack React Query
- Lucide React
- ESLint with `eslint-config-complete`
- Prettier with sorted imports
- VS Code extension recommendations
- VS Code auto lint/format settings
- Package-manager-specific package-age gating

## Getting Started

Run any one of these:

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

Full CLI usage, flags, and repo/install behavior are documented in
[`docs/create-hsi-app.md`](./docs/create-hsi-app.md).

## Scripts

- `dev`: start the Vite dev server
- `build`: create a production build
- `check`: run typecheck, lint, format verification, and production build
- `preview`: serve the build locally
