# Verification — 2026-09-03

Environment: Windows, Node.js 24.19.0, pnpm 11.19.0, Next.js 16.3.4, MapLibre 5.24.0. Dependencies remain captured in pnpm-lock.yaml; this update adds no packages.

## Automated checks

- TypeScript / Next route types: passed.
- Unit tests: 24 passed. Coverage includes geometry, search/filters, both import formats, rejected malformed/duplicate/unsafe data, favorites storage format, stable camera links and unknown IDs. Report tests check weighted group counts, private/verified filtering, missing public links and rejected misleading provenance/optics.
- The shipped ITS dataset exactly matches the archived public GeoJSON through the adapter. The combined repository validates 164 records representing 167 cameras: 163 from public sources and four in one user-reported group.
- Production build: passed; the home page remains statically prerendered. Browser history and local storage are handled after hydration.
- Import CLI processed the saved official snapshot and atomically wrote 159 normalized records. The previous phase also checked that a rejected empty import preserves existing data.

## Browser checks

Checked both development and production with Playwright using installed Edge. agent-browser's native CDP connection failed in this Windows environment, so standard Playwright was used for the same browser checks. No TLS exceptions were enabled. The report flow was checked on development and production; the full existing feature suite was rerun on production. Next dev rejected its HMR origin at 127.0.0.1, so development was checked at its advertised localhost address. Production at 127.0.0.1:3001 works normally.

- All 164 records reach the map with a total camera count of 167; the list paginates by 50 records. Search matches Polish street names without diacritics, including the four cameras at Niemodlińska / Hallera.
- The private filter displays one report record and a map count of four. The orange entrance marker opens the group directly. Its card shows the user-report warning, tentative ownership, an approximate anchor, three unknown optical values and a separate OSM position reference, with no public-source or video link invented.
- The reported group can be favorited as one item and reopened by direct link after reload. Its marker, count and card worked with 2D/3D, mobile search and the Polish-normalized query `rodziewiczowny`. Desktop and mobile screenshots of the group were inspected; the notice remains readable without horizontal overflow.
- Adding a favorite from the list does not select the camera. Two favorites survived a full reload; the favorites filter applied to both list and map.
- Favorites synchronized between two tabs, including removal of the storage key. Removing the selected favorite while filtering removed its card and URL selection.
- Selection updates `?camera=`; a full reload opens the same card. Back/forward, closing the card, and filters keep URL and selection consistent. Unknown IDs display a message.
- A direct link to `its:159`, beyond the first list page, opens correctly. ITS cards show the source address and three unknown optical values, without fictitious sectors, and link to the publisher's map.
- Clipboard success was checked with an isolated browser stub that captured the exact generated URL. An unavailable Clipboard API displayed a selectable manual-copy field. Local links explain their scope.
- With localStorage blocked, the page remained usable, favorites worked in memory and a storage warning appeared.
- The shared town-hall point opened its camera picker. Selection, 2D/3D, sector visibility and reset worked.
- Desktop 1440×1000 and mobile 390×844 were inspected visually. Mobile search/selection worked, no horizontal overflow appeared, and the public-view action remained visible outside the scrolling card body.
- Aborted OSM requests produced the map error state. Removing the simulated fault and retrying restored the map while retaining the selected ITS card.
- No unhandled page errors occurred in the completed feature checks.

## Public data and limits

See [ITS_SOURCE_REVIEW.md](ITS_SOURCE_REVIEW.md) for the observed public endpoint, snapshot, count and source checksum. The 159 ITS coordinates are source metadata, not an independent survey. The four town-hall views retain an approximate OSM building reference and illustrative optics. All verification flags remain false. The entrance report and search for publicly documented private cameras are recorded in [CAMERA_REPORTS.md](CAMERA_REPORTS.md); OSM verifies the passage location, not camera presence or ownership.

No camera images or video streams were retrieved or embedded. Stream uptime, optical parameters, building/obstacle visibility and permission to redistribute video were not established. The 3D switch provides map tilt without extruded buildings. No scheduled live synchronization is configured.
