import React from "react";
import { Box, Container, Paper, Stack, Typography } from "@mui/material";

const Visualizations = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Data visualizations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track time spent on goals and see how progress changes over time.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2
          }}
        >
          {[
            {
              title: "Time spent by goal",
              description: "A breakdown of hours invested in each goal."
            },
            {
              title: "Weekly progress",
              description: "Task completion trends across recent weeks."
            },
            {
              title: "Focus balance",
              description: "Where your time is going across lists and goals."
            }
          ].map((card) => (
            <Paper
              key={card.title}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                display: "flex",
                flexDirection: "column",
                gap: 2
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minHeight: 160,
                  borderRadius: 2,
                  border: "1px dashed",
                  borderColor: "divider",
                  background:
                    "linear-gradient(135deg, rgba(25, 118, 210, 0.15), rgba(25, 118, 210, 0.02))"
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Charts will appear here once data is available.
              </Typography>
            </Paper>
          ))}
        </Box>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Planned insights
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This space will expand with filters, comparisons, and goal-specific timelines to
            highlight wins and areas to refine.
          </Typography>
        </Paper>
      </Stack>
    </Container>
  );
};

export default Visualizations;
