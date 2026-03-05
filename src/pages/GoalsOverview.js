import React from "react";
import { Box, Chip, Container, Paper, Stack, Typography } from "@mui/material";

const GoalsOverview = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            In-depth goals view
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Explore goal progress, momentum, and blockers in one focused view.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2
          }}
        >
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Active goals
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ my: 1 }}>
              --
            </Typography>
            <Chip label="Coming soon" size="small" />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Goals on track
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ my: 1 }}>
              --
            </Typography>
            <Chip label="Coming soon" size="small" />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Goals at risk
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ my: 1 }}>
              --
            </Typography>
            <Chip label="Coming soon" size="small" />
          </Paper>
        </Box>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            What will live here
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography fontWeight={600}>Goal timelines</Typography>
              <Typography variant="body2" color="text.secondary">
                Target dates, milestones, and the next action to keep momentum.
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight={600}>Effort and momentum</Typography>
              <Typography variant="body2" color="text.secondary">
                Recent work summaries and trends that show which goals need attention.
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight={600}>Blocker tracking</Typography>
              <Typography variant="body2" color="text.secondary">
                Notes about dependencies, risks, and updates from your task history.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default GoalsOverview;
