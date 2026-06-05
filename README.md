# hsi-app

A reusable frontend baseline that is maintained in two forms:

- Template repo: use this repository as the source template for new frontend
  apps.
- Package artifact: install the published package from npm as `hsi-app` or
  from GitHub Packages as `@hsiii/hsi-app`.

The template includes:

- Bun package management
- Vite for dev/build
- React 19
- TypeScript 6
- TanStack React Query
- Lucide React for icons
- ESLint with eslint-config-complete
- Prettier with sorted imports
- VS Code extension recommendations for spellcheck and CSS nesting syntax highlighting
- VS Code settings for format-on-save and explicit ESLint fixes on save

## Install

```bash
bun i
```

This project uses `bunfig.toml` to enforce:

```toml
[install]
minimumReleaseAge = 604800
```

That blocks packages newer than 7 days to reduce exposure to supply-chain attacks.

## Scripts

- `bun run dev`: starts the Vite dev server and opens the app automatically in
  the browser
- `bun run build`: creates a production build with Vite
- `bun run preview`: serves the built app locally
- `bun run typecheck`: runs TypeScript without emitting files
- `bun run lint`: runs ESLint across the repo
- `bun run lint:fix`: applies auto-fixable ESLint changes
- `bun run format`: formats the repo with Prettier
- `bun run format:check`: verifies formatting without changing files
- `bun run check`: runs typecheck, lint, format verification, and production
  build

## Source Structure

- `src/components/`: React components, including the root `App.tsx`
- `src/constants/`: shared constants and CSS tokens
- `src/hooks/`: reusable hooks
- `src/global.css`: the only stylesheet outside of `components/`
- `src/main.tsx`: app entry point
