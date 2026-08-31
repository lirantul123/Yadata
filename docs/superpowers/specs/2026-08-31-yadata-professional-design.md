# Yadata — Professional Upgrade Design

**Date:** 2026-08-31  
**Goal:** Production-ready Israeli real estate price prediction app with fast ML and localStorage prediction history. No auth, no database.

---

## 1. Overview

Yadata predicts apartment/house prices in Israel. The upgrade introduces:
- A persistent FastAPI ML microservice (replaces per-request Python spawn — cuts latency from ~2-3s to ~50ms)
- localStorage-based prediction history (no DB, no auth)
- Bug fixes that currently break the core prediction flow
- Production hardening (rate limiting, security headers, env vars, proper error handling)

---

## 2. Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  React Frontend  │────▶│  Express Backend      │────▶│  FastAPI ML      │
│  (Vite, MUI)    │     │  (TypeScript)         │     │  (Python 3.11)   │
│  :5173          │     │  :3000                │     │  :8000           │
└─────────────────┘     └──────────────────────┘     └──────────────────┘
        │
        ▼
  localStorage
  (prediction history)
```

No database. History lives in the browser.

---

## 3. Bug Fixes (Critical — app is currently broken)

| Bug | Location | Fix |
|-----|----------|-----|
| Backend returns `{ predictedPrice }`, frontend reads `.price` | `predictController.ts`, `predictApi.ts` | Normalize to `{ price }` everywhere |
| `PredictResponse` has a phantom method signature | `frontend/src/types/predict.ts` | Replace with `{ price: number }` |
| `size` sent from frontend but not used in ML model | `backend/python/model.py` | Include size in feature vector |
| Validation rejects parking=2, form allows 0/1/2 | `validateFeatures.ts` | Allow 0, 1, 2 |
| Python process spawned per request (~2-3s latency) | `pythonML.ts` | Remove; call FastAPI instead |

---

## 4. FastAPI ML Service

**Location:** `ml/` (new directory at project root)

**Startup:** Trains LinearRegression on `backend/python/real_estate.csv` once at startup. Model stays in memory.

**Endpoints:**
- `POST /predict` — `{ cityCode, rooms, size, parking, balconies, year }` → `{ price: float }`
- `GET /health` → `{ status: "ok" }`

**ML logic (ported from ML_Practice/main.py):**
- Features: `[cityCode, year, rooms, size, parking, balconies]`
- Target: `log(price)` — exponentiated on prediction
- Post-prediction multipliers:
  - City factor: per CITY_MAP dict (Tel Aviv=1.0, Herzliya=0.95, etc.)
  - Luxury factor: `1.0 + max(0, (size - 160) * 0.015)` for large apartments
  - Extra factor: `1 + parking * 0.07 + balconies * 0.05`

**Files:**
```
ml/
  main.py           # FastAPI app
  model.py          # Training + predict logic
  requirements.txt  # fastapi, uvicorn, scikit-learn, pandas, numpy
```

---

## 5. Backend (Express/TypeScript)

No auth, no Prisma, no DB changes. Focused changes only.

**New dependencies:** `helmet`, `express-rate-limit`, `zod`, `axios` (to call FastAPI)

### 5.1 Predict Route (updated)

- `POST /api/predict` — validates input with Zod, calls FastAPI `/predict`, returns `{ price }`
- Backend returns `{ price }` (fixes the `predictedPrice` mismatch)

### 5.2 New: Zod validation (replaces manual `validateFeatures.ts`)

```typescript
const PredictSchema = z.object({
  size:      z.number().min(20).max(500),
  cityCode:  z.number().int().positive(),
  rooms:     z.number().min(1).max(15),
  balconies: z.number().min(0).max(5),
  parking:   z.number().min(0).max(2),  // was capped at 1 — bug fixed
  year:      z.number().int().min(1948).max(2026),
});
```

### 5.3 New: ML service client

```typescript
// services/mlService.ts
// HTTP POST to ML_SERVICE_URL/predict via axios
// Returns { price: number }
// Throws typed error if ML service unreachable (→ 503 to client)
```

### 5.4 Infrastructure additions

- `helmet()` on all routes (security headers)
- `express-rate-limit`: 100 req/15min globally, 20 req/15min on `/api/predict`
- `GET /health` — returns `{ status: "ok", ml: "ok"|"unreachable" }`
- `ML_SERVICE_URL` from env (default `http://localhost:8000`)
- `PORT` from env (default `3000`)

### 5.5 Directory structure (final)

```
backend/src/
  app.ts
  predict/
    routes/predictRoute.ts
    controllers/predictController.ts   # calls mlService, returns { price }
    schemas/predictSchema.ts           # Zod schema
  services/
    mlService.ts                       # HTTP client for FastAPI
  (remove: utils/validateFeatures.ts, services/pythonML.ts)
```

---

## 6. Frontend

**New dependency:** `react-hot-toast` (replaces `alert()`)

### 6.1 Routes

```
/           → PredictForm (improved)
/history    → HistoryPage (new)
```

No protected routes — app is fully public.

### 6.2 PredictForm (updated)

- Real-time validation: error helper text per field (not a global "Please fill all required fields")
- `toast.error()` on API failure (replaces `alert()`)
- "View History" button/link in header
- Animated price result retained
- `VITE_API_URL` env var replaces hardcoded `localhost:3000`
- On successful prediction: save to localStorage (see 6.4)

### 6.3 HistoryPage (new)

- Reads from localStorage, newest first
- Shows: city name, rooms, size, price, date
- "No predictions yet" empty state
- "Clear history" button
- "Back to predictor" link

### 6.4 localStorage schema

```typescript
const STORAGE_KEY = 'yadata_history';
// Array of up to 20 items, newest first:
interface HistoryEntry {
  id: string;          // crypto.randomUUID()
  size: number;
  cityCode: number;
  cityName: string;
  rooms: number;
  balconies: number;
  parking: number;
  price: number;
  createdAt: string;   // ISO timestamp
}
```

When a new prediction comes in: prepend to array, trim to 20, write back to localStorage.

### 6.5 Type fixes

```typescript
// types/predict.ts
export interface PredictRequest {
  size: number;
  cityCode: number;
  rooms: number;
  year: number;
  parking: number;
  balconies: number;
}

export interface PredictResponse {
  price: number;    // was: broken method signature
}
```

### 6.6 Theme

Wire `theme.ts` into `ThemeProvider` in `main.tsx` (currently unused). Update palette to match teal/orange used in PredictForm.

### 6.7 Environment

```
frontend/.env.example
  VITE_API_URL=http://localhost:3000
```

---

## 7. Data Flow: Prediction

```
User submits form
  → Frontend POST /api/predict
  → Express: Zod validation → reject 400 if invalid
  → Express: mlService.ts POST to FastAPI /predict
  → FastAPI: predict, return { price }
  → Express: return { price } to frontend
  → Frontend: save to localStorage, animate price counter
```

---

## 8. Error Handling

| Layer | Error | Response |
|-------|-------|----------|
| Frontend | Network error | toast.error("Unable to reach server") |
| Frontend | 400 Validation | Inline field errors |
| Frontend | 500/503 | toast.error("Prediction failed. Try again.") |
| Backend | ML service down | 503 "Prediction service unavailable" |
| Backend | Validation fail | 400 with Zod error details |
| ML service | Invalid input | 422 from FastAPI |

---

## 9. Out of Scope

- Authentication / user accounts
- Database (Supabase or otherwise)
- Docker Compose
- Model retraining pipeline
- OAuth / social login
