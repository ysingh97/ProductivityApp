import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Typography
} from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import {
  disconnectGoogleCalendar,
  fetchGoogleCalendarConnectUrl,
  fetchGoogleCalendarStatus,
  fetchGoogleCalendars,
  saveGoogleCalendarSettings,
  syncGoogleCalendarNow
} from "../features/integrations/googleCalendarService";

const formatDateTime = (value) => {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
};

const GoogleCalendarSettings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const calendarOptions = useMemo(
    () =>
      calendars.map((calendar) => ({
        value: calendar.id,
        label: calendar.primary ? `${calendar.summary} (Primary)` : calendar.summary
      })),
    [calendars]
  );

  const loadStatus = async () => {
    setLoadingStatus(true);
    setError("");
    try {
      const nextStatus = await fetchGoogleCalendarStatus();
      setStatus(nextStatus);
      setSelectedCalendarId(nextStatus.selectedCalendarId || "");
      setSyncEnabled(nextStatus.syncEnabled ?? true);
      return nextStatus;
    } catch (err) {
      console.error(err);
      setError("Unable to load Google Calendar connection status.");
      return null;
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadCalendars = async () => {
    setLoadingCalendars(true);
    try {
      const nextCalendars = await fetchGoogleCalendars();
      setCalendars(nextCalendars);
    } catch (err) {
      console.error(err);
      setError("Unable to load available Google calendars.");
    } finally {
      setLoadingCalendars(false);
    }
  };

  useEffect(() => {
    const callbackState = searchParams.get("googleCalendar");
    if (callbackState === "connected") {
      setFeedback("Google Calendar connected. Choose a calendar and save your sync settings.");
      navigate("/settings/google-calendar", { replace: true });
    } else if (callbackState === "error") {
      setError("Google Calendar connection failed. Please try again.");
      navigate("/settings/google-calendar", { replace: true });
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    let isActive = true;

    const loadPage = async () => {
      const nextStatus = await loadStatus();
      if (!isActive || !nextStatus?.connected) {
        return;
      }
      await loadCalendars();
    };

    loadPage();
    return () => {
      isActive = false;
    };
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    try {
      const { url } = await fetchGoogleCalendarConnectUrl();
      window.location.assign(url);
    } catch (err) {
      console.error(err);
      setError("Unable to start the Google Calendar connection flow.");
      setConnecting(false);
    }
  };

  const handleSave = async () => {
    const selectedCalendar = calendarOptions.find(
      (calendar) => calendar.value === selectedCalendarId
    );

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const nextStatus = await saveGoogleCalendarSettings({
        selectedCalendarId,
        selectedCalendarSummary: selectedCalendar?.label || selectedCalendarId,
        syncEnabled
      });
      setStatus((prev) => ({ ...prev, ...nextStatus }));
      setFeedback("Google Calendar settings saved. A full resync has been queued.");
    } catch (err) {
      console.error(err);
      setError("Unable to save Google Calendar settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncingNow(true);
    setError("");
    setFeedback("");
    try {
      await syncGoogleCalendarNow();
      setFeedback("Google Calendar sync queued.");
      await loadStatus();
    } catch (err) {
      console.error(err);
      setError("Unable to queue a Google Calendar sync.");
    } finally {
      setSyncingNow(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError("");
    setFeedback("");
    try {
      await disconnectGoogleCalendar();
      setStatus({ connected: false });
      setCalendars([]);
      setSelectedCalendarId("");
      setSyncEnabled(true);
      setFeedback("Google Calendar disconnected.");
    } catch (err) {
      console.error(err);
      setError("Unable to disconnect Google Calendar.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, textAlign: "left" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Google Calendar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect one Google calendar and keep dated goals and tasks synced from the app.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {feedback && <Alert severity="success">{feedback}</Alert>}

        {loadingStatus ? (
          <Paper
            variant="outlined"
            sx={{ p: 4, borderRadius: 4, display: "flex", justifyContent: "center" }}
          >
            <Stack spacing={1.5} sx={{ alignItems: "center" }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Loading Google Calendar settings
              </Typography>
            </Stack>
          </Paper>
        ) : !status?.connected ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Connect Google Calendar
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This sets up one-way sync from the app into a single Google calendar.
                  Changes made in Google Calendar will not flow back into the app.
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="contained"
                  startIcon={<LinkOutlinedIcon />}
                  onClick={handleConnect}
                  disabled={connecting}
                >
                  {connecting ? "Redirecting..." : "Connect Google Calendar"}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1.35fr 0.9fr" },
              gap: 3
            }}
          >
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: { xs: "flex-start", sm: "center" },
                      justifyContent: "space-between",
                      gap: 2,
                      flexDirection: { xs: "column", sm: "row" }
                    }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Connection
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Connected as {status.googleEmail}
                      </Typography>
                    </Box>
                    <Chip
                      color={status.syncEnabled ? "success" : "default"}
                      label={status.syncEnabled ? "Sync enabled" : "Sync paused"}
                      variant={status.syncEnabled ? "filled" : "outlined"}
                    />
                  </Box>
                  <Divider />
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                      gap: 2
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Selected calendar
                      </Typography>
                      <Typography>
                        {status.selectedCalendarSummary || "No calendar selected yet"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Last sync
                      </Typography>
                      <Typography>{formatDateTime(status.lastSyncAt)}</Typography>
                    </Box>
                  </Box>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Sync settings
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Choose the destination calendar and whether background sync is active.
                    </Typography>
                  </Box>

                  <FormControl fullWidth size="small" disabled={loadingCalendars || saving}>
                    <InputLabel id="google-calendar-select-label">Destination calendar</InputLabel>
                    <Select
                      labelId="google-calendar-select-label"
                      value={selectedCalendarId}
                      label="Destination calendar"
                      onChange={(event) => setSelectedCalendarId(event.target.value)}
                    >
                      {calendarOptions.map((calendar) => (
                        <MenuItem key={calendar.value} value={calendar.value}>
                          {calendar.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={syncEnabled}
                        onChange={(event) => setSyncEnabled(event.target.checked)}
                      />
                    }
                    label="Enable automatic sync after app changes"
                  />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                      variant="contained"
                      startIcon={<CalendarMonthOutlinedIcon />}
                      onClick={handleSave}
                      disabled={saving || loadingCalendars || !selectedCalendarId}
                    >
                      {saving ? "Saving..." : "Save settings"}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<SyncOutlinedIcon />}
                      onClick={handleSyncNow}
                      disabled={syncingNow || !selectedCalendarId}
                    >
                      {syncingNow ? "Queueing..." : "Sync now"}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>

            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                    How sync works
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The app is the source of truth. Dated, incomplete goals and tasks are pushed
                    into Google Calendar by a background worker.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completing an item or removing its target date removes the Google Calendar
                    event. Changing the date or title updates the existing event.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Google-side edits are not imported back into the app.
                  </Typography>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                    Maintenance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use disconnect if you want to stop syncing this account entirely. Existing
                    mapping records stay on the backend for now, so reconnecting can be resumed
                    cleanly later.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineOutlinedIcon />}
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect Google Calendar"}
                  </Button>
                  {status.lastSyncError && (
                    <Alert severity="warning">{status.lastSyncError}</Alert>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Box>
        )}
      </Stack>
    </Container>
  );
};

export default GoogleCalendarSettings;
