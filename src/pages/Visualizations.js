import React, { useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Container, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { fetchTimeByCategory } from "../features/analytics/analyticsService";

const Visualizations = () => {
  const [summary, setSummary] = useState({ totalHours: 0, categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadSummary = async () => {
      setError("");
      setLoading(true);

      try {
        const analytics = await fetchTimeByCategory();
        if (isActive) {
          setSummary(analytics);
        }
      } catch (err) {
        console.error(err);
        if (isActive) {
          setError("Unable to load time analytics right now.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadSummary();
    return () => {
      isActive = false;
    };
  }, []);

  const topCategory = useMemo(
    () => summary.categories[0] || null,
    [summary.categories]
  );

  const statCards = useMemo(
    () => [
      {
        title: "Tracked hours",
        value: `${summary.totalHours}`,
        caption: "Total time pulled from current task totals."
      },
      {
        title: "Top category",
        value: topCategory ? topCategory.categoryTitle : "None yet",
        caption: topCategory
          ? `${topCategory.hours} hours (${topCategory.percentage}%)`
          : "Add tracked task time to see a leader."
      },
      {
        title: "Categories",
        value: `${summary.categories.length}`,
        caption: "Distinct categories contributing to tracked time."
      }
    ],
    [summary.categories.length, summary.totalHours, topCategory]
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4, textAlign: "left" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Data visualizations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review current time distribution by category. Date filters and charts will layer
            on top of this analytics feed next.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2
          }}
        >
          {statCards.map((card) => (
            <Paper
              key={card.title}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                display: "flex",
                flexDirection: "column",
                gap: 1.25
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {card.title}
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {loading ? "..." : card.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {card.caption}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.3fr) minmax(280px, 0.7fr)" },
            gap: 3
          }}
        >
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Time by category
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This is the live backend response that the first pie chart will use.
                </Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : summary.categories.length === 0 ? (
                <Box
                  sx={{
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 3,
                    p: 3,
                    backgroundColor: (theme) =>
                      alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.1 : 0.05)
                  }}
                >
                  <Typography variant="body1" fontWeight={600}>
                    No tracked time yet.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Once tasks accumulate `timeSpent`, this section will turn into charts and
                    comparisons.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {summary.categories.map((category) => (
                    <Box key={category.categoryTitle}>
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{ alignItems: "baseline", justifyContent: "space-between", mb: 0.75 }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={700} noWrap>
                            {category.categoryTitle}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {category.hours} hours
                          </Typography>
                        </Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {category.percentage}%
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          height: 12,
                          borderRadius: 999,
                          backgroundColor: (theme) =>
                            alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.18 : 0.08),
                          overflow: "hidden"
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${category.percentage}%`,
                            borderRadius: 999,
                            background: (theme) =>
                              `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Next up
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The next commits will turn this raw distribution data into the actual charting
                  UI you asked for.
                </Typography>
              </Box>

              <Box
                sx={{
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 3,
                  p: 2.5,
                  background:
                    "linear-gradient(135deg, rgba(25, 118, 210, 0.12), rgba(25, 118, 210, 0.02))"
                }}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Planned chart layers
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pie chart for category percentages.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Date range controls for week, month, year, and custom spans.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Line chart once the backend time-series endpoint is in place.
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Container>
  );
};

export default Visualizations;
