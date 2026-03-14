import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography
} from "@mui/material";
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
  const [info, setInfo] = useState("");

  const handleCredentialResponse = useCallback(async (response) => {
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
  }, [navigate, saveAuth]);

  useEffect(() => {
    if (isAuthed) {
      navigate("/board", { replace: true });
    }
  }, [isAuthed, navigate]);

  useEffect(() => {
    const expired = sessionStorage.getItem("authExpired");
    if (expired) {
      setInfo("Your session expired. Please sign in again.");
      sessionStorage.removeItem("authExpired");
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const handleLoad = () => {
      if (isActive) setScriptLoaded(true);
    };
    const handleError = () => {
      if (isActive) setError("Failed to load Google sign-in. Check your network.");
    };

    const existing = document.getElementById("google-identity-script");
    if (!existing) {
      handleError();
      return () => {
        isActive = false;
      };
    }

    if (window.google?.accounts?.id) {
      handleLoad();
    } else {
      existing.addEventListener("load", handleLoad);
      existing.addEventListener("error", handleError);
    }

    return () => {
      isActive = false;
      existing.removeEventListener("load", handleLoad);
      existing.removeEventListener("error", handleError);
    };
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
  }, [scriptLoaded, handleCredentialResponse]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "background.default",
        px: 2,
        py: { xs: 6, sm: 8 }
      }}
    >
      <Container maxWidth="sm">
        <Paper
          variant="outlined"
          sx={(theme) => ({
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            backgroundColor: "background.paper",
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 28px 60px rgba(0, 0, 0, 0.45)"
                : "0 28px 60px rgba(80, 52, 36, 0.14)",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
            }
          })}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                Welcome back
              </Typography>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Productivity Hub
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in with Google to keep your tasks, lists, and goals synced to your
                account.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                ref={buttonRef}
                sx={{ display: "flex", justifyContent: "center", minHeight: 48 }}
              />

              {loading && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={18} color="inherit" />
                  <Typography variant="body2" color="text.secondary">
                    Signing you in...
                  </Typography>
                </Box>
              )}

              {info && (
                <Typography variant="body2" color="secondary.main">
                  {info}
                </Typography>
              )}

              {error && (
                <Typography variant="body2" color="error.main">
                  {error}
                </Typography>
              )}

              <Button
                variant="text"
                color="secondary"
                onClick={() => window.open("https://calendar.google.com", "_blank")}
                sx={{ alignSelf: "flex-start" }}
              >
                Coming soon: sync tasks to Google Calendar
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default SignIn;
