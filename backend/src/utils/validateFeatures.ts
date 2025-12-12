import { PredictFeatures } from "../predict/models/predictModel";

export const validateFeatures = (f: PredictFeatures): string | null => {
  if (!f.size || f.size < 10) return "Invalid size";
  if (!f.location || ![1, 2].includes(f.location))
    return "Location must be 1 or 2";
  if (f.rooms < 1 || f.rooms > 10) return "Rooms must be 1–10";
  if (f.age < 0) return "Age must be positive";
  if (![0, 1].includes(f.parking)) return "Parking must be 0 or 1";

  return null;
};
