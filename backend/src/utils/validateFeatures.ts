import { PredictFeatures } from "../predict/models/predictModel";

export const validateFeatures = (f: PredictFeatures): string | null => {
  if (f.size < 20 || f.size > 300) return "Invalid size";
  if (!f.cityCode) return "City is required";
  if (f.rooms < 1 || f.rooms > 10) return "Rooms must be 1–10";
  if (f.year < 1948 || f.year > Number(new Date().getFullYear())) return "Invalid age";
  if (![0, 1].includes(f.parking)) return "Parking must be 0 or 1";
  if (f.balconies < 0 || f.balconies > 4) return "Invalid balconies";

  return null;
};
