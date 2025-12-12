import axios from "axios";
import type { PredictRequest, PredictResponse } from "../types/predict";

const API_URL = "http://localhost:3000/api/predict";

export async function predictPrice(data: PredictRequest): Promise<PredictResponse> {
  const res = await axios.post(API_URL, data);
  return res.data;
}
