import { Request, Response } from "express";
import { PredictFeatures } from "../models/predictModel";
import { validateFeatures } from "../../utils/validateFeatures";
import { runPythonModel } from "../../services/pythonML";

export const predictController = async (req: Request, res: Response) => {
  try {
    const features: PredictFeatures = req.body;

    const validationError = validateFeatures(features);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await runPythonModel(features);
    res.json({ predictedPrice: result.price });
  } catch (error) {
    console.error("Prediction error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
