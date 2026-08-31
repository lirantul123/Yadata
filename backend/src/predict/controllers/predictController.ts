import { Request, Response } from "express";
import { PredictSchema } from "../schemas/predictSchema";
import { callML } from "../../services/mlService";

export const predictController = async (req: Request, res: Response) => {
  const parsed = PredictSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  try {
    const price = await callML(parsed.data);
    return res.json({ price });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "ML_UNREACHABLE") {
      return res.status(503).json({ error: "Prediction service unavailable" });
    }
    console.error("Prediction error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
