import axios from "axios";
import { PredictRequest, PredictResponse } from "../types/predict";

const API_URL = "http://localhost:5000/api/predict";

export async function predictPrice(data: PredictRequest): Promise<PredictResponse> {
  const res = await axios.post(API_URL, data);
  return res.data;
}
