import axios from "axios";
import type { PredictRequest, PredictResponse } from "../types/predict";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function predictPrice(data: PredictRequest): Promise<PredictResponse> {
  const res = await axios.post<PredictResponse>(`${BASE}/api/predict`, data);
  return res.data;
}
