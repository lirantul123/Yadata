import { z } from "zod";

export const PredictSchema = z.object({
  size:      z.number().min(20).max(500),
  cityCode:  z.number().int().positive(),
  rooms:     z.number().min(1).max(15),
  balconies: z.number().int().min(0).max(5).default(0),
  parking:   z.number().int().min(0).max(2).default(0),
});

export type PredictInput = z.infer<typeof PredictSchema>;
