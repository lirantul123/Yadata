import {
  Box, Button, Container, Typography, Paper,
  Chip, IconButton, Tooltip,
} from "@mui/material";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BalconyIcon from "@mui/icons-material/Balcony";
import { useState } from "react";
import { motion } from "framer-motion";
import { getHistory, clearHistory } from "../utils/history";
import { useNavigate } from "react-router-dom";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `₪${(n / 1_000_000).toFixed(2)}M`
    : `₪${Math.round(n).toLocaleString()}`;

export default function HistoryPage() {
  const [entries, setEntries] = useState(() => getHistory());
  const navigate = useNavigate();

  const handleClear = () => {
    clearHistory();
    setEntries([]);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        pt: "64px",
        background: "linear-gradient(160deg,#e8f5f3 0%,#f5f9ff 50%,#fff8f5 100%)",
        py: { xs: 3, md: 6 },
      }}
    >
      <Container maxWidth="md">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight={800} color="#004d40">
              Your Estimates
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {entries.length > 0 ? `${entries.length} saved prediction${entries.length > 1 ? "s" : ""}` : "No predictions yet"}
            </Typography>
          </Box>
          {entries.length > 0 && (
            <Tooltip title="Clear all history">
              <IconButton onClick={handleClear} color="error" sx={{ border: "1px solid", borderColor: "error.light" }}>
                <DeleteSweepIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {entries.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 8, textAlign: "center", borderRadius: 5,
              border: "2px dashed rgba(0,121,107,0.2)",
              background: "rgba(255,255,255,0.7)",
            }}
          >
            <HomeWorkIcon sx={{ fontSize: 64, color: "rgba(0,121,107,0.2)", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              No predictions yet
            </Typography>
            <Typography variant="body2" color="text.disabled" mt={1} mb={3}>
              Go back and estimate your first property
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate("/")}
              sx={{ borderRadius: 3, background: "linear-gradient(135deg,#26a69a,#00796b)" }}
            >
              Predict a Property
            </Button>
          </Paper>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {entries.map((e, i) => (
              <Box key={e.id}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3, borderRadius: 4,
                      border: "1px solid rgba(0,0,0,0.06)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                      transition: "box-shadow 0.2s",
                      "&:hover": { boxShadow: "0 8px 30px rgba(0,121,107,0.12)" },
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Box>
                        <Typography variant="h6" fontWeight={800} color="#004d40">
                          {e.cityName}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {new Date(e.createdAt).toLocaleDateString("en-IL", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="h6" fontWeight={800} sx={{ color: "#00796b" }}>
                          {fmt(e.price)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box display="flex" gap={0.75} flexWrap="wrap">
                      <Chip
                        label={`${e.rooms} rooms`}
                        size="small"
                        sx={{ background: "#e8f5f3", color: "#00796b", fontWeight: 600 }}
                      />
                      <Chip
                        label={`${e.size} m²`}
                        size="small"
                        sx={{ background: "#e8f5f3", color: "#00796b", fontWeight: 600 }}
                      />
                      {e.parking > 0 && (
                        <Chip
                          icon={<DirectionsCarIcon sx={{ fontSize: "14px !important" }} />}
                          label={e.parking}
                          size="small"
                          sx={{ background: "#f5f5f5", fontWeight: 600 }}
                        />
                      )}
                      {e.balconies > 0 && (
                        <Chip
                          icon={<BalconyIcon sx={{ fontSize: "14px !important" }} />}
                          label={e.balconies}
                          size="small"
                          sx={{ background: "#f5f5f5", fontWeight: 600 }}
                        />
                      )}
                    </Box>
                  </Paper>
                </motion.div>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
