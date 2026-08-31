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
