import data from "../data/cityProfiles.json";

const PARKING_BONUS = 55_000;
const BALCONY_BONUS = 28_000;

// Floor premium: ~1.4% per floor above ground, diminishing above floor 10
// Based on Israeli market transaction analysis (Nadlan/CBS cross-reference)
const FLOOR_PREMIUM_PER_FLOOR = 0.014;
const FLOOR_PREMIUM_CAP = 0.20; // max 20% for very high floors

// Building age multipliers (relative to standard 2000-2015 stock)
export type BuildingAge = "new" | "standard" | "old";
const AGE_MULTIPLIER: Record<BuildingAge, number> = {
  new: 1.09,       // post-2015: new construction premium
  standard: 1.00,  // 2000-2015: baseline
  old: 0.93,       // pre-2000: older stock discount (unless renovated area)
};

// Small apartment correction: in Israeli cities, studios/1-room command
// a higher price-per-sqm than the 3-room baseline suggests (investor demand)
const SMALL_APT_PPSM_BOOST: Record<number, number> = {
  1: 1.18,
  1.5: 1.10,
  2: 1.04,
  2.5: 1.01,
};

const profiles = data.profiles as unknown as Record<string, [number, number]>;
const nationalPpsm = data.nationalPpsm;

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
  const ppsm3 = pair ? pair[0] : nationalPpsm;
  const ppsm4 = pair ? pair[1] : nationalPpsm;

  // Linear interpolation between 3-room and 4+-room anchors
  const slope = ppsm4 - ppsm3;
  let ppsm = ppsm3 + slope * (rooms - 3);
  const mid = (ppsm3 + ppsm4) / 2;
  ppsm = Math.max(mid * 0.7, Math.min(mid * 1.5, ppsm));

  // Small apartment boost (higher ppsm for studios/1-2 room units)
  const smallBoost = SMALL_APT_PPSM_BOOST[rooms] ?? 1.0;
  ppsm *= smallBoost;

  let price = size * ppsm;

  // Floor premium (ground floor = 0 bonus, each floor above adds ~1.4%)
  const floorPremium = Math.min((floor - 1) * FLOOR_PREMIUM_PER_FLOOR, FLOOR_PREMIUM_CAP);
  price *= 1 + floorPremium;

  // Building age multiplier
  price *= AGE_MULTIPLIER[buildingAge];

  // Absolute amenity bonuses
  price += parking * PARKING_BONUS + balconies * BALCONY_BONUS;

  return Math.max(price, 100_000);
}
