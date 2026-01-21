import React, { useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Container, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";

const SignIn = () => {
  const { saveAuth, isAuthed } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const triggerGooglePrompt = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      setError("");
    } else {
      setError("Google sign-in is still loading. Please try again in a moment.");
    }
  };

  useEffect(() => {
    if (isAuthed) {
      navigate("/board", { replace: true });
    }
  }, [isAuthed, navigate]);

  useEffect(() => {
    const existing = document.getElementById("google-identity-script");
    if (existing) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "google-identity-script";
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Failed to load Google sign-in. Check your network.");
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !window.google || !buttonRef.current) return;
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Missing REACT_APP_GOOGLE_CLIENT_ID");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 280,
      shape: "pill"
    });
  }, [scriptLoaded]);

  const handleCredentialResponse = async (response) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/google", {
        credential: response.credential
      });
      saveAuth(data.token, data.user);
      navigate("/board", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a, #111827)"
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            background: "linear-gradient(180deg, #0b1222 0%, #0e192d 60%, #0b1222 100%)",
            color: "#e5e7eb",
            border: "1px solid rgba(255,255,255,0.06)"
          }}
        >
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Productivity Hub
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: "#cbd5e1" }}>
            Sign in with Google to keep your tasks, lists, and goals synced to your account.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              ref={buttonRef}
              sx={{ display: "flex", justifyContent: "center", minHeight: 48 }}
            />

            {loading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#cbd5e1" }}>
                <CircularProgress size={18} sx={{ color: "#cbd5e1" }} />
                <Typography variant="body2">Signing you in...</Typography>
              </Box>
            )}

            {error && (
              <Typography variant="body2" color="#fca5a5">
                {error}
              </Typography>
            )}

            <Button
              variant="text"
              onClick={() => window.open("https://calendar.google.com", "_blank")}
              sx={{ color: "#a5b4fc", textTransform: "none", alignSelf: "flex-start" }}
            >
              Coming soon: sync tasks to Google Calendar
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SignIn;
