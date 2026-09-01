import data from "../data/cityProfiles.json";

// Data source: nadlan.gov.il Tax Authority transaction prices (2024-2025)
// profiles[cityCode] = [ppsm3, ppsm4, ppsm5]
//   ppsm3 = buy3Rooms / 75m²  (3-room standard size)
//   ppsm4 = buy4Rooms / 95m²  (4-room standard size)
//   ppsm5 = buy5Rooms / 120m² (5-room standard size)

const PARKING_BONUS = 55_000;
const BALCONY_BONUS = 28_000;

const FLOOR_PREMIUM_PER_FLOOR = 0.014;
const FLOOR_PREMIUM_CAP = 0.20;

export type BuildingAge = "new" | "standard" | "old";
const AGE_MULTIPLIER: Record<BuildingAge, number> = {
  new: 1.09,
  standard: 1.00,
  old: 0.93,
};

const profiles = data.profiles as unknown as Record<string, [number, number, number]>;
const nationalPpsm = data.nationalPpsm;

function interpolatePpsm(pair: [number, number, number], rooms: number): number {
  const [p3, p4, p5] = pair;

  if (rooms <= 3) {
    // Extrapolate below 3 rooms: smaller units typically have higher ppsm
    const slope = p3 - p4; // positive = p3 > p4 means smaller = pricier per m²
    return p3 + slope * (3 - rooms) * 0.6; // dampened extrapolation
  } else if (rooms <= 4) {
    return p3 + (p4 - p3) * (rooms - 3);
  } else if (rooms <= 5) {
    return p4 + (p5 - p4) * (rooms - 4);
  } else {
    // Extrapolate above 5 rooms: diminishing price per m²
    const slope = p5 - p4;
    return p5 + slope * (rooms - 5) * 0.5;
  }
}

export function predictPrice(params: {
  cityCode: number;
  rooms: number;
  size: number;
  parking: number;
  balconies: number;
  floor: number;
  buildingAge: BuildingAge;
}): number {
  const { cityCode, rooms, size, parking, balconies, floor, buildingAge } = params;

  const pair = profiles[String(cityCode)];
  const ppsm = pair
    ? interpolatePpsm(pair, rooms)
    : nationalPpsm;

  let price = size * ppsm;

  const floorPremium = Math.min((floor - 1) * FLOOR_PREMIUM_PER_FLOOR, FLOOR_PREMIUM_CAP);
  price *= 1 + floorPremium;

  price *= AGE_MULTIPLIER[buildingAge];

  price += parking * PARKING_BONUS + balconies * BALCONY_BONUS;

  return Math.max(price, 100_000);
}
