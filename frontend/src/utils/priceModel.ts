import data from "../data/cityProfiles.json";

const PARKING_BONUS = 55_000;
const BALCONY_BONUS = 28_000;

const profiles = data.profiles as unknown as Record<string, [number, number]>;
const nationalPpsm = data.nationalPpsm;

export function predictPrice(params: {
  cityCode: number;
  rooms: number;
  size: number;
  parking: number;
  balconies: number;
}): number {
  const { cityCode, rooms, size, parking, balconies } = params;
  const pair = profiles[String(cityCode)];
  const ppsm3 = pair ? pair[0] : nationalPpsm;
  const ppsm4 = pair ? pair[1] : nationalPpsm;

  const slope = ppsm4 - ppsm3;
  let ppsm = ppsm3 + slope * (rooms - 3);
  const mid = (ppsm3 + ppsm4) / 2;
  ppsm = Math.max(mid * 0.7, Math.min(mid * 1.5, ppsm));

  return Math.max(size * ppsm + parking * PARKING_BONUS + balconies * BALCONY_BONUS, 100_000);
}
