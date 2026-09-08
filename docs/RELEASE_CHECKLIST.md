# Portfolio release verification

## Completed (2026-09-08)

- PR [#1](https://github.com/Paremik/camera-map/pull/1) targets `main`.
- Fixed ITS import's incomplete TLS chain using verified public intermediates. The importer successfully validated 159 official records without disabling TLS checks.
- Automated catalogue updates use an explicit `--force-with-lease` expectation and workflow concurrency.
- GitHub checks passed for the ITS repair commit `aedeb83`.
- Map canvas layers, source synchronization, types and event handlers are separate modules. `MapCanvas.tsx` is 340 lines.
- Production build, TypeScript, ESLint and 50 unit tests passed locally.
- Nine existing browser scenarios and four additional language scenarios passed. Insurance panel, map controls and source dialog were inspected in English, Polish, Ukrainian and Russian.
- Public ITS snapshots for cameras `its:1` and `its:65` loaded successfully in installed Chrome and Edge (headless, local production build). No failed ITS requests were recorded. These are published still images, not video streams; this is not proof of continuous availability for all cameras.

## Before merging

- Configure shared Redis or a dedicated geocoder. Preview currently returns a translated unavailable message for street search because no environment variables are configured. Do not merge with this regression unresolved.
- Upstash setup reached the "Accept and Create" terms step; no database has been created. This requires the owner's consent to the integration terms and account information sharing, followed by verification of the free plan.
- Recheck the final commit's CI and Preview after configuration.
- Confirm deployment destination: the Git-connected Vercel project is `camera-map` (`camera-map-eta.vercel.app`); the existing public `opole-camera-map.vercel.app` was deployed through a separate project. Updating one does not establish that the other is updated.

## Further work

- Independently verify camera locations with evidence using [the coordinate verification protocol](COORDINATE_VERIFICATION.md). An API refresh is not field verification; zero independently verified points remains intentional.
- Continue separating state and UI from `CameraMap.tsx`.
- Server-rendered locale routes and locale-specific SEO remain separate work; the current language switch updates client content and `html.lang` after hydration.
