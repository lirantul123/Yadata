import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import predictRoute from "./predict/routes/predictRoute";
import { checkML } from "./services/mlService";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const predictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

app.use(globalLimiter);
app.use("/api/predict", predictLimiter);
app.use("/api", predictRoute);

app.get("/health", async (_req, res) => {
  const mlOk = await checkML();
  res.json({ status: "ok", ml: mlOk ? "ok" : "unreachable" });
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
