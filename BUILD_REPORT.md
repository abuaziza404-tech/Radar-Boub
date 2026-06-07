# BOUH Terrain Radar V52.1 Final Field Pro

Integrated application source package built from the accepted project line:

- V52 Final Field Command: main operational base.
- V56 Arabic Satellite UI: interface organization.
- V25 Hybrid Esri Pro: hybrid satellite behavior.
- V21 SQLite Center: nearest-cell lookup concept.
- V57 Light Telescope: lightweight radar mode.

## Data status
This package contains an integrated compact deterministic field grid manifest and app-side generator for 25,027 cells. It is intended as an APK build core and operational interface package. Replace or augment `apps/web/public/data/bouh_v52_1_manifest.json` with real exported SQLite/JSON cell data when available.

## Build target
- Android package: `com.bouh.terrainradar`
- App name: `بوح التضاريس V52.1`
- Builder: GitHub Actions / Capacitor Android
