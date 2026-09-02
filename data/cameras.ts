export type Camera = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  heading: number;
  fov: number;
  rangeMeters: number;
  sourceLabel: string;
  publicViewUrl?: string;
  note?: string;
};

// MVP seed. The four public views are described by the official City of Opole page.
// Exact physical camera placement / optical parameters are intentionally approximate
// until verified from a public technical source.
export const cameras: Camera[] = [
  {
    id: "ratusz-aleja-gwiazd",
    name: "Ratusz — Aleja Gwiazd",
    lat: 50.66625,
    lng: 17.92318,
    heading: 190,
    fov: 55,
    rangeMeters: 170,
    sourceLabel: "Miasto Opole — Opole okiem kamery",
    publicViewUrl: "https://www.opole.pl/dla-turysty/opole-okiem-kamery",
    note: "Публичный вид; сектор и дальность пока ориентировочные."
  },
  {
    id: "ratusz-zachod",
    name: "Ratusz — Wieża Piastowska / Amfiteatr",
    lat: 50.66625,
    lng: 17.92318,
    heading: 270,
    fov: 55,
    rangeMeters: 320,
    sourceLabel: "Miasto Opole — Opole okiem kamery",
    publicViewUrl: "https://www.opole.pl/dla-turysty/opole-okiem-kamery",
    note: "Публичный вид; сектор и дальность пока ориентировочные."
  },
  {
    id: "ratusz-katedra",
    name: "Ratusz — Katedra",
    lat: 50.66625,
    lng: 17.92318,
    heading: 320,
    fov: 50,
    rangeMeters: 330,
    sourceLabel: "Miasto Opole — Opole okiem kamery",
    publicViewUrl: "https://www.opole.pl/dla-turysty/opole-okiem-kamery",
    note: "Публичный вид; сектор и дальность пока ориентировочные."
  },
  {
    id: "ratusz-wschod",
    name: "Ratusz — ul. Św. Wojciecha / Na Górce",
    lat: 50.66625,
    lng: 17.92318,
    heading: 90,
    fov: 55,
    rangeMeters: 350,
    sourceLabel: "Miasto Opole — Opole okiem kamery",
    publicViewUrl: "https://www.opole.pl/dla-turysty/opole-okiem-kamery",
    note: "Публичный вид; сектор и дальность пока ориентировочные."
  }
];
