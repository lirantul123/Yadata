import type { MotionValue } from "framer-motion";

export interface PredictRequest {
  size: number;
  cityCode: number; 
  rooms: number;
  year: number;
  parking?: number;
  balconies?: number;
}

export interface PredictResponse {
  predictedPrice(animatedPrice: MotionValue<number>, predictedPrice: any, arg2: { duration: number; onUpdate: (val: any) => void; }): unknown;
  price: number;
}
