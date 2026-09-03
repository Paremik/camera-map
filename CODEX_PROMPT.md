# Codex task

Continue the existing Next.js + TypeScript project `opole-camera-map`.

Goal: build a polished web app that visualizes publicly documented cameras in Opole, Poland, and clearly distinguished user reports authorized on 2026-09-03.

Requirements:
- Keep MapLibre + OpenStreetMap; no mandatory paid API key.
- Preserve the current camera marker and field-of-view sector behavior.
- Treat `heading`, `fov`, and `rangeMeters` as approximate unless a public technical source verifies them.
- Keep `verified` and the public `sourceUrl` for sourced records. User reports use `sourceKind: "user-report"`, a source label and reported count instead of an invented public URL; keep their verification false and optics unknown. A position source establishes only the map anchor.
- Add filters: public live view / ITS / city monitoring / private cameras / verified only. Label uncertain private ownership as a supposition.
- Add a search box by camera name/street.
- Add a 2D/3D toggle and a button to reset to central Opole.
- Add a camera popup/card with: name, coordinates, source, verification status, direction, FOV, range, and public-view link.
- Only embed a live stream when the official publisher explicitly allows embedding; otherwise open the official page in a new tab.
- Never attempt authentication bypass, hidden stream discovery, credential guessing, or access to non-public CCTV feeds.
- Create a clean dark responsive UI for desktop and mobile.
- Keep data in a typed module for now, but structure it so it can later be replaced by an API/database.
- Add loading/error states and basic accessibility.
- Add README instructions.

After implementation:
1. run typecheck/build,
2. fix all errors,
3. summarize changed files,
4. list any places where real public data still needs verification.
