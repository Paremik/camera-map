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

## Administration and privacy

- Enforce administrator authentication on the server. Keep ADMIN_PANEL_PASSWORD server-only; never expose it through NEXT_PUBLIC variables, client bundles, logs or API responses.
- Never commit .env.local, credentials or API keys. Keep .env.example limited to placeholders.
- User correction proposals and administrator drafts currently live in browser storage. Preserve this behavior unless server storage and moderation are explicitly in scope. Do not describe local proposals as submitted to a shared moderation queue.
- Do not transmit incident details, favorites or drafts in the background. Explain any user-requested sharing and preserve the local deletion controls.

## Map data and wording

- Never invent camera headings or distribute co-located cameras across arbitrary directions. Use a notional circle when heading is unknown; label estimated angle/range explicitly. A circle does not establish 360-degree surveillance.
- Keep monitoring sites with unknown camera counts distinct from individual cameras. Do not infer mounting positions or optics from a site marker.
- The drone layer currently contains one static EPOP ATZ reference. Absence of a restriction in this incomplete layer is not evidence that flight is permitted. Preserve the source date and direct users to DroneTower for current conditions; do not label the green reference area as flight authorisation.
- Update user-facing copy consistently in ru, pl, uk and en. Keep README.md, CODEX_PROMPT.md and PROJECT_CONTEXT.md aligned with current behavior; clearly label historical notes that no longer apply.

## Development and release verification

- Do not run next dev and next build concurrently against the same .next directory. Stop the development process before a production build, or use an isolated checkout/output directory.
- Register the service worker only in production. Preserve the development cleanup and avoid caching stale HTML that references replaced CSS/JS chunks.
- After CSS, caching or startup changes, verify styles after a reload and check failed asset requests and browser errors. For copy-only changes, verify the affected text and layout; reserve the full map interaction checklist above for behavior/layout changes.
- Preserve unrelated working-tree changes. Before publication, inspect the diff for credentials and unintended generated files.
- Report local changes, GitHub synchronization and Vercel deployment as separate states. Verify the remote commit and deployment before claiming a release is published; local tests alone do not establish deployment success.
