import { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  MenuItem,
  Paper,
  CircularProgress,
} from "@mui/material";
import { predictPrice } from "../api/predictApi";
import { motion, useMotionValue, animate } from "framer-motion";
import HouseIcon from "@mui/icons-material/House";
import ApartmentIcon from "@mui/icons-material/Apartment";
import QuestionMark from "@mui/icons-material/QuestionMark";

function PredictForm() {
  const [form, setForm] = useState({
    size: "",
    location: "",
    rooms: "",
    age: "",
    parking: "",
  });
  
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const animatedPrice = useMotionValue(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setPrice(null);
    animatedPrice.set(0);

    try {
      const result = await predictPrice({
        size: Number(form.size),
        location: Number(form.location),
        rooms: Number(form.rooms),
        age: Number(form.age),
        parking: Number(form.parking),
      });
      animate(animatedPrice, result.price, {
        duration: 1.5,
        onUpdate: (val) => setPrice(Math.round(val)),
      });
    } catch {
      alert("Error predicting price. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Icon animations
  const iconVariants = {
    float: {
      y: [0, -20, 0],
      rotate: [0, 10, -10, 0],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #d0e8f2, #f0f7f4)",
        position: "relative",
        overflow: "hidden",
        py: 8,
      }}
    >
      {/* Fun background shapes */}
      <Box
        sx={{
          position: "absolute",
          width: "200%",
          height: "200%",
          top: "-50%",
          left: "-50%",
          background:
            "radial-gradient(circle at 20% 20%, rgba(255,200,0,0.15), transparent 60%), radial-gradient(circle at 80% 80%, rgba(0,150,200,0.15), transparent 60%)",
          zIndex: 0,
          pointerEvents: "none",
          animation: "rotate 60s linear infinite",
        }}
      />
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Paper
          sx={{
            p: 6,
            borderRadius: 6,
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.1)",
          }}
        >
          {/* Header */}
          <Box textAlign="center" mb={4} position="relative">
            {/* House Icon */}
            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ position: "absolute", left: -40, top: -20 }}
            >
              <HouseIcon sx={{ fontSize: 60, color: "#ff8a65" }} />
            </motion.div>

            {/* Apartment Icon */}
            <motion.div
              animate={{
                y: [0, -25, 0],
                rotate: [0, -10, 10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ position: "absolute", right: -40, top: -20 }}
            >
              <ApartmentIcon sx={{ fontSize: 60, color: "#4db6ac" }} />
            </motion.div>

            {/* Question Mark Icon */}
            <motion.div
              animate={{
                y: [0, -30, 0],
                rotate: [0, 15, -15, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ position: "absolute", left: "40%", top: -40 }}
            >
              <QuestionMark sx={{ fontSize: 60, color: "#ffb74d" }} />
            </motion.div>

            <Typography
              variant="h4"
              gutterBottom
              sx={{ fontWeight: 700, color: "#00796b" }}
            >
              Predict House / Apartment Price
            </Typography>
            <Typography variant="body1" sx={{ fontStyle: "italic", color: "#555" }}>
              Enter the details below for a fun instant estimate
            </Typography>
          </Box>

          {/* Form Fields */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Size (m²)"
              name="size"
              type="number"
              value={form.size}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Location"
              name="location"
              select
              value={form.location}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value={1}>Suburbs</MenuItem>
              <MenuItem value={2}>City Center</MenuItem>
            </TextField>
            <TextField
              label="Rooms"
              name="rooms"
              type="number"
              value={form.rooms}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Age (years)"
              name="age"
              type="number"
              value={form.age}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Parking"
              name="parking"
              select
              value={form.parking}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value={1}>Yes</MenuItem>
              <MenuItem value={0}>No</MenuItem>
            </TextField>
          </Box>

          {/* Submit Button */}
          <Box textAlign="center" mt={4}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading}
              sx={{
                px: 6,
                py: 1.5,
                fontWeight: 600,
                fontSize: 16,
                color: "#fff",
                background: "linear-gradient(90deg, #26a69a 0%, #00796b 100%)",
                "&:hover": {
                  background: "linear-gradient(90deg, #009688 0%, #004d40 100%)",
                  transform: "scale(1.05)",
                },
                transition: "all 0.3s ease",
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Predict Price"}
            </Button>
          </Box>

          {/* Price Output */}
          {price !== null && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              <Box
                mt={5}
                p={4}
                textAlign="center"
                sx={{
                  background: "linear-gradient(135deg, #ff8a65, #ffb74d)",
                  borderRadius: 3,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                }}
              >
                <Typography variant="h6" sx={{ color: "#fff", letterSpacing: 1 }}>
                  Estimated Price
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    letterSpacing: 1.5,
                  }}
                >
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

export default PredictForm;
