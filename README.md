# Opole Camera Map — MVP

Prototype web app for visualizing publicly documented cameras in Opole.

## What is included
- Next.js + TypeScript
- MapLibre map using OpenStreetMap tiles (no Mapbox token needed)
- Camera markers
- Approximate field-of-view sectors
- Camera details panel
- Link to the official public camera page

## Run
```bash
npm install
npm run dev
```
Then open http://localhost:3000

## Data policy
Only add camera coordinates / streams / optical parameters from lawful public sources. Do not infer or publish hidden feeds, credentials, or non-public access paths.

## Next steps
1. Import public ITS camera coordinates from the official map/network payload.
2. Add `verified` and `sourceUrl` fields.
3. Embed video only where the publisher permits iframe/hls embedding; otherwise open the official source.
4. Add search, filters, camera types and a 2D/3D toggle.
5. Replace approximate FOV/range with verified values when available.
