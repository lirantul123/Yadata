# Yadata Professional Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Yadata from a broken prototype to a production-ready Israeli real estate price predictor with a FastAPI ML service, hardened Express backend, and localStorage prediction history.

**Architecture:** Frontend (Vite/React/MUI) on Vercel calls Express backend on Railway, which calls a FastAPI ML microservice (also Railway). No database. History lives in browser localStorage.

**Tech Stack:** React 19, TypeScript, MUI v7, Framer Motion, react-hot-toast, Express 4, Zod, Helmet, FastAPI, scikit-learn, Railway, Vercel.

## Global Constraints

- Node.js ≥ 20, Python ≥ 3.11
- All prices in Israeli Shekels (₪, NIS)
- City codes are Lamas/CBS codes — must match values in `frontend/utils/cities.ts`
- Backend returns `{ price: number }` — NOT `predictedPrice`
- Frontend reads `VITE_API_URL` from env — never hardcode `localhost`
- ML service is stateless; model is trained at startup from `ml/real_estate.csv`
- Rate limits: 100 req/15min globally, 20 req/15min on `/api/predict`

---

## File Map

**New files:**
- `ml/main.py` — FastAPI app (health + predict endpoints)
- `ml/model.py` — PriceModel class: trains on CSV, exposes `.predict()`
- `ml/real_estate.csv` — copy of `backend/python/real_estate.csv`
- `ml/requirements.txt` — Python dependencies
- `ml/Procfile` — Railway start command
- `ml/railway.json` — Railway service config
- `backend/src/predict/schemas/predictSchema.ts` — Zod validation schema
- `backend/src/services/mlService.ts` — HTTP client for FastAPI
- `backend/Procfile` — Railway start command
- `backend/railway.json` — Railway service config
- `backend/.env.example` — env var template
- `frontend/src/utils/history.ts` — localStorage read/write helpers
- `frontend/src/pages/HistoryPage.tsx` — history list page
- `frontend/vercel.json` — Vercel build config
- `frontend/.env.example` — env var template
- `.env.example` — root-level reference

**Modified files:**
- `backend/src/app.ts` — add helmet, rate limiting, health endpoint, remove hardcoded PORT
- `backend/src/predict/controllers/predictController.ts` — call mlService, return `{ price }`
- `backend/src/predict/routes/predictRoute.ts` — unchanged (no modification needed)
- `backend/package.json` — add helmet, express-rate-limit, zod, axios
- `frontend/src/types/predict.ts` — fix PredictResponse type
- `frontend/src/api/predictApi.ts` — use VITE_API_URL
- `frontend/src/App.tsx` — add Routes for / and /history
- `frontend/src/theme.ts` — update palette to teal/orange
- `frontend/src/index.css` — remove dark mode defaults
- `frontend/src/pages/PredictForm.tsx` — per-field validation, toast, save history
- `frontend/package.json` — add react-hot-toast
- `frontend/vite.config.ts` — ensure VITE_API_URL is exposed

**Deleted files:**
- `backend/src/services/pythonML.ts`
- `backend/src/utils/validateFeatures.ts`

---

## Task 1: FastAPI ML Service

**Files:**
- Create: `ml/real_estate.csv`
- Create: `ml/model.py`
- Create: `ml/main.py`
- Create: `ml/requirements.txt`

**Interfaces:**
- Produces: `POST /predict` accepts `{ cityCode, rooms, size, parking, balconies }`, returns `{ price: float }`
- Produces: `GET /health` returns `{ status: "ok" }`
- Consumed by Task 2: `mlService.ts`

- [ ] **Step 1: Copy the training CSV into the ml service**

```bash
mkdir -p ml
cp backend/python/real_estate.csv ml/real_estate.csv
```

- [ ] **Step 2: Write `ml/requirements.txt`**

```
fastapi==0.115.5
uvicorn[standard]==0.32.1
scikit-learn==1.5.2
pandas==2.2.3
numpy==1.26.4
```

- [ ] **Step 3: Write `ml/model.py`**

```python
import os
import numpy as np
import pandas as pd

CITY_MULTIPLIER = {
    2600: 1.00,  # Tel Aviv
    70:   0.95,  # Jerusalem
    6500: 0.92,  # Herzliya
    6400: 0.90,  # Ramat Gan
    7600: 0.88,  # Ra'anana
    3000: 0.85,  # Modiin
    9700: 0.80,  # Bnei Brak
    7100: 0.80,  # Haifa
    9000: 0.78,  # Rishon LeZion
    2610: 0.78,  # Petah Tikva
    2660: 0.78,  # Rehovot
    6600: 0.75,  # Kfar Saba
    6300: 0.75,  # Holon
    3797: 0.72,  # Kiryat Motzkin
    9100: 0.72,  # Kiryat Ata
    6200: 0.70,  # Netanya
    6800: 0.70,  # Kfar Yona
    8500: 0.68,  # Yavne
    4000: 0.65,  # Hadera
    7300: 0.62,  # Ashkelon
    3780: 0.60,  # Ashdod
    7900: 0.60,  # Nahariya
    7000: 0.58,  # Acre
    7200: 0.56,  # Kiryat Ata (alternate code)
    7700: 0.55,  # Eilat
    6100: 0.52,  # Beersheba
    8300: 0.50,  # Nazareth
    8600: 0.48,  # Migdal HaEmek
    7400: 0.46,  # Kiryat Gat
    8700: 0.43,  # Kiryat Shmona
    8400: 0.40,  # Sderot
    5000: 0.70,  # Other
}

_CSV_PATH = os.path.join(os.path.dirname(__file__), "real_estate.csv")


class PriceModel:
    def __init__(self, csv_path: str = _CSV_PATH):
        df = pd.read_csv(csv_path)

        prices_3: dict[int, list[float]] = {}
        prices_4plus: dict[int, list[float]] = {}

        for _, row in df.iterrows():
            code = int(row["Lamas_code"])
            col3 = "average price (NIS) 3 rooms apartments"
            col4 = "average price (NIS) 4+ rooms apartments"
            if pd.notna(row[col3]):
                prices_3.setdefault(code, []).append(float(row[col3]))
            if pd.notna(row[col4]):
                prices_4plus.setdefault(code, []).append(float(row[col4]))

        self._avg_3: dict[int, float] = {c: float(np.mean(p)) for c, p in prices_3.items()}
        self._avg_4plus: dict[int, float] = {c: float(np.mean(p)) for c, p in prices_4plus.items()}

        all_3 = [p for ps in prices_3.values() for p in ps]
        all_4plus = [p for ps in prices_4plus.values() for p in ps]
        self._global_3 = float(np.mean(all_3))
        self._global_4plus = float(np.mean(all_4plus))
        self._global_multiplier = float(np.mean(list(CITY_MULTIPLIER.values())))

    def predict(
        self,
        city_code: int,
        rooms: float,
        size: float,
        parking: int,
        balconies: int,
    ) -> float:
        is_small = rooms <= 3.5

        if is_small:
            city_base = self._avg_3.get(city_code)
            if city_base is None:
                m = CITY_MULTIPLIER.get(city_code, self._global_multiplier)
                city_base = self._global_3 * m
            ref_size = 75.0
        else:
            city_base = self._avg_4plus.get(city_code)
            if city_base is None:
                m = CITY_MULTIPLIER.get(city_code, self._global_multiplier)
                city_base = self._global_4plus * m
            ref_size = 110.0

        size_factor = (size / ref_size) ** 0.75
        room_delta = rooms - (3.0 if is_small else 4.0)
        room_factor = 1.0 + room_delta * 0.12
        extras = 1.0 + parking * 0.07 + balconies * 0.04

        price = city_base * size_factor * room_factor * extras
        return max(price, 150_000.0)
```

- [ ] **Step 4: Write `ml/main.py`**

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from model import PriceModel

app = FastAPI(title="Yadata ML Service")
_model = PriceModel()


class PredictRequest(BaseModel):
    cityCode: int = Field(..., gt=0)
    rooms: float = Field(..., ge=1, le=15)
    size: float = Field(..., ge=20, le=500)
    parking: int = Field(0, ge=0, le=2)
    balconies: int = Field(0, ge=0, le=5)


class PredictResponse(BaseModel):
    price: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    try:
        price = _model.predict(
            city_code=body.cityCode,
            rooms=body.rooms,
            size=body.size,
            parking=body.parking,
            balconies=body.balconies,
        )
        return PredictResponse(price=price)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

- [ ] **Step 5: Install dependencies and smoke-test the service**

```bash
cd ml
pip install -r requirements.txt
uvicorn main:app --port 8000 &
sleep 2
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"cityCode":2600,"rooms":3,"size":80,"parking":1,"balconies":1}' | python3 -m json.tool
# Expected: {"price": <number between 700000 and 2000000>}
curl -s http://localhost:8000/health
# Expected: {"status":"ok"}
kill %1
cd ..
```

- [ ] **Step 6: Commit**

```bash
git add ml/
git commit -m "feat: add FastAPI ML microservice with real data model"
```

---

## Task 2: Backend Refactor

**Files:**
- Modify: `backend/src/app.ts`
- Create: `backend/src/predict/schemas/predictSchema.ts`
- Create: `backend/src/services/mlService.ts`
- Modify: `backend/src/predict/controllers/predictController.ts`
- Modify: `backend/package.json`
- Create: `backend/.env.example`
- Delete: `backend/src/services/pythonML.ts`
- Delete: `backend/src/utils/validateFeatures.ts`

**Interfaces:**
- Consumes: FastAPI `POST /predict` (from Task 1) — returns `{ price: float }`
- Produces: `POST /api/predict` — returns `{ price: number }`
- Produces: `GET /health` — returns `{ status: "ok", ml: "ok" | "unreachable" }`

- [ ] **Step 1: Install new backend dependencies**

```bash
cd backend
npm install helmet express-rate-limit zod axios
npm install --save-dev @types/express-rate-limit
cd ..
```

Expected: packages installed without errors.

- [ ] **Step 2: Write `backend/src/predict/schemas/predictSchema.ts`**

```typescript
import { z } from "zod";

export const PredictSchema = z.object({
  size:      z.number().min(20).max(500),
  cityCode:  z.number().int().positive(),
  rooms:     z.number().min(1).max(15),
  balconies: z.number().int().min(0).max(5).default(0),
  parking:   z.number().int().min(0).max(2).default(0),
});

export type PredictInput = z.infer<typeof PredictSchema>;
```

- [ ] **Step 3: Write `backend/src/services/mlService.ts`**

```typescript
import axios from "axios";

const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8000";

export async function callML(input: {
  cityCode: number;
  rooms: number;
  size: number;
  parking: number;
  balconies: number;
}): Promise<number> {
  try {
    const { data } = await axios.post<{ price: number }>(`${ML_URL}/predict`, input, {
      timeout: 10_000,
    });
    return data.price;
  } catch {
    throw new Error("ML_UNREACHABLE");
  }
}

export async function checkML(): Promise<boolean> {
  try {
    await axios.get(`${ML_URL}/health`, { timeout: 3_000 });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Rewrite `backend/src/predict/controllers/predictController.ts`**

Replace the entire file with:

```typescript
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
```

- [ ] **Step 5: Rewrite `backend/src/app.ts`**

Replace the entire file with:

```typescript
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
```

- [ ] **Step 6: Create `backend/.env.example`**

```
ML_SERVICE_URL=http://localhost:8000
PORT=3000
NODE_ENV=development
```

- [ ] **Step 7: Delete the old files**

```bash
rm backend/src/services/pythonML.ts
rm backend/src/utils/validateFeatures.ts
```

- [ ] **Step 8: Verify backend compiles and starts**

```bash
cd backend
npm run dev &
sleep 3
curl -s http://localhost:3000/health | python3 -m json.tool
# Expected: {"status":"ok","ml":"unreachable"}  (ML not running — that's fine)
kill %1
cd ..
```

If TypeScript errors appear, fix them before committing.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: refactor backend — Zod validation, mlService HTTP client, helmet, rate limiting"
```

---

## Task 3: Frontend Foundation

**Files:**
- Modify: `frontend/src/types/predict.ts`
- Modify: `frontend/src/api/predictApi.ts`
- Modify: `frontend/src/theme.ts`
- Modify: `frontend/src/index.css`
- Modify: `frontend/package.json`
- Create: `frontend/.env.example`

**Interfaces:**
- Produces: `predictPrice(data: PredictRequest): Promise<PredictResponse>` where `PredictResponse = { price: number }`
- Consumed by Task 4: PredictForm

- [ ] **Step 1: Install `react-hot-toast`**

```bash
cd frontend
npm install react-hot-toast
cd ..
```

- [ ] **Step 2: Fix `frontend/src/types/predict.ts`**

Replace entire file:

```typescript
export interface PredictRequest {
  size: number;
  cityCode: number;
  rooms: number;
  parking: number;
  balconies: number;
}

export interface PredictResponse {
  price: number;
}
```

- [ ] **Step 3: Fix `frontend/src/api/predictApi.ts`**

Replace entire file:

```typescript
import axios from "axios";
import type { PredictRequest, PredictResponse } from "../types/predict";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function predictPrice(data: PredictRequest): Promise<PredictResponse> {
  const res = await axios.post<PredictResponse>(`${BASE}/api/predict`, data);
  return res.data;
}
```

- [ ] **Step 4: Update `frontend/src/theme.ts`** to match teal/orange design already in PredictForm:

```typescript
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary:   { main: "#00796b" },
    secondary: { main: "#ff8a65" },
  },
  typography: {
    fontFamily: "system-ui, Avenir, Helvetica, Arial, sans-serif",
  },
});

export default theme;
```

- [ ] **Step 5: Replace `frontend/src/index.css`** (remove dark mode defaults that fight MUI):

```css
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 6: Create `frontend/.env.example`**

```
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd frontend
npm run build 2>&1 | tail -20
cd ..
```

Expected: no errors (may see warnings — those are ok).

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "fix: correct PredictResponse type, use VITE_API_URL, update theme and CSS"
```

---

## Task 4: PredictForm — Validation, Toast, and History Save

**Files:**
- Create: `frontend/src/utils/history.ts`
- Modify: `frontend/src/pages/PredictForm.tsx`

**Interfaces:**
- Consumes: `predictPrice` from `../api/predictApi` (Task 3)
- Consumes: `addHistoryEntry` from `../utils/history` (defined this task)
- Produces: saved `HistoryEntry` in localStorage after each prediction
- Consumed by Task 5: HistoryPage reads the same localStorage key

- [ ] **Step 1: Write `frontend/src/utils/history.ts`**

```typescript
export interface HistoryEntry {
  id: string;
  size: number;
  cityCode: number;
  cityName: string;
  rooms: number;
  balconies: number;
  parking: number;
  price: number;
  createdAt: string;
}

const KEY = "yadata_history";
const MAX = 20;

export function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "createdAt">): void {
  const history = getHistory();
  const full: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const next = [full, ...history].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}
```

- [ ] **Step 2: Rewrite `frontend/src/pages/PredictForm.tsx`**

Replace the entire file:

```tsx
import { useState } from "react";
import {
  Box, Button, Container, TextField, Typography,
  MenuItem, Paper, CircularProgress, Link,
} from "@mui/material";
import { motion, useMotionValue, animate } from "framer-motion";
import HouseIcon from "@mui/icons-material/House";
import ApartmentIcon from "@mui/icons-material/Apartment";
import toast from "react-hot-toast";
import { predictPrice } from "../api/predictApi";
import { addHistoryEntry } from "../utils/history";
import { CITY_MAP } from "../../utils/cities";

const CITY_NAME_BY_CODE: Record<number, string> = Object.fromEntries(
  Object.entries(CITY_MAP).map(([name, code]) => [code, name])
);

interface FormState {
  size: string;
  cityCode: string;
  rooms: string;
  balconies: string;
  parking: string;
}

interface FieldErrors {
  size?: string;
  cityCode?: string;
  rooms?: string;
}

function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const size = Number(form.size);
  const rooms = Number(form.rooms);

  if (!form.size) errors.size = "Required";
  else if (size < 20 || size > 500) errors.size = "Must be 20–500 m²";

  if (!form.cityCode) errors.cityCode = "Required";

  if (!form.rooms) errors.rooms = "Required";
  else if (rooms < 1 || rooms > 15) errors.rooms = "Must be 1–15";

  return errors;
}

export default function PredictForm() {
  const [form, setForm] = useState<FormState>({
    size: "", cityCode: "", rooms: "", balconies: "0", parking: "0",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const animatedPrice = useMotionValue(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [e.target.name]: e.target.value };
    setForm(next);
    const newErrors = validateForm(next);
    setErrors((prev) => ({ ...prev, [e.target.name]: newErrors[e.target.name as keyof FieldErrors] }));
  };

  const handleSubmit = async () => {
    const fieldErrors = validateForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    setPrice(null);
    animatedPrice.set(0);

    try {
      const result = await predictPrice({
        cityCode:  Number(form.cityCode),
        rooms:     Number(form.rooms),
        size:      Number(form.size),
        parking:   Number(form.parking),
        balconies: Number(form.balconies),
      });

      addHistoryEntry({
        size:      Number(form.size),
        cityCode:  Number(form.cityCode),
        cityName:  CITY_NAME_BY_CODE[Number(form.cityCode)] ?? "Unknown",
        rooms:     Number(form.rooms),
        balconies: Number(form.balconies),
        parking:   Number(form.parking),
        price:     result.price,
      });

      animate(animatedPrice, result.price, {
        duration: 1.5,
        onUpdate: (val) => setPrice(Math.round(val)),
      });
    } catch {
      toast.error("Prediction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !!Object.keys(validateForm(form)).length;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #d0e8f2, #f0f7f4)",
        py: 8,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Paper sx={{ p: 6, borderRadius: 6, background: "rgba(255,255,255,0.97)", boxShadow: "0 25px 50px rgba(0,0,0,0.1)" }}>
          {/* Header */}
          <Box textAlign="center" mb={4} position="relative">
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", left: -40, top: -20 }}
            >
              <HouseIcon sx={{ fontSize: 60, color: "#ff8a65" }} />
            </motion.div>
            <motion.div
              animate={{ y: [0, -25, 0], rotate: [0, -10, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", right: -40, top: -20 }}
            >
              <ApartmentIcon sx={{ fontSize: 60, color: "#4db6ac" }} />
            </motion.div>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: "#00796b" }}>
              Predict House / Apartment Price
            </Typography>
            <Typography variant="body2" sx={{ color: "#555", fontStyle: "italic" }}>
              Enter property details for an instant estimate
            </Typography>
            <Link href="/history" underline="hover" sx={{ display: "block", mt: 1, color: "#00796b", fontSize: 14 }}>
              View prediction history →
            </Link>
          </Box>

          {/* Form */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Size (m²)"
              name="size"
              type="number"
              value={form.size}
              onChange={handleChange}
              fullWidth
              required
              error={!!errors.size}
              helperText={errors.size}
              inputProps={{ min: 20, max: 500 }}
            />
            <TextField
              label="City"
              name="cityCode"
              select
              value={form.cityCode}
              onChange={handleChange}
              fullWidth
              required
              error={!!errors.cityCode}
              helperText={errors.cityCode}
            >
              {Object.entries(CITY_MAP).map(([name, code]) => (
                <MenuItem key={code} value={code}>{name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Rooms"
              name="rooms"
              type="number"
              value={form.rooms}
              onChange={handleChange}
              fullWidth
              required
              error={!!errors.rooms}
              helperText={errors.rooms}
              inputProps={{ min: 1, max: 15, step: 0.5 }}
            />
            <TextField
              label="Balconies"
              name="balconies"
              select
              value={form.balconies}
              onChange={handleChange}
              fullWidth
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Parking Spots"
              name="parking"
              select
              value={form.parking}
              onChange={handleChange}
              fullWidth
            >
              {[0, 1, 2].map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Submit */}
          <Box textAlign="center" mt={4}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={isDisabled}
              sx={{
                px: 8, py: 2, fontWeight: 700, fontSize: 18,
                borderRadius: 3,
                background: "linear-gradient(135deg, #26a69a 0%, #00796b 100%)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                "&:hover": {
                  background: "linear-gradient(135deg, #009688 0%, #004d40 100%)",
                  transform: "scale(1.05)",
                },
                transition: "all 0.3s ease",
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Predict Price"}
            </Button>
          </Box>

          {/* Result */}
          {price !== null && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              <Box
                mt={5} p={4} textAlign="center"
                sx={{
                  background: "linear-gradient(135deg, #ff8a65, #ffb74d)",
                  borderRadius: 3,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                }}
              >
                <Typography variant="h6" sx={{ color: "#fff", letterSpacing: 1 }}>
                  Estimated Price
                </Typography>
                <Typography variant="h3" sx={{ color: "#fff", fontWeight: 700, fontFamily: "monospace", letterSpacing: 1.5 }}>
                  ₪ {price.toLocaleString()}
                </Typography>
              </Box>
            </motion.div>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit 2>&1 | head -30
cd ..
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/history.ts frontend/src/pages/PredictForm.tsx
git commit -m "feat: add localStorage history util, improve PredictForm with per-field validation and toast"
```

---

## Task 5: HistoryPage and Routing

**Files:**
- Create: `frontend/src/pages/HistoryPage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `getHistory`, `clearHistory` from `../utils/history` (Task 4)
- Produces: route `/history` renders HistoryPage

- [ ] **Step 1: Write `frontend/src/pages/HistoryPage.tsx`**

```tsx
import {
  Box, Button, Container, Paper, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, Link,
} from "@mui/material";
import { useState } from "react";
import { getHistory, clearHistory } from "../utils/history";

export default function HistoryPage() {
  const [entries, setEntries] = useState(() => getHistory());

  const handleClear = () => {
    clearHistory();
    setEntries([]);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #d0e8f2, #f0f7f4)",
        py: 8,
      }}
    >
      <Container maxWidth="md">
        <Paper sx={{ p: 4, borderRadius: 4, boxShadow: "0 25px 50px rgba(0,0,0,0.1)" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700} color="primary">
              Prediction History
            </Typography>
            <Link href="/" underline="hover" sx={{ color: "#00796b", fontSize: 14 }}>
              ← Back to predictor
            </Link>
          </Box>

          {entries.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Typography variant="h6" color="text.secondary">
                No predictions yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Make a prediction and it will appear here.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>City</strong></TableCell>
                      <TableCell align="right"><strong>Rooms</strong></TableCell>
                      <TableCell align="right"><strong>Size (m²)</strong></TableCell>
                      <TableCell align="right"><strong>Parking</strong></TableCell>
                      <TableCell align="right"><strong>Balconies</strong></TableCell>
                      <TableCell align="right"><strong>Price (₪)</strong></TableCell>
                      <TableCell align="right"><strong>Date</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell>{e.cityName}</TableCell>
                        <TableCell align="right">{e.rooms}</TableCell>
                        <TableCell align="right">{e.size}</TableCell>
                        <TableCell align="right">{e.parking}</TableCell>
                        <TableCell align="right">{e.balconies}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "#00796b" }}>
                          {Math.round(e.price).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "text.secondary", fontSize: 12 }}>
                          {new Date(e.createdAt).toLocaleDateString("en-IL")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Box textAlign="right" mt={2}>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={handleClear}
                >
                  Clear history
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 2: Rewrite `frontend/src/App.tsx`**

```tsx
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import PredictForm from "./pages/PredictForm";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<PredictForm />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend
npm run build 2>&1 | tail -20
cd ..
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Start both services and manual test**

Terminal 1:
```bash
cd ml && uvicorn main:app --port 8000
```

Terminal 2:
```bash
cd backend && ML_SERVICE_URL=http://localhost:8000 npm run dev
```

Terminal 3:
```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` in browser:
1. Fill form: Size=100, City=Tel Aviv, Rooms=3, Parking=1, Balconies=1
2. Click "Predict Price" — should animate to a number between ₪700,000 and ₪2,500,000
3. Click "View prediction history →" — should show the entry
4. Click "Clear history" — table should empty
5. Test invalid input: Size=5 — should show "Must be 20–500 m²" helper text
6. Test network error: stop the backend, try predict — should show toast "Prediction failed. Please try again."

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/HistoryPage.tsx frontend/src/App.tsx
git commit -m "feat: add HistoryPage and routing"
```

---

## Task 6: Deployment Config

**Files:**
- Create: `frontend/vercel.json`
- Create: `backend/Procfile`
- Create: `backend/railway.json`
- Create: `ml/Procfile`
- Create: `ml/railway.json`
- Create: `.env.example`

**Interfaces:**
- Produces: Auto-deploy on push to `main` for all 3 services

- [ ] **Step 1: Write `frontend/vercel.json`**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The `rewrites` rule ensures React Router handles `/history` on refresh (Vercel doesn't serve it directly otherwise).

- [ ] **Step 2: Write `backend/Procfile`**

```
web: npm run start
```

- [ ] **Step 3: Write `backend/railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- [ ] **Step 4: Ensure `backend/package.json` has a `start` script**

Check `backend/package.json` — it already has `"start": "node dist/app.js"`. Also confirm there is a `"build": "tsc"` script. If the `build` script is missing, add it.

The `backend/tsconfig.json` must output to `dist/`. Verify:

```bash
cat backend/tsconfig.json | grep outDir
```

Expected output: `"outDir": "./dist"` or similar. If missing, add `"outDir": "./dist"` to the `compilerOptions` in `backend/tsconfig.json`.

- [ ] **Step 5: Write `ml/Procfile`**

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

- [ ] **Step 6: Write `ml/railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- [ ] **Step 7: Write root `.env.example`**

```
# Frontend (set in Vercel dashboard under Environment Variables)
VITE_API_URL=https://YOUR_BACKEND.up.railway.app

# Backend (set in Railway dashboard for the backend service)
ML_SERVICE_URL=https://YOUR_ML.up.railway.app
PORT=3000
NODE_ENV=production

# ML service (set in Railway dashboard for the ML service)
PORT=8000
```

- [ ] **Step 8: Commit**

```bash
git add frontend/vercel.json backend/Procfile backend/railway.json ml/Procfile ml/railway.json .env.example
git commit -m "feat: add Vercel and Railway deployment configs"
```

---

## Task 7: Deploy to Railway + Vercel

This task requires manual steps in the browser. Follow in order.

**Prerequisite:** Push all commits to GitHub `main` branch.

```bash
git push origin main
```

---

### Deploy ML Service to Railway

- [ ] **Step 1:** Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → select `Yadata`

- [ ] **Step 2:** Railway auto-detects the repo root. Change the **root directory** to `ml/`

- [ ] **Step 3:** Railway uses NIXPACKS to detect Python. Verify the start command is: `uvicorn main:app --host 0.0.0.0 --port $PORT`

- [ ] **Step 4:** After deploy succeeds, go to Settings → Networking → Generate Domain. Note the URL (e.g. `https://yadata-ml.up.railway.app`)

- [ ] **Step 5:** Verify ML service is live:
  ```bash
  curl https://yadata-ml.up.railway.app/health
  # Expected: {"status":"ok"}
  ```

---

### Deploy Backend to Railway

- [ ] **Step 6:** In Railway → New Service (same project) → Deploy from GitHub repo → same `Yadata` repo

- [ ] **Step 7:** Set **root directory** to `backend/`

- [ ] **Step 8:** In the service's **Variables** tab, add:
  - `ML_SERVICE_URL` = the ML service URL from Step 4
  - `NODE_ENV` = `production`

- [ ] **Step 9:** After deploy, generate a domain. Note the URL (e.g. `https://yadata-api.up.railway.app`)

- [ ] **Step 10:** Verify backend is live:
  ```bash
  curl https://yadata-api.up.railway.app/health
  # Expected: {"status":"ok","ml":"ok"}
  ```

---

### Configure Vercel Frontend

- [ ] **Step 11:** Go to [vercel.com](https://vercel.com) → your `yadata` project → Settings → Environment Variables

- [ ] **Step 12:** Add variable:
  - Name: `VITE_API_URL`
  - Value: the backend Railway URL from Step 9 (e.g. `https://yadata-api.up.railway.app`)
  - Environment: Production

- [ ] **Step 13:** Trigger a redeploy: Deployments tab → Redeploy (or push a new commit)

- [ ] **Step 14:** Open `https://yadata.vercel.app` — make a prediction — verify price appears

- [ ] **Step 15:** Open `https://yadata.vercel.app/history` after a prediction — verify history entry appears

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by task |
|---|---|
| Bug: predictedPrice vs price | Task 2 (controller) + Task 3 (types/api) |
| Bug: PredictResponse type | Task 3 |
| Bug: size not in ML model | Task 1 (PriceModel.predict uses size) |
| Bug: parking validation 0-2 | Task 2 (Zod: max(2)) |
| Bug: Python spawn per request | Task 2 (deleted pythonML.ts, uses HTTP) |
| FastAPI service | Task 1 |
| Zod validation | Task 2 |
| mlService HTTP client | Task 2 |
| helmet + rate limiting | Task 2 |
| /health endpoint | Task 2 |
| ML_SERVICE_URL env var | Task 2 |
| react-hot-toast | Task 3 |
| VITE_API_URL env var | Task 3 |
| Theme update | Task 3 |
| CSS cleanup | Task 3 |
| Per-field form validation | Task 4 |
| localStorage save on predict | Task 4 |
| HistoryEntry schema | Task 4 |
| HistoryPage with table | Task 5 |
| Clear history button | Task 5 |
| Toaster in App | Task 5 |
| React Router routes | Task 5 |
| vercel.json (with SPA rewrite) | Task 6 |
| railway.json for backend | Task 6 |
| railway.json for ML | Task 6 |
| Procfiles | Task 6 |
| Deploy instructions | Task 7 |

All spec requirements covered. ✓

**Type consistency check:**

- `PredictRequest` defined in Task 3 (`types/predict.ts`): `{ size, cityCode, rooms, parking, balconies }` — used in Task 4 (`PredictForm.tsx`) ✓
- `PredictResponse` defined in Task 3: `{ price: number }` — returned by Task 2 controller ✓
- `HistoryEntry` defined in Task 4 (`history.ts`) with `id, size, cityCode, cityName, rooms, balconies, parking, price, createdAt` — consumed in Task 5 (`HistoryPage.tsx`) using same field names ✓
- `callML()` defined in Task 2 (`mlService.ts`): takes `{ cityCode, rooms, size, parking, balconies }`, returns `Promise<number>` — called in Task 2 controller with `parsed.data` (which is `PredictInput` from Zod) ✓
- `addHistoryEntry()` defined in Task 4 (`history.ts`): takes `Omit<HistoryEntry, "id" | "createdAt">` — called in Task 4 form with all required fields ✓
