<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Camera map project

Read README.md, CODEX_PROMPT.md and PROJECT_CONTEXT.md before continuing.
Keep map coordinates, optical verification and source provenance separate.
Use documented public data for sourced cameras. On 2026-09-03 the user explicitly also authorized separate unverified user reports, including the four-camera entrance group in docs/CAMERA_REPORTS.md. Preserve that provenance and uncertainty; an OSM position reference is not evidence that cameras exist. Additional private cameras need public information or an explicit user observation. Do not add invented ITS locations or streams.
Run pnpm typecheck, pnpm test and pnpm build before committing functional changes.
For map/UI changes, also verify filtering, selection, 2D/3D, mobile layout and map error recovery in a browser.
Update PROJECT_CONTEXT.md when architecture, source verification or remaining work changes.
