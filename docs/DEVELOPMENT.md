# Development and architecture decisions

## Project ownership and AI assistance

Paremik defined the Opole camera-map product, requested its features, supplied and corrected an observation about an entrance camera group, and reviewed the running interface. AI assistance was used extensively for implementation, source research, debugging, documentation and automated checks. This repository should not be presented as code written entirely without assistance.

## Problems addressed

- Camera records and documented surveillance sites require different counts. A group can represent several cameras at one approximate reference point.
- Import validation preserves source identifiers and coordinates, rejects malformed or empty replacements, and never invents optical data.
- Shared map and incident links validate incoming parameters; a link is an explicit sharing action and not publication to a central database.
- Map failures leave the catalogue usable and offer a retry.
- Local preferences tolerate unavailable browser storage.

## Architecture decisions and tradeoffs

- A versioned local catalogue keeps page loads independent of ITS availability and makes updates reviewable. It is not real-time availability monitoring.
- MapLibre renders GeoJSON client-side; the server supplies validated catalogue data. 3D means tilted perspective, not obstruction-aware visibility.
- Local admin drafts avoid introducing a write API before authentication and moderation exist. They apply only in the current browser until exported and reviewed.
- PWA installation is supported, but live maps need internet. The service worker caches only a standalone offline page, not incident URLs or HTML tied to a particular deployment.
- Translation dictionaries live in `locales/`; source names and source quotations preserve their original language.
- Street search supports shared Redis cache, per-client limits and an upstream lease. Vercel public-provider requests fail closed without configuration; see [setup](STREET_SEARCH.md). Local development uses a bounded process-local throttle.
- CSP is initially Report-Only for compatibility measurement. Reports are visible in the browser console; there is no collection endpoint yet.

## Verification workflow

Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm build`, and `pnpm test:e2e`. Browser tests exercise the real production server. Live map resources remain third-party dependencies.

Coordinate verification must record source URL, date, method, accuracy level and reviewer. A published building location is not proof of an exact camera mount. No new field verification has been performed during this maintenance work.

## Remaining work

- Add independently verified mount locations with evidence, or retain the honest unverified state.
- Provision a shared cache/rate limiter or a dedicated geocoder for public production traffic.
- Further split map-layer construction as features grow. Filters, preferences and admin drafts now have dedicated hooks.

## Working on the project

Read this document and the detailed guide before changing data or functionality. Preserve source provenance and independent coordinate/optics verification. Run the checks above before publishing functional changes. Record substantive decisions here.

Next.js may regenerate `AGENTS.md` and `CLAUDE.md` locally. Those generated files are not part of the public project documentation.
