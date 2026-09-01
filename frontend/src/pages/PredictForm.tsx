import { useState } from "react";
import {
  Box, Button, Container, TextField, Typography, Paper,
  Autocomplete, ToggleButton, ToggleButtonGroup,
  Slider, Chip, Divider, Tooltip,
} from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BalconyIcon from "@mui/icons-material/Balcony";
import SquareFootIcon from "@mui/icons-material/SquareFoot";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import BedroomParentIcon from "@mui/icons-material/BedroomParent";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { motion, useMotionValue, animate } from "framer-motion";
import toast from "react-hot-toast";
import { predictPrice } from "../utils/priceModel";
import { addHistoryEntry } from "../utils/history";
import { CITY_MAP } from "../../utils/cities";

const CITIES = Object.entries(CITY_MAP)
  .map(([name, code]) => ({ name, code }))
  .sort((a, b) => a.name.localeCompare(b.name));

const CITY_NAME_BY_CODE: Record<number, string> = Object.fromEntries(
  CITIES.map(({ name, code }) => [code, name])
);

const ROOM_OPTIONS = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "6+"];

const fmt = (n: number) =>
  n >= 1_000_000
    ? `₪${(n / 1_000_000).toFixed(2)}M`
    : `₪${Math.round(n).toLocaleString()}`;

export default function PredictForm() {
  const [city, setCity] = useState<{ name: string; code: number } | null>(null);
  const [rooms, setRooms] = useState<string>("");
  const [size, setSize] = useState<number>(80);
  const [balconies, setBalconies] = useState<number>(0);
  const [parking, setParking] = useState<number>(0);

  const [price, setPrice] = useState<number | null>(null);

  const animatedPrice = useMotionValue(0);

  const isReady = !!city && !!rooms;

  const handleSubmit = () => {
    if (!isReady) return;
    setPrice(null);
    animatedPrice.set(0);

    const roomNum = rooms === "6+" ? 6 : Number(rooms);

    try {
      const price = predictPrice({
        cityCode: city!.code,
        rooms: roomNum,
        size,
        parking,
        balconies,
      });

      addHistoryEntry({
        size,
        cityCode: city!.code,
        cityName: CITY_NAME_BY_CODE[city!.code] ?? city!.name,
        rooms: roomNum,
        balconies,
        parking,
        price,
      });

      animate(animatedPrice, price, {
        duration: 1.5,
        onUpdate: (val) => setPrice(Math.round(val)),
      });
    } catch {
      toast.error("Prediction failed. Please try again.");
    } finally {
    }
  };

  const low = price ? Math.round(price * 0.88) : null;
  const high = price ? Math.round(price * 1.12) : null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        pt: "64px",
        background: "linear-gradient(160deg,#e8f5f3 0%,#f5f9ff 50%,#fff8f5 100%)",
        display: "flex",
        alignItems: { xs: "flex-start", md: "center" },
        justifyContent: "center",
        py: { xs: 3, md: 6 },
      }}
    >
      <Container maxWidth="sm">
        {/* Hero text */}
        <Box textAlign="center" mb={3}>
          <Typography variant="h4" fontWeight={800} sx={{ color: "#004d40", lineHeight: 1.2 }}>
            How much is your property worth?
          </Typography>
          <Typography variant="body1" sx={{ color: "#546e7a", mt: 1 }}>
            Instant estimate based on Israeli market data
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 5,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 20px 60px rgba(0,121,107,0.08)",
          }}
        >
          {/* City */}
          <Box mb={3}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <LocationCityIcon sx={{ fontSize: 18, color: "#00796b" }} />
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                CITY
              </Typography>
            </Box>
            <Autocomplete
              options={CITIES}
              getOptionLabel={(o) => o.name}
              value={city}
              onChange={(_, v) => setCity(v)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search city..."
                  size="medium"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                />
              )}
              isOptionEqualToValue={(a, b) => a.code === b.code}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Rooms */}
          <Box mb={3}>
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
              <BedroomParentIcon sx={{ fontSize: 18, color: "#00796b" }} />
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                ROOMS
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={rooms}
              exclusive
              onChange={(_, v) => v && setRooms(v)}
              sx={{ flexWrap: "wrap", gap: 0.5 }}
            >
              {ROOM_OPTIONS.map((r) => (
                <ToggleButton
                  key={r}
                  value={r}
                  sx={{
                    borderRadius: "10px !important",
                    border: "1px solid rgba(0,0,0,0.12) !important",
                    fontWeight: 600,
                    minWidth: 52,
                    "&.Mui-selected": {
                      background: "#00796b",
                      color: "#fff",
                      "&:hover": { background: "#005a4f" },
                    },
                  }}
                >
                  {r}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Size */}
          <Box mb={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <SquareFootIcon sx={{ fontSize: 18, color: "#00796b" }} />
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                  SIZE
                </Typography>
              </Box>
              <Chip
                label={`${size} m²`}
                size="small"
                sx={{ fontWeight: 700, background: "#e8f5f3", color: "#00796b" }}
              />
            </Box>
            <Slider
              value={size}
              min={20}
              max={400}
              step={5}
              onChange={(_, v) => setSize(v as number)}
              sx={{
                color: "#00796b",
                "& .MuiSlider-thumb": { width: 20, height: 20 },
                "& .MuiSlider-track": { height: 6 },
                "& .MuiSlider-rail": { height: 6 },
              }}
            />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">20 m²</Typography>
              <Typography variant="caption" color="text.secondary">400 m²</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Parking + Balconies */}
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3} mb={4}>
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <DirectionsCarIcon sx={{ fontSize: 18, color: "#00796b" }} />
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                  PARKING
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={parking}
                exclusive
                onChange={(_, v) => v !== null && setParking(v)}
              >
                {[0, 1, 2].map((n) => (
                  <ToggleButton
                    key={n}
                    value={n}
                    sx={{
                      fontWeight: 600,
                      "&.Mui-selected": { background: "#00796b", color: "#fff", "&:hover": { background: "#005a4f" } },
                    }}
                  >
                    {n}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <BalconyIcon sx={{ fontSize: 18, color: "#00796b" }} />
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                  BALCONIES
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={balconies}
                exclusive
                onChange={(_, v) => v !== null && setBalconies(v)}
              >
                {[0, 1, 2, 3].map((n) => (
                  <ToggleButton
                    key={n}
                    value={n}
                    sx={{
                      fontWeight: 600,
                      "&.Mui-selected": { background: "#00796b", color: "#fff", "&:hover": { background: "#005a4f" } },
                    }}
                  >
                    {n}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Submit */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={!isReady}
            sx={{
              py: 1.8,
              fontSize: 17,
              fontWeight: 700,
              borderRadius: 3,
              background: isReady ? "linear-gradient(135deg,#26a69a,#00796b)" : undefined,
              boxShadow: isReady ? "0 8px 24px rgba(0,121,107,0.35)" : "none",
              "&:hover": { background: "linear-gradient(135deg,#00897b,#004d40)", transform: "translateY(-1px)", boxShadow: "0 12px 28px rgba(0,121,107,0.4)" },
              transition: "all 0.25s ease",
            }}
          >
            Get Price Estimate
          </Button>

          {!isReady && (
            <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 1, color: "text.disabled" }}>
              Select a city and number of rooms to continue
            </Typography>
          )}
        </Paper>

        {/* Result */}
        {price !== null && low !== null && high !== null && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: { xs: 3, sm: 4 },
                borderRadius: 5,
                background: "linear-gradient(135deg,#00796b,#004d40)",
                boxShadow: "0 20px 50px rgba(0,121,107,0.3)",
                textAlign: "center",
              }}
            >
              <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)", letterSpacing: 2 }}>
                Estimated Market Value
              </Typography>
              <Typography
                variant="h2"
                sx={{ color: "#fff", fontWeight: 800, my: 1, fontFeatureSettings: '"tnum"' }}
              >
                {fmt(price)}
              </Typography>
              <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={2}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                  Range: {fmt(low)} – {fmt(high)}
                </Typography>
                <Tooltip title="Estimated ±12% confidence interval based on market variation">
                  <InfoOutlinedIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.5)", cursor: "help" }} />
                </Tooltip>
              </Box>
              <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
                {city && <Chip label={city.name} size="small" sx={{ background: "rgba(255,255,255,0.15)", color: "#fff" }} />}
                <Chip label={`${rooms} rooms`} size="small" sx={{ background: "rgba(255,255,255,0.15)", color: "#fff" }} />
                <Chip label={`${size} m²`} size="small" sx={{ background: "rgba(255,255,255,0.15)", color: "#fff" }} />
              </Box>
            </Paper>
          </motion.div>
        )}
      </Container>
    </Box>
  );
}
