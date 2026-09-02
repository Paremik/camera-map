# MVP verification — 2026-09-02

Environment: Windows, Node.js 24.19.0, pnpm 11.19.0, Next.js 16.3.4, MapLibre 5.24.0. Dependencies are captured in pnpm-lock.yaml.

## Automated checks

- Frozen-lockfile installation: passed.
- TypeScript / Next route types: passed.
- Unit tests: 12 passed, covering seed validation, Polish search, filters, co-located points, geographic bearings, closed sectors, missing optical data, deterministic imports, duplicates, invalid coordinates, unsafe links and source validation.
- Production build: passed; home page statically prerendered.
- Import CLI: dry run preserved the real dataset. A valid write and a rejected empty import were checked in an isolated fixture directory; failed import preserved the previous file. Synthetic fixtures were not added to the application dataset.

## Browser checks

- Development and production pages loaded with MapLibre/OSM. Production contained all four camera records.
- Search `wieza` and `sw wojciecha` matched the expected Polish names. Card selection and visible map count followed the results.
- ITS and verified-only filters produced the correct empty states, without retaining an unrelated card.
- Clicking the shared map point opened all four individually selectable views. Selecting Katedra updated the card.
- 2D/3D, reset to central Opole and sector visibility worked; the perspective view was inspected visually.
- Desktop 1440×1000 and mobile 390×844 were inspected. Mobile search/selection worked, there was no horizontal overflow, and the source-view button remained visible.
- Aborting OSM tile requests produced an error message; removing the simulated fault and pressing retry restored the map.
- WCAG 2 A/AA automated audit reported zero violations. Contrast over the map canvas required visual inspection and is not a claim of full accessibility certification.

## Public data review

The City of Opole page describes the four town-hall views. The original marker position was outside the town hall. Public OSM way 207031541, tagged `Ratusz`, `amenity=townhall`, and `source=UM Opole`, was inspected through the OSM API. The shared approximate point was moved inside this building outline.

This verifies the building reference, not camera mounting positions or optical parameters. All camera records remain unverified. No real ITS export, video embedding permission, live-stream uptime or building/obstacle visibility model was verified.
