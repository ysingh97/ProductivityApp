const dayjs = require('dayjs');

// Deterministic palette shared by the analytics category donut and trend chart.
const VIZ_COLORS = [
  '#cf5a32',
  '#1f7a63',
  '#c9911f',
  '#b24c77',
  '#2f6fb4',
  '#6d56d6',
  '#9a5a3a',
  '#2d8a54'
];

const UNCATEGORIZED_COLOR = '#94a3b8';
const TOTAL_TREND_COLOR = '#1c2636';

const roundTo = (value, places = 2) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

// Stable identity for a category row (id when present, else its title).
const getCategoryKey = (category = {}) =>
  category.categoryId || category.categoryTitle || 'uncategorized';

// Assigns a deterministic color to every category, ordered as received (the API
// already sorts by hours desc). "Uncategorized" always gets the muted grey.
const assignCategoryColors = (categories = []) => {
  const colors = new Map();
  let paletteIndex = 0;
  categories.forEach((category) => {
    const key = getCategoryKey(category);
    if (colors.has(key)) {
      return;
    }
    if (!category.categoryId && category.categoryTitle === 'Uncategorized') {
      colors.set(key, UNCATEGORIZED_COLOR);
      return;
    }
    colors.set(key, VIZ_COLORS[paletteIndex % VIZ_COLORS.length]);
    paletteIndex += 1;
  });
  return colors;
};

// Normalizes a time-by-category summary into colored segments ready to render.
const buildCategoryBreakdown = (summary = {}) => {
  const categories = Array.isArray(summary.categories) ? summary.categories : [];
  const colors = assignCategoryColors(categories);
  const totalHours = roundTo(
    typeof summary.totalHours === 'number'
      ? summary.totalHours
      : categories.reduce((sum, category) => sum + (category.hours || 0), 0)
  );

  const segments = categories
    .filter((category) => (category.hours || 0) > 0)
    .map((category) => {
      const key = getCategoryKey(category);
      const hours = roundTo(category.hours || 0);
      const percentage =
        typeof category.percentage === 'number'
          ? roundTo(category.percentage)
          : totalHours > 0
          ? roundTo((hours / totalHours) * 100)
          : 0;
      return {
        key,
        categoryId: category.categoryId || null,
        title: category.categoryTitle || 'Uncategorized',
        hours,
        percentage,
        color: colors.get(key)
      };
    });

  return { totalHours, segments };
};

// Turns breakdown segments into donut stroke geometry for an SVG <Circle> per
// segment (strokeDasharray + offset technique). radius is the circle radius.
const buildDonutSegments = (segments = [], radius = 60) => {
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + (segment.hours || 0), 0);
  let cumulative = 0;

  return segments.map((segment) => {
    const fraction = total > 0 ? (segment.hours || 0) / total : 0;
    const dashLength = fraction * circumference;
    const dashSegment = {
      key: segment.key,
      color: segment.color,
      fraction: roundTo(fraction, 6),
      dashArray: `${dashLength} ${circumference - dashLength}`,
      // Negative offset rotates each segment to start where the previous ended.
      // `|| 0` normalizes the first segment's -0 to 0.
      dashOffset: -cumulative * circumference || 0
    };
    cumulative += fraction;
    return dashSegment;
  });
};

// Formats a bucket's period-start date for a trend axis label.
const formatBucketLabel = (periodStart, bucket) => {
  const date = dayjs(periodStart);
  if (bucket === 'month') {
    return date.format('MMM YYYY');
  }
  return date.format('MMM D');
};

// Scales a time-series response into bars with 0..1 height ratios for charting.
const buildTrendSeries = (timeSeries = {}) => {
  const bucket = timeSeries.bucket || 'day';
  const buckets = Array.isArray(timeSeries.buckets) ? timeSeries.buckets : [];
  const maxHours = buckets.reduce(
    (max, entry) => Math.max(max, entry.totalHours || 0),
    0
  );

  const bars = buckets.map((entry) => ({
    periodStart: entry.periodStart,
    label: formatBucketLabel(entry.periodStart, bucket),
    totalHours: roundTo(entry.totalHours || 0),
    heightRatio: maxHours > 0 ? roundTo((entry.totalHours || 0) / maxHours, 4) : 0
  }));

  const totalHours = roundTo(
    buckets.reduce((sum, entry) => sum + (entry.totalHours || 0), 0)
  );

  return { bucket, maxHours: roundTo(maxHours), totalHours, bars };
};

// The coarsest bucket that stays readable for a given period mode.
const getAllowedBuckets = (periodMode) => {
  if (periodMode === 'week') {
    return ['day'];
  }
  if (periodMode === 'month') {
    return ['day', 'week'];
  }
  return ['day', 'week', 'month'];
};

const getAutoBucket = (periodMode) => {
  if (periodMode === 'year') {
    return 'month';
  }
  if (periodMode === 'month') {
    return 'day';
  }
  return 'day';
};

// Computes the inclusive date range + display label for a Week/Month/Year view
// anchored on activeDate (a dayjs-parseable value).
const computeRangeState = (periodMode, activeDate) => {
  const anchor = dayjs(activeDate);

  if (periodMode === 'week') {
    const start = anchor.startOf('week');
    const end = anchor.endOf('week');
    return {
      from: start.format('YYYY-MM-DD'),
      to: end.format('YYYY-MM-DD'),
      label: `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`
    };
  }

  if (periodMode === 'year') {
    const start = anchor.startOf('year');
    const end = anchor.endOf('year');
    return {
      from: start.format('YYYY-MM-DD'),
      to: end.format('YYYY-MM-DD'),
      label: anchor.format('YYYY')
    };
  }

  const start = anchor.startOf('month');
  const end = anchor.endOf('month');
  return {
    from: start.format('YYYY-MM-DD'),
    to: end.format('YYYY-MM-DD'),
    label: anchor.format('MMMM YYYY')
  };
};

const formatHours = (value) => {
  const rounded = roundTo(value || 0);
  return `${rounded}h`;
};

module.exports = {
  VIZ_COLORS,
  UNCATEGORIZED_COLOR,
  TOTAL_TREND_COLOR,
  getCategoryKey,
  assignCategoryColors,
  buildCategoryBreakdown,
  buildDonutSegments,
  buildTrendSeries,
  formatBucketLabel,
  getAllowedBuckets,
  getAutoBucket,
  computeRangeState,
  formatHours
};
