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
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import {
  fetchTimeByCategory,
  fetchTimeSeries
} from "../features/analytics/analyticsService";

const chartColors = [
  "#cf5a32",
  "#1f7a63",
  "#c9911f",
  "#b24c77",
  "#2f6fb4",
  "#6d56d6",
  "#9a5a3a",
  "#2d8a54"
];

const totalTrendLineColor = "#1c2636";

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

const getPreviousRangeState = ({ periodMode, start, end }) => {
  if (!start || !end) {
    return null;
  }

  if (periodMode === "week") {
    const previousStart = start.subtract(1, "week");
    const previousEnd = end.subtract(1, "week");

    return {
      from: previousStart.format("YYYY-MM-DD"),
      to: previousEnd.format("YYYY-MM-DD"),
      label: formatRangeLabel(previousStart, previousEnd)
    };
  }

  if (periodMode === "month") {
    const previousAnchor = start.subtract(1, "month");
    const previousStart = previousAnchor.startOf("month");
    const previousEnd = previousAnchor.endOf("month");

    return {
      from: previousStart.format("YYYY-MM-DD"),
      to: previousEnd.format("YYYY-MM-DD"),
      label: previousAnchor.format("MMMM YYYY")
    };
  }

  if (periodMode === "year") {
    const previousAnchor = start.subtract(1, "year");
    const previousStart = previousAnchor.startOf("year");
    const previousEnd = previousAnchor.endOf("year");

    return {
      from: previousStart.format("YYYY-MM-DD"),
      to: previousEnd.format("YYYY-MM-DD"),
      label: previousAnchor.format("YYYY")
    };
  }

  const spanDays = end.startOf("day").diff(start.startOf("day"), "day") + 1;
  const previousStart = start.subtract(spanDays, "day");
  const previousEnd = end.subtract(spanDays, "day");

  return {
    from: previousStart.format("YYYY-MM-DD"),
    to: previousEnd.format("YYYY-MM-DD"),
    label: formatRangeLabel(previousStart, previousEnd)
  };
};

const formatSignedHours = (value) => {
  const rounded = Math.round(value * 100) / 100;

  if (rounded === 0) {
    return "0h";
  }

  return `${rounded > 0 ? "+" : ""}${rounded}h`;
};

const Visualizations = () => {
  const [summary, setSummary] = useState(createEmptySummary);
  const [previousSummary, setPreviousSummary] = useState(createEmptySummary);
  const [timeSeries, setTimeSeries] = useState(createEmptyTimeSeries);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeSeriesLoading, setTimeSeriesLoading] = useState(true);
  const [timeSeriesError, setTimeSeriesError] = useState("");
  const [periodMode, setPeriodMode] = useState("month");
  const [granularity, setGranularity] = useState("day");
  const [categoryChartType, setCategoryChartType] = useState("pie");
  const [trendChartType, setTrendChartType] = useState("line");
  const [showTotalTrendLine, setShowTotalTrendLine] = useState(true);
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

  const previousRangeState = useMemo(
    () =>
      getPreviousRangeState({
        periodMode,
        start: rangeState.start,
        end: rangeState.end
      }),
    [periodMode, rangeState.end, rangeState.start]
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
      setPreviousSummary(createEmptySummary());
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
        const [analytics, previousAnalytics] = await Promise.all([
          fetchTimeByCategory({
            from: rangeState.from,
            to: rangeState.to
          }),
          previousRangeState
            ? fetchTimeByCategory({
                from: previousRangeState.from,
                to: previousRangeState.to
              })
            : Promise.resolve(createEmptySummary())
        ]);
        if (isActive) {
          setSummary(analytics);
          setPreviousSummary(previousAnalytics);
        }
      } catch (err) {
        console.error(err);
        if (isActive) {
          setError("Unable to load time analytics right now.");
          setPreviousSummary(createEmptySummary());
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
  }, [
    previousRangeState,
    rangeState.from,
    rangeState.to,
    rangeState.validationMessage
  ]);

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

  const previousCategoriesByKey = useMemo(
    () =>
      new Map(
        previousSummary.categories.map((category) => [getCategoryKey(category), category])
      ),
    [previousSummary.categories]
  );

  const statCards = useMemo(
    () => [
      {
        title: "Tracked hours",
        value: `${summary.totalHours}`,
        caption: "Total time pulled from recorded time entries."
      },
      {
        title: "Top category",
        value: topCategory ? topCategory.categoryTitle : "None yet",
        caption: topCategory
          ? `${topCategory.hours} hours (${topCategory.percentage}%)`
          : "Add recorded time entries to see a leader."
      },
      {
        title: "Categories",
        value: `${summary.categories.length}`,
        caption: "Distinct categories contributing to recorded time."
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

  const categoryColorByKey = useMemo(
    () =>
      new Map(
        pieData.map((category) => [category.id, category.color])
      ),
    [pieData]
  );

  const trendCategoryOptions = useMemo(
    () =>
      summary.categories.map((category, index) => ({
        key: getCategoryKey(category),
        categoryTitle: category.categoryTitle,
        color:
          categoryColorByKey.get(getCategoryKey(category)) ||
          chartColors[index % chartColors.length]
      })),
    [categoryColorByKey, summary.categories]
  );

  const defaultTrendCategoryKeys = useMemo(
    () => trendCategoryOptions.slice(0, 2).map((category) => category.key),
    [trendCategoryOptions]
  );

  useEffect(() => {
    const allowedCategoryKeys = new Set(
      trendCategoryOptions.map((category) => category.key)
    );

    setSelectedTrendCategories((prev) => {
      const nextSelection = prev.filter((categoryKey) => allowedCategoryKeys.has(categoryKey));

      if (nextSelection.length > 0 || defaultTrendCategoryKeys.length === 0) {
        return nextSelection;
      }

      return defaultTrendCategoryKeys;
    });
  }, [defaultTrendCategoryKeys, trendCategoryOptions]);

  const selectedTrendCategorySeries = useMemo(() => {
    const categoriesByKey = new Map(
      trendCategoryOptions.map((category) => [category.key, category])
    );
    return selectedTrendCategories
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
  }, [
    selectedTrendCategories,
    timeSeries.buckets,
    trendCategoryOptions
  ]);

  const lineChartSeries = useMemo(() => {
    const totalSeries = showTotalTrendLine
      ? [
          {
            id: "total-hours",
            label: "Total hours",
            data: lineChartValues,
            color: totalTrendLineColor,
            curve: "linear"
          }
        ]
      : [];

    return [
      ...totalSeries,
      ...selectedTrendCategorySeries
    ];
  }, [
    lineChartValues,
    showTotalTrendLine,
    selectedTrendCategorySeries
  ]);

  const stackedTrendSeries = useMemo(
    () =>
      selectedTrendCategorySeries.map((series) => ({
        ...series,
        type: "bar",
        stack: "total",
        curve: undefined
      })),
    [selectedTrendCategorySeries]
  );

  const hasTrendData = useMemo(
    () => timeSeries.buckets.some((bucket) => bucket.totalHours > 0),
    [timeSeries.buckets]
  );

  const hasVisibleTrendSeries = useMemo(() => {
    if (trendChartType === "stacked") {
      return stackedTrendSeries.length > 0;
    }

    return lineChartSeries.length > 0;
  }, [lineChartSeries.length, stackedTrendSeries.length, trendChartType]);

  const visibleTrendSeriesCount = useMemo(
    () => selectedTrendCategories.length + (showTotalTrendLine && trendChartType === "line" ? 1 : 0),
    [selectedTrendCategories.length, showTotalTrendLine, trendChartType]
  );

  const totalHoursDelta = useMemo(
    () => summary.totalHours - previousSummary.totalHours,
    [previousSummary.totalHours, summary.totalHours]
  );

  const topCategoryDelta = useMemo(() => {
    if (!topCategory) {
      return null;
    }

    const previousCategory = previousCategoriesByKey.get(getCategoryKey(topCategory));
    return topCategory.hours - (previousCategory?.hours || 0);
  }, [previousCategoriesByKey, topCategory]);

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
        label: "Compared to",
        value: previousRangeState ? previousRangeState.label : "N/A"
      },
      {
        label: "Trend bucket",
        value: formatBucketName(selectedBucket)
      },
      {
        label: "Total change",
        value: formatSignedHours(totalHoursDelta)
      },
      {
        label: "Peak period",
        value: peakTrendBucket
          ? `${formatBucketLabel(peakTrendBucket.periodStart, timeSeries.bucket)} (${peakTrendBucket.totalHours}h)`
          : "No tracked hours"
      },
      {
        label: "Visible lines",
        value: `${visibleTrendSeriesCount} total`
      },
      {
        label: "Lead category",
        value: topCategory
          ? `${topCategory.categoryTitle} (${topCategory.percentage}%)`
          : "None yet"
      },
      {
        label: "Lead category change",
        value:
          topCategory && topCategoryDelta !== null
            ? `${topCategory.categoryTitle} ${formatSignedHours(topCategoryDelta)}`
            : "None yet"
      }
    ],
    [
      peakTrendBucket,
      previousRangeState,
      rangeState.label,
      selectedBucket,
      visibleTrendSeriesCount,
      timeSeries.bucket,
      topCategoryDelta,
      totalHoursDelta,
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

  const handleCategoryChartTypeChange = (_event, nextValue) => {
    if (nextValue) {
      setCategoryChartType(nextValue);
    }
  };

  const handleTrendChartTypeChange = (_event, nextValue) => {
    if (nextValue) {
      setTrendChartType(nextValue);
    }
  };

  const handleTotalTrendLineToggle = () => {
    setShowTotalTrendLine((prev) => !prev);
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
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Time by category
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This {categoryChartType === "pie" ? "pie" : "bar"} chart reflects the
                    currently selected range.
                  </Typography>
                </Box>

                <ToggleButtonGroup
                  value={categoryChartType}
                  exclusive
                  onChange={handleCategoryChartTypeChange}
                  size="small"
                >
                  <ToggleButton value="pie">Pie</ToggleButton>
                  <ToggleButton value="bars">Bars</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

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
                    No time entry data is available for this range.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Try a different period or add recorded time entries that fall within these
                    dates.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      categoryChartType === "pie"
                        ? { xs: "1fr", md: "minmax(280px, 0.9fr) minmax(0, 1.1fr)" }
                        : "1fr",
                    gap: 3,
                    alignItems: categoryChartType === "pie" ? "center" : "stretch"
                  }}
                >
                  {categoryChartType === "pie" ? (
                    <>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          minHeight: 320,
                          minWidth: 0,
                          overflow: "hidden"
                        }}
                      >
                        <PieChart
                          height={320}
                          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          hideLegend
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
                    </>
                  ) : (
                    <Box sx={{ minWidth: 0 }}>
                      <Stack spacing={2} sx={{ width: "100%", px: { xs: 0, md: 1 } }}>
                        {summary.categories.map((category, index) => {
                          const categoryColor = pieData[index]?.color || chartColors[0];
                          const widthPercent = category.percentage;

                          return (
                            <Box key={`bar-${getCategoryKey(category)}`}>
                              <Stack
                                direction="row"
                                spacing={2}
                                sx={{
                                  alignItems: "baseline",
                                  justifyContent: "space-between",
                                  mb: 0.75
                                }}
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
                                      backgroundColor: categoryColor,
                                      flexShrink: 0
                                    }}
                                  />
                                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                                    {category.categoryTitle}
                                  </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" textAlign="right">
                                  {category.hours} hours ({category.percentage}%)
                                </Typography>
                              </Stack>
                              <Box
                                sx={{
                                  height: 18,
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
                                    width: `${widthPercent}%`,
                                    minWidth: category.hours > 0 ? 10 : 0,
                                    borderRadius: 999,
                                    backgroundColor: categoryColor
                                  }}
                                />
                              </Box>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  )}
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
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
            >
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Time trend
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {trendChartType === "line"
                    ? `Total hours across the selected range. Current granularity is ${selectedBucket}. Toggle category lines from the chart sidebar.`
                    : `Category contributions across the selected range, stacked by period. Current granularity is ${selectedBucket}.`}
                </Typography>
              </Box>

              <ToggleButtonGroup
                value={trendChartType}
                exclusive
                onChange={handleTrendChartTypeChange}
                size="small"
              >
                <ToggleButton value="line">Lines</ToggleButton>
                <ToggleButton value="stacked">Stacked</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

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
                  No time entry data is available for this range.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  The trend chart will appear once this date range includes recorded time entries.
                </Typography>
              </Box>
            ) : !hasVisibleTrendSeries ? (
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
                  No visible trend series selected.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  Turn `Total hours` back on or select at least one category from the sidebar.
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 260px" },
                  gap: 3,
                  alignItems: "start"
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  {trendChartType === "line" ? (
                    <LineChart
                      height={320}
                      margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
                      hideLegend
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
                  ) : (
                    <BarChart
                      height={320}
                      margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
                      hideLegend
                      xAxis={[
                        {
                          scaleType: "band",
                          data: lineChartLabels
                        }
                      ]}
                      yAxis={[
                        {
                          label: "Hours"
                        }
                      ]}
                      series={stackedTrendSeries}
                      grid={{ horizontal: true }}
                    />
                  )}
                </Box>

                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 3,
                    p: 2,
                    backgroundColor: (theme) =>
                      alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.35 : 0.6)
                  }}
                >
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {trendChartType === "line" ? "Category lines" : "Stacked categories"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {trendChartType === "line"
                          ? "Add or remove category lines without leaving the chart. Top categories are preselected for each range."
                          : "Choose which categories appear in the stacked view. Top categories are preselected for each range."}
                      </Typography>
                    </Box>

                    {trendChartType === "line" && (
                      <Chip
                        label="Total hours"
                        onClick={handleTotalTrendLineToggle}
                        variant={showTotalTrendLine ? "filled" : "outlined"}
                        sx={{
                          justifyContent: "flex-start",
                          borderColor: totalTrendLineColor,
                          color: showTotalTrendLine ? "#fff" : totalTrendLineColor,
                          backgroundColor: showTotalTrendLine ? totalTrendLineColor : "transparent",
                          "& .MuiChip-label": {
                            width: "100%",
                            textAlign: "left"
                          }
                        }}
                      />
                    )}

                    {trendCategoryOptions.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Add tracked category data to compare category lines.
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {trendCategoryOptions.map((category) => {
                          const selected = selectedTrendCategories.includes(category.key);

                          return (
                            <Chip
                              key={category.key}
                              label={category.categoryTitle}
                              onClick={() => handleTrendCategoryToggle(category.key)}
                              variant={selected ? "filled" : "outlined"}
                              sx={{
                                justifyContent: "flex-start",
                                borderColor: category.color,
                                color: selected ? "#fff" : category.color,
                                backgroundColor: selected ? category.color : "transparent",
                                "& .MuiChip-label": {
                                  width: "100%",
                                  textAlign: "left"
                                }
                              }}
                            />
                          );
                        })}
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </Box>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default Visualizations;
