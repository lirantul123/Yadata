import { Router } from "express";
import { predictController } from "../controllers/predictController";

const router = Router();

router.post("/predict", predictController);

export default router;
