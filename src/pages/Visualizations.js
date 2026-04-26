import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { PieChart } from "@mui/x-charts/PieChart";
import { fetchTimeByCategory } from "../features/analytics/analyticsService";

const chartColors = [
  "#c24b2f",
  "#4c6a5f",
  "#b57f2a",
  "#8b3d4c",
  "#5d6f86",
  "#6c5b7b",
  "#a44a3f",
  "#46736a"
];

const createEmptySummary = () => ({ totalHours: 0, categories: [] });

const formatRangeLabel = (start, end) => {
  if (start.isSame(end, "day")) {
    return start.format("MMM D, YYYY");
  }

  return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
};

const Visualizations = () => {
  const [summary, setSummary] = useState(createEmptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [periodMode, setPeriodMode] = useState("month");
  const [activeDate, setActiveDate] = useState(() => dayjs());
  const [customRange, setCustomRange] = useState(() => ({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD")
  }));

  const rangeState = useMemo(() => {
    if (periodMode === "week") {
      const start = activeDate.startOf("week");
      const end = activeDate.endOf("week");
      return {
        from: start.format("YYYY-MM-DD"),
        to: end.format("YYYY-MM-DD"),
        label: formatRangeLabel(start, end),
        start,
        end,
        validationMessage: ""
      };
    }

    if (periodMode === "month") {
      const start = activeDate.startOf("month");
      const end = activeDate.endOf("month");
      return {
        from: start.format("YYYY-MM-DD"),
        to: end.format("YYYY-MM-DD"),
        label: activeDate.format("MMMM YYYY"),
        start,
        end,
        validationMessage: ""
      };
    }

    if (periodMode === "year") {
      const start = activeDate.startOf("year");
      const end = activeDate.endOf("year");
      return {
        from: start.format("YYYY-MM-DD"),
        to: end.format("YYYY-MM-DD"),
        label: activeDate.format("YYYY"),
        start,
        end,
        validationMessage: ""
      };
    }

    if (!customRange.from || !customRange.to) {
      return {
        from: null,
        to: null,
        label: "Custom range",
        start: null,
        end: null,
        validationMessage: "Select both a start and end date."
      };
    }

    const start = dayjs(customRange.from);
    const end = dayjs(customRange.to);

    if (!start.isValid() || !end.isValid()) {
      return {
        from: null,
        to: null,
        label: "Custom range",
        start: null,
        end: null,
        validationMessage: "Choose a valid custom date range."
      };
    }

    if (start.isAfter(end, "day")) {
      return {
        from: null,
        to: null,
        label: "Custom range",
        start,
        end,
        validationMessage: "Start date must be on or before end date."
      };
    }

    return {
      from: start.format("YYYY-MM-DD"),
      to: end.format("YYYY-MM-DD"),
      label: formatRangeLabel(start, end),
      start,
      end,
      validationMessage: ""
    };
  }, [activeDate, customRange.from, customRange.to, periodMode]);

  useEffect(() => {
    let isActive = true;

    if (rangeState.validationMessage) {
      setSummary(createEmptySummary());
      setError("");
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadSummary = async () => {
      setError("");
      setLoading(true);

      try {
        const analytics = await fetchTimeByCategory({
          from: rangeState.from,
          to: rangeState.to
        });
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
  }, [rangeState.from, rangeState.to, rangeState.validationMessage]);

  const displayedError = rangeState.validationMessage || error;

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

  const pieData = useMemo(
    () =>
      summary.categories.map((category, index) => ({
        id: category.categoryId || category.categoryTitle,
        value: category.hours,
        label: category.categoryTitle,
        color: chartColors[index % chartColors.length]
      })),
    [summary.categories]
  );

  const handlePeriodChange = (_event, nextValue) => {
    if (nextValue) {
      setPeriodMode(nextValue);
    }
  };

  const handleShift = (direction) => {
    if (periodMode === "custom") {
      if (!rangeState.start || !rangeState.end || rangeState.validationMessage) {
        return;
      }

      const spanDays =
        rangeState.end.startOf("day").diff(rangeState.start.startOf("day"), "day") + 1;
      const shiftDays = direction * spanDays;

      setCustomRange({
        from: rangeState.start.add(shiftDays, "day").format("YYYY-MM-DD"),
        to: rangeState.end.add(shiftDays, "day").format("YYYY-MM-DD")
      });
      return;
    }

    setActiveDate((prev) => prev.add(direction, periodMode));
  };

  const handleJumpToToday = () => {
    if (periodMode === "custom") {
      const today = dayjs().format("YYYY-MM-DD");
      setCustomRange({ from: today, to: today });
      return;
    }

    setActiveDate(dayjs());
  };

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

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={2}
              sx={{ alignItems: { lg: "center" }, justifyContent: "space-between" }}
            >
              <ToggleButtonGroup
                value={periodMode}
                exclusive
                onChange={handlePeriodChange}
                size="small"
              >
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="month">Month</ToggleButton>
                <ToggleButton value="year">Year</ToggleButton>
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>

              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleShift(-1)}
                  disabled={periodMode === "custom" && Boolean(rangeState.validationMessage)}
                >
                  Prev
                </Button>
                <Button variant="outlined" size="small" onClick={handleJumpToToday}>
                  Today
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleShift(1)}
                  disabled={periodMode === "custom" && Boolean(rangeState.validationMessage)}
                >
                  Next
                </Button>
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                {rangeState.label}
              </Typography>

              {periodMode === "custom" && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    label="Start date"
                    type="date"
                    size="small"
                    value={customRange.from}
                    onChange={(event) =>
                      setCustomRange((prev) => ({ ...prev, from: event.target.value }))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="End date"
                    type="date"
                    size="small"
                    value={customRange.to}
                    onChange={(event) =>
                      setCustomRange((prev) => ({ ...prev, to: event.target.value }))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              )}
            </Stack>
          </Stack>
        </Paper>

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
                  This pie chart reflects the currently selected range.
                </Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : displayedError ? (
                <Typography color="error">{displayedError}</Typography>
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
                    No tracked time in this range.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Try a different period or add tracked `timeSpent` to tasks that fall within
                    these dates.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 0.9fr) minmax(0, 1.1fr)" },
                    gap: 3,
                    alignItems: "center"
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: 320
                    }}
                  >
                    <PieChart
                      height={320}
                      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                      series={[
                        {
                          data: pieData,
                          innerRadius: 70,
                          outerRadius: 110,
                          paddingAngle: 2,
                          cornerRadius: 4,
                          highlightScope: { faded: "global", highlighted: "item" },
                          faded: { innerRadius: 64, additionalRadius: -6, color: "gray" },
                          valueFormatter: (value) => `${value.value} hours`
                        }
                      ]}
                      slotProps={{ legend: { hidden: true } }}
                    />
                  </Box>

                  <Stack spacing={2}>
                    {summary.categories.map((category, index) => (
                      <Box key={category.categoryTitle}>
                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{ alignItems: "baseline", justifyContent: "space-between", mb: 0.75 }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.25,
                              minWidth: 0
                            }}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: pieData[index]?.color || chartColors[0],
                                flexShrink: 0
                              }}
                            />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle1" fontWeight={700} noWrap>
                                {category.categoryTitle}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {category.hours} hours
                              </Typography>
                            </Box>
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
                              alpha(
                                theme.palette.text.primary,
                                theme.palette.mode === "dark" ? 0.18 : 0.08
                              ),
                            overflow: "hidden"
                          }}
                        >
                          <Box
                            sx={{
                              height: "100%",
                              width: `${category.percentage}%`,
                              borderRadius: 999,
                              backgroundColor: pieData[index]?.color || chartColors[0]
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
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
