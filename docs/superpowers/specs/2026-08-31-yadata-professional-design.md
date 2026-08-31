# Yadata — Professional Upgrade Design

**Date:** 2026-08-31  
**Goal:** Production-ready Israeli real estate price prediction app with auth, history, and fast ML

---

## 1. Overview

Yadata predicts apartment/house prices in Israel. The upgrade introduces:
- A persistent FastAPI ML microservice (replaces per-request Python spawn)
- JWT-based authentication (register/login)
- Prediction history stored in Supabase (PostgreSQL via Prisma)
- Frontend pages for auth and history
- Bug fixes that currently break the core prediction flow

---

## 2. Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  React Frontend  │────▶│  Express Backend      │────▶│  FastAPI ML      │
│  (Vite, MUI)    │     │  (TypeScript, Prisma) │     │  (Python 3.11)   │
│  :5173          │     │  :3000                │     │  :8000           │
└─────────────────┘     └──────────────────────┘     └──────────────────┘
                                    │
                                    ▼
                         ┌──────────────────┐
                         │  Supabase        │
                         │  (PostgreSQL)    │
                         └──────────────────┘
```

All three services run independently; the backend is the single entry point for the frontend.

---

## 3. Bug Fixes (Critical)

These bugs make the current app non-functional:

| Bug | Location | Fix |
|-----|----------|-----|
| Backend returns `{ predictedPrice }`, frontend reads `.price` | `predictController.ts`, `predictApi.ts` | Normalize to `{ price }` everywhere |
| `PredictResponse` has a phantom method signature | `frontend/src/types/predict.ts` | Replace with `{ price: number }` |
| `size` sent from frontend but not used in ML model | `backend/python/model.py` | Include size in feature vector |
| Validation rejects parking=2, form allows 0/1/2 | `validateFeatures.ts` | Allow 0, 1, 2 |
| Python process spawned per request (~2-3s latency) | `pythonML.ts` | Remove; call FastAPI instead |

---

## 4. FastAPI ML Service

**Location:** `ml/` (new directory)

**Startup behavior:** Trains LinearRegression on `real_estate.csv` once at startup (uses ML_Practice logic: log-transform on price, city multipliers, size in feature vector). Model stays in memory for the process lifetime.

**Endpoints:**
- `POST /predict` — accepts `{ cityCode, rooms, size, parking, balconies, year }`, returns `{ price: float }`
- `GET /health` — returns `{ status: "ok" }`

**ML logic (from ML_Practice/main.py):**
- Features: `[cityCode, year, rooms, size, parking, balconies]`
- Target: `log(price)` — reverse with `exp()` on prediction
- Post-prediction multipliers: city factor (per CITY_MAP), luxury factor for size > 160m², extra factor for parking/balconies

**Files:**
```
ml/
  main.py          # FastAPI app
  model.py         # Training + prediction logic
  requirements.txt # fastapi, uvicorn, scikit-learn, pandas
```

---

## 5. Backend

**New dependencies:** `prisma`, `@prisma/client`, `bcrypt`, `jsonwebtoken`, `helmet`, `express-rate-limit`, `zod`

### 5.1 Auth Routes (`/api/auth`)

- `POST /api/auth/register` — `{ email, password }` → creates user, returns JWT
- `POST /api/auth/login` — `{ email, password }` → verifies, returns JWT

JWT payload: `{ userId, email }`. Tokens expire in 7 days. Secret from `JWT_SECRET` env var.

### 5.2 Predict Route (`/api/predict`)

- `POST /api/predict` — authenticated — calls FastAPI ML service, saves prediction to DB, returns `{ price }`
- Request body validated with Zod (replaces current manual validation)

### 5.3 History Route (`/api/history`)

- `GET /api/history` — authenticated — returns user's last 50 predictions, newest first
- Each record: `{ id, size, cityCode, rooms, balconies, parking, price, createdAt }`

### 5.4 Infrastructure

- `helmet()` on all routes
- `express-rate-limit`: 100 requests/15min globally, 10 requests/15min on `/api/predict`
- `GET /health` — unauthenticated — returns `{ status: "ok", db: "ok" }`
- `ML_SERVICE_URL` env var (default `http://localhost:8000`)
- `DATABASE_URL` env var (Supabase connection string)
- `JWT_SECRET` env var

### 5.5 Database Schema (Prisma)

```prisma
model User {
  id           String       @id @default(cuid())
  email        String       @unique
  passwordHash String
  createdAt    DateTime     @default(now())
  predictions  Prediction[]
}

model Prediction {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  size      Int
  cityCode  Int
  rooms     Int
  balconies Int
  parking   Int
  price     Float
  createdAt DateTime @default(now())
}
```

### 5.6 Directory Structure

```
backend/src/
  app.ts
  middleware/
    auth.ts          # JWT verify middleware
  auth/
    routes/authRoute.ts
    controllers/authController.ts
  predict/
    routes/predictRoute.ts
    controllers/predictController.ts   # calls FastAPI, saves to DB
    models/predictModel.ts
  history/
    routes/historyRoute.ts
    controllers/historyController.ts
  utils/
    validateFeatures.ts  # replaced by Zod schemas
  services/
    mlService.ts         # HTTP calls to FastAPI (replaces pythonML.ts)
  prisma/
    schema.prisma
```

---

## 6. Frontend

**New dependencies:** `react-router-dom` (already installed), `react-hot-toast` (replaces `alert()`), `@tanstack/react-query` (server state)

### 6.1 Routes

```
/login      → LoginPage (public)
/register   → RegisterPage (public)
/           → PredictForm (protected — redirect to /login if no token)
/history    → HistoryPage (protected)
```

React Router v6 with a `ProtectedRoute` wrapper that reads JWT from `localStorage`.

### 6.2 Auth Pages

- `LoginPage`: email + password fields, submit → call `POST /api/auth/login`, store JWT in localStorage, redirect to `/`
- `RegisterPage`: same fields + confirm password, call `POST /api/auth/register`
- Both show inline field errors and toast on server error

### 6.3 PredictForm (improved)

- All existing fields retained (size, city, rooms, balconies, parking)
- Real-time validation: show error helper text per field (not a global message)
- Toast on API error (replaces `alert()`)
- Logout button in header
- Animated price result retained

### 6.4 HistoryPage

- Table of past predictions (size, city name, rooms, price, date)
- Newest first, paginated 20 per page
- "No predictions yet" empty state
- Click row → repopulate form on `/` (optional nice-to-have)

### 6.5 Environment

```
frontend/.env.example:
  VITE_API_URL=http://localhost:3000
```

`predictApi.ts` uses `import.meta.env.VITE_API_URL` (no hardcoded localhost).

### 6.6 Theme

Apply `theme.ts` to `ThemeProvider` in `main.tsx` (currently unused). Update palette to match teal/orange design already in PredictForm.

---

## 7. Data Flow: Prediction

```
User submits form
  → Frontend POST /api/predict (with Authorization: Bearer <jwt>)
  → Express auth middleware verifies JWT
  → predictController calls FastAPI POST /predict
  → FastAPI returns { price }
  → predictController saves Prediction to Supabase
  → Returns { price } to frontend
  → Frontend animates price counter
```

---

## 8. Error Handling

| Layer | Error | Response |
|-------|-------|----------|
| Frontend | Network error | Toast "Unable to reach server" |
| Frontend | 401 Unauthorized | Redirect to /login |
| Frontend | 400 Validation | Inline field errors |
| Backend | ML service down | 503 with "Prediction service unavailable" |
| Backend | DB error | 500 with generic message (logged) |
| ML service | Invalid input | 422 from FastAPI |

---

## 9. Testing (Minimal, Production-Intent)

- Backend: `jest` + `supertest` for auth routes and predict route
- ML service: one smoke test confirming `/predict` returns a number
- Frontend: no automated tests (manual verify via dev server)

---

## 10. Environment Variables

| Service | Variable | Purpose |
|---------|----------|---------|
| Backend | `DATABASE_URL` | Supabase connection string |
| Backend | `JWT_SECRET` | Token signing secret (min 32 chars) |
| Backend | `ML_SERVICE_URL` | FastAPI base URL (default: http://localhost:8000) |
| Backend | `PORT` | Server port (default: 3000) |
| Frontend | `VITE_API_URL` | Backend base URL (default: http://localhost:3000) |

---

## 11. Out of Scope

- Docker Compose (can add later)
- OAuth / social login
- Admin dashboard
- Real-time price updates
- Email verification
- Model retraining pipeline
