import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Chip,
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
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import {
  fetchTimeByCategory,
  fetchTimeSeries
} from "../features/analytics/analyticsService";

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
const createEmptyTimeSeries = () => ({ bucket: "day", buckets: [] });

const formatRangeLabel = (start, end) => {
  if (start.isSame(end, "day")) {
    return start.format("MMM D, YYYY");
  }

  return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
};

const formatBucketLabel = (periodStart, bucket) => {
  const date = dayjs(periodStart);

  if (bucket === "month") {
    return date.format("MMM YYYY");
  }

  return date.format("MMM D");
};

const getAutoBucket = ({ periodMode, rangeStart, rangeEnd }) => {
  if (periodMode === "year") {
    return "month";
  }

  if (periodMode !== "custom" || !rangeStart || !rangeEnd) {
    return "day";
  }

  const daySpan = rangeEnd.startOf("day").diff(rangeStart.startOf("day"), "day") + 1;

  if (daySpan > 180) {
    return "month";
  }

  if (daySpan > 45) {
    return "week";
  }

  return "day";
};

const getAllowedBuckets = (periodMode) => {
  if (periodMode === "week") {
    return ["day"];
  }

  if (periodMode === "month") {
    return ["day", "week"];
  }

  return ["day", "week", "month"];
};

const formatBucketName = (bucket) =>
  bucket.charAt(0).toUpperCase() + bucket.slice(1);

const getCategoryKey = (category) => category.categoryId || category.categoryTitle;

const Visualizations = () => {
  const [summary, setSummary] = useState(createEmptySummary);
  const [timeSeries, setTimeSeries] = useState(createEmptyTimeSeries);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeSeriesLoading, setTimeSeriesLoading] = useState(true);
  const [timeSeriesError, setTimeSeriesError] = useState("");
  const [periodMode, setPeriodMode] = useState("month");
  const [granularity, setGranularity] = useState("day");
  const [selectedTrendCategories, setSelectedTrendCategories] = useState([]);
  const [activeDate, setActiveDate] = useState(() => dayjs());
  const [customRange, setCustomRange] = useState(() => ({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().endOf("month").format("YYYY-MM-DD")
  }));
  const previousPeriodModeRef = useRef("month");

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

  const allowedBuckets = useMemo(
    () => getAllowedBuckets(periodMode),
    [periodMode]
  );

  const autoBucket = useMemo(
    () =>
      getAutoBucket({
        periodMode,
        rangeStart: rangeState.start,
        rangeEnd: rangeState.end
      }),
    [periodMode, rangeState.end, rangeState.start]
  );

  const selectedBucket = useMemo(
    () => (allowedBuckets.includes(granularity) ? granularity : autoBucket),
    [allowedBuckets, autoBucket, granularity]
  );

  useEffect(() => {
    const periodModeChanged = previousPeriodModeRef.current !== periodMode;
    previousPeriodModeRef.current = periodMode;

    if (periodModeChanged) {
      setGranularity(autoBucket);
      return;
    }

    if (!allowedBuckets.includes(granularity)) {
      setGranularity(autoBucket);
    }
  }, [allowedBuckets, autoBucket, granularity, periodMode]);

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

  useEffect(() => {
    let isActive = true;

    if (rangeState.validationMessage) {
      setTimeSeries(createEmptyTimeSeries());
      setTimeSeriesError("");
      setTimeSeriesLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadTimeSeries = async () => {
      setTimeSeriesError("");
      setTimeSeriesLoading(true);

      try {
        const analytics = await fetchTimeSeries({
          from: rangeState.from,
          to: rangeState.to,
          bucket: selectedBucket
        });

        if (isActive) {
          setTimeSeries(analytics);
        }
      } catch (err) {
        console.error(err);
        if (isActive) {
          setTimeSeriesError("Unable to load trend analytics right now.");
        }
      } finally {
        if (isActive) {
          setTimeSeriesLoading(false);
        }
      }
    };

    loadTimeSeries();
    return () => {
      isActive = false;
    };
  }, [rangeState.from, rangeState.to, rangeState.validationMessage, selectedBucket]);

  const displayedError = rangeState.validationMessage || error;
  const displayedTimeSeriesError = rangeState.validationMessage || timeSeriesError;

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

  const lineChartLabels = useMemo(
    () =>
      timeSeries.buckets.map((bucket) =>
        formatBucketLabel(bucket.periodStart, timeSeries.bucket)
      ),
    [timeSeries.bucket, timeSeries.buckets]
  );

  const lineChartValues = useMemo(
    () => timeSeries.buckets.map((bucket) => bucket.totalHours),
    [timeSeries.buckets]
  );

  const pieData = useMemo(
    () =>
      summary.categories.map((category, index) => ({
        id: getCategoryKey(category),
        value: category.hours,
        label: category.categoryTitle,
        color: chartColors[index % chartColors.length]
      })),
    [summary.categories]
  );

  const trendCategoryOptions = useMemo(
    () =>
      summary.categories.map((category, index) => ({
        key: getCategoryKey(category),
        categoryTitle: category.categoryTitle,
        color: chartColors[index % chartColors.length]
      })),
    [summary.categories]
  );

  useEffect(() => {
    const allowedCategoryKeys = new Set(
      trendCategoryOptions.map((category) => category.key)
    );

    setSelectedTrendCategories((prev) =>
      prev.filter((categoryKey) => allowedCategoryKeys.has(categoryKey))
    );
  }, [trendCategoryOptions]);

  const lineChartSeries = useMemo(() => {
    const categoriesByKey = new Map(
      trendCategoryOptions.map((category) => [category.key, category])
    );
    const categorySeries = selectedTrendCategories
      .map((categoryKey) => categoriesByKey.get(categoryKey))
      .filter(Boolean)
      .map((category) => ({
        id: `category-${category.key}`,
        label: category.categoryTitle,
        data: timeSeries.buckets.map((bucket) => {
          const matchedCategory = bucket.categories.find(
            (bucketCategory) => getCategoryKey(bucketCategory) === category.key
          );

          return matchedCategory ? matchedCategory.hours : 0;
        }),
        color: category.color,
        curve: "linear"
      }));

    return [
      {
        id: "total-hours",
        label: "Total hours",
        data: lineChartValues,
        color: "#1c2636",
        curve: "linear"
      },
      ...categorySeries
    ];
  }, [
    lineChartValues,
    selectedTrendCategories,
    timeSeries.buckets,
    trendCategoryOptions
  ]);

  const hasTrendData = useMemo(
    () => timeSeries.buckets.some((bucket) => bucket.totalHours > 0),
    [timeSeries.buckets]
  );

  const peakTrendBucket = useMemo(() => {
    const nonEmptyBuckets = timeSeries.buckets.filter((bucket) => bucket.totalHours > 0);

    if (nonEmptyBuckets.length === 0) {
      return null;
    }

    return nonEmptyBuckets.reduce((peakBucket, currentBucket) =>
      currentBucket.totalHours > peakBucket.totalHours ? currentBucket : peakBucket
    );
  }, [timeSeries.buckets]);

  const snapshotItems = useMemo(
    () => [
      {
        label: "Selected window",
        value: rangeState.label
      },
      {
        label: "Trend bucket",
        value: formatBucketName(selectedBucket)
      },
      {
        label: "Peak period",
        value: peakTrendBucket
          ? `${formatBucketLabel(peakTrendBucket.periodStart, timeSeries.bucket)} (${peakTrendBucket.totalHours}h)`
          : "No tracked hours"
      },
      {
        label: "Visible lines",
        value: `${selectedTrendCategories.length + 1} total`
      },
      {
        label: "Lead category",
        value: topCategory
          ? `${topCategory.categoryTitle} (${topCategory.percentage}%)`
          : "None yet"
      }
    ],
    [
      peakTrendBucket,
      rangeState.label,
      selectedBucket,
      selectedTrendCategories.length,
      timeSeries.bucket,
      topCategory
    ]
  );

  const handlePeriodChange = (_event, nextValue) => {
    if (nextValue) {
      setPeriodMode(nextValue);
    }
  };

  const handleGranularityChange = (_event, nextValue) => {
    if (nextValue) {
      setGranularity(nextValue);
    }
  };

  const handleTrendCategoryToggle = (categoryKey) => {
    setSelectedTrendCategories((prev) =>
      prev.includes(categoryKey)
        ? prev.filter((value) => value !== categoryKey)
        : [...prev, categoryKey]
    );
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
            Review category distribution and total-hours trends across the selected date range.
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

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
            >
              <Typography variant="body2" color="text.secondary">
                Trend granularity
              </Typography>

              <ToggleButtonGroup
                value={selectedBucket}
                exclusive
                onChange={handleGranularityChange}
                size="small"
              >
                {allowedBuckets.map((bucket) => (
                  <ToggleButton key={bucket} value={bucket}>
                    {formatBucketName(bucket)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Trend categories
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                {trendCategoryOptions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Add tracked category data to compare category lines.
                  </Typography>
                ) : (
                  trendCategoryOptions.map((category) => {
                    const selected = selectedTrendCategories.includes(category.key);

                    return (
                      <Chip
                        key={category.key}
                        label={category.categoryTitle}
                        onClick={() => handleTrendCategoryToggle(category.key)}
                        variant={selected ? "filled" : "outlined"}
                        sx={{
                          borderColor: category.color,
                          color: selected ? "#fff" : category.color,
                          backgroundColor: selected ? category.color : "transparent"
                        }}
                      />
                    );
                  })
                )}
              </Stack>
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
                  Range snapshot
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Live context for the selected window and the trend chart currently in view.
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
                <Stack spacing={1.5}>
                  {snapshotItems.map((item) => (
                    <Stack
                      key={item.label}
                      direction="row"
                      spacing={2}
                      sx={{ alignItems: "baseline", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={700} textAlign="right">
                        {loading || timeSeriesLoading ? "..." : item.value}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Box>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Time trend
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total hours across the selected range. Current granularity is{" "}
                {selectedBucket}. Select categories above to overlay their lines.
              </Typography>
            </Box>

            {timeSeriesLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : displayedTimeSeriesError ? (
              <Typography color="error">{displayedTimeSeriesError}</Typography>
            ) : !hasTrendData ? (
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
                  No tracked trend data in this range.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  The line chart will appear once tasks in this range have tracked `timeSpent`.
                </Typography>
              </Box>
            ) : (
              <LineChart
                height={320}
                margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
                xAxis={[
                  {
                    scaleType: "point",
                    data: lineChartLabels
                  }
                ]}
                series={lineChartSeries}
                yAxis={[
                  {
                    label: "Hours"
                  }
                ]}
                grid={{ horizontal: true }}
              />
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default Visualizations;
