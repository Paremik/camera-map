# Drone zones

The optional drone layer contains one static aviation reference: **EPOP ATZ, Opole/Polska Nowa Wieś**.

The PAŻP AIP VFR publication dated 2025-08-07 defines it as a circle with a 10 km radius centred at `50°38'00"N 017°46'54"E`, from ground level to 5500 ft AMSL, active according to AUP. It also publishes class G, OPOLE RADIO `122.360 MHz` and Aeroklub Opolski as the operator. The application preserves those published values and generates the display circle geodesically.

Source: [PAŻP AIP VFR, AIRAC AMDT VFR 08/25](https://www.ais.pansa.pl/eAIPVFR/AIRAC%20AMDT%20VFR%2008-25_2025_08_07/documents/PDF/Amdt_VFR_A_2025_08.pdf).

The layer is **not a live flight authorisation tool** and does not label the entire ATZ as a permanent no-fly area. Activation and conditions change with AUP, NOTAM and other geographic zones. Temporary restrictions are deliberately not copied into the repository because a cached map could become unsafe. Before every flight, the pilot must enter the exact place, time, height, category and aircraft parameters in [PAŻP DroneTower](https://www.pansa.pl/dronetower/), read the current conditions and complete the required Check-In.

The UI follows the PAŻP geographic-zone vocabulary: red is reserved for DRA-P prohibited areas, orange for DRA-R restricted/conditional areas, and blue for DRA-I information or DRA-T technical requirements. Green means only that the locally loaded reference layer did not find a zone; it is deliberately labelled as a preliminary result rather than permission to fly. The current repository contains verified geometry only for EPOP ATZ, classified as conditional DRA-R/ATZ context.

DroneTower also warns that some restrictions connected to ground facilities may not appear unless a geographic zone has been established. The map therefore provides context and a direct official link, not permission to fly.
