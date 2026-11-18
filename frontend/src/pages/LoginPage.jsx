import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import WalletIcon from "@mui/icons-material/Wallet";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { colors, brandFont } from "../theme";
import { Divider } from "@mui/material";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import GoogleIcon from "../components/GoogleIcon";
import { useLogin } from "../api/auth.api";

const handleGoogleLogin = () => {
  console.log("Google login clicked");
};

const handleBiometricLogin = () => {
  console.log("Biometric login clicked");
};

function BrandPanel() {
  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        position: "relative",
        overflow: "hidden",
        bgcolor: colors.purple,
        color: colors.cream,
        p: 8,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          bgcolor: colors.lavender,
          opacity: 0.35,
          top: -140,
          right: -120,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          bgcolor: colors.sand,
          opacity: 0.12,
          bottom: -100,
          left: -80,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: `2px solid ${colors.lavender}`,
          opacity: 0.6,
          bottom: 160,
          right: 80,
        }}
      />

      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <WalletIcon fontSize="large" />
        <Typography variant="h5" fontWeight={700}>
          EkPocket
        </Typography>
      </Box>

      <Box sx={{ position: "relative", maxWidth: 440 }}>
        <Typography
          variant="h2"
          fontWeight={700}
          sx={{
            letterSpacing: "-0.02em",
            mb: 2,
            fontFamily: brandFont,
          }}
        >
          Everything you need, in one pocket.
        </Typography>
        <Typography sx={{ opacity: 0.8, fontSize: "1rem" }}>
          Sign in to pick up right where you left off.
        </Typography>
      </Box>
    </Box>
  );
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = useLogin();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }
    login.mutate(form, {
      onSuccess: (data) => {
        console.log(data);
      },
      onError: (error) => {
        setError(error.message);
      },
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
      }}
    >
      <BrandPanel />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, sm: 6 },
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ width: "100%", maxWidth: 400 }}
        >
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              alignItems: "center",
              gap: 1,
              mb: 4,
              color: colors.purple,
            }}
          >
            <WalletIcon />
            <Typography variant="h6" fontWeight={700}>
              EkPocket
            </Typography>
          </Box>

          <Typography variant="h3" gutterBottom>
            Welcome back
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Enter your details to sign in to your account.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              placeholder="Email address"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              autoFocus
              slotProps={{
                htmlInput: { "aria-label": "Email address" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined sx={{ color: colors.lavender }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              placeholder="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              slotProps={{
                htmlInput: { "aria-label": "Password" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: colors.lavender }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box sx={{ textAlign: "right", mt: -1 }}>
              <Link
                href="/forgot-password/"
                underline="hover"
                variant="body2"
                fontWeight={500}
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              startIcon={
                loading && <CircularProgress size={18} color="inherit" />
              }
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <Divider
              sx={{ color: "text.secondary", fontSize: "0.85rem", my: 0.5 }}
            >
              or continue with
            </Divider>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                disabled={loading}
                onClick={handleGoogleLogin}
                startIcon={<GoogleIcon />}
              >
                Google
              </Button>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                disabled={loading}
                onClick={handleBiometricLogin}
                startIcon={<FingerprintIcon sx={{ color: colors.purple }} />}
              >
                Biometric
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
