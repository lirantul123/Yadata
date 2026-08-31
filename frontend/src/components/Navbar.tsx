import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import HistoryIcon from "@mui/icons-material/History";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <AppBar position="fixed" elevation={0} sx={{ background: "linear-gradient(90deg,#00796b,#004d40)", backdropFilter: "blur(10px)" }}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box
          display="flex" alignItems="center" gap={1} sx={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          <HomeWorkIcon sx={{ fontSize: 28, color: "#fff" }} />
          <Typography variant="h6" fontWeight={800} sx={{ color: "#fff", letterSpacing: 1 }}>
            Yadata
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", ml: 0.5, display: { xs: "none", sm: "block" } }}>
            Israeli Property Prices
          </Typography>
        </Box>
        <Button
          startIcon={<HistoryIcon />}
          onClick={() => navigate(pathname === "/history" ? "/" : "/history")}
          sx={{
            color: "#fff",
            fontWeight: 600,
            borderRadius: 2,
            px: 2,
            background: pathname === "/history" ? "rgba(255,255,255,0.15)" : "transparent",
            "&:hover": { background: "rgba(255,255,255,0.15)" },
          }}
        >
          {pathname === "/history" ? "Predict" : "History"}
        </Button>
      </Toolbar>
    </AppBar>
  );
}
