import React, { useState } from "react";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

const ListForm = ({ onSubmit, submitting = false }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("List title is required.");
      return;
    }

    const listData = {
      title: trimmedTitle,
      description: description.trim()
    };

    try {
      await onSubmit(listData);
      setTitle("");
      setDescription("");
    } catch {
      // API errors are displayed by the page wrapper so the form only owns validation errors.
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 4,
        position: "relative",
        overflow: "hidden",
        background: (theme) =>
          `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)}, ${theme.palette.background.paper})`,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "0 0 auto 0",
          height: 4,
          background: (theme) =>
            `linear-gradient(90deg, ${theme.palette.secondary.main}, ${alpha(
              theme.palette.secondary.main,
              0.1
            )})`
        }
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="text.secondary" letterSpacing={1}>
            List details
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
            Create a focused task list
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Use lists for reusable task collections that do not need to be a goal hierarchy.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              fullWidth
              size="small"
              autoFocus
            />

            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={4}
              fullWidth
              size="small"
              helperText="Optional context for what belongs in this list."
            />

            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1.5,
                pt: 0.5
              }}
            >
              <Typography variant="caption" color="text.secondary">
                You can add tasks to this list after it is created.
              </Typography>
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? "Creating..." : "Create list"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default ListForm;
