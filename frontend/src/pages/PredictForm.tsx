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
