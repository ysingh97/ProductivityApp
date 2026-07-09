const test = require('node:test');
const assert = require('node:assert/strict');

const {
  VIZ_COLORS,
  UNCATEGORIZED_COLOR,
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
} = require('./visualizationsModel');

test('getCategoryKey prefers id, falls back to title', () => {
  assert.equal(getCategoryKey({ categoryId: 'c1', categoryTitle: 'Work' }), 'c1');
  assert.equal(getCategoryKey({ categoryTitle: 'Work' }), 'Work');
  assert.equal(getCategoryKey({}), 'uncategorized');
});

test('assignCategoryColors is deterministic and reserves grey for Uncategorized', () => {
  const colors = assignCategoryColors([
    { categoryId: 'c1', categoryTitle: 'Work' },
    { categoryId: 'c2', categoryTitle: 'Study' },
    { categoryTitle: 'Uncategorized' }
  ]);
  assert.equal(colors.get('c1'), VIZ_COLORS[0]);
  assert.equal(colors.get('c2'), VIZ_COLORS[1]);
  assert.equal(colors.get('Uncategorized'), UNCATEGORIZED_COLOR);
});

test('assignCategoryColors reuses a color for a repeated key', () => {
  const colors = assignCategoryColors([
    { categoryId: 'c1', categoryTitle: 'Work' },
    { categoryId: 'c1', categoryTitle: 'Work' }
  ]);
  assert.equal(colors.size, 1);
  assert.equal(colors.get('c1'), VIZ_COLORS[0]);
});

test('buildCategoryBreakdown filters zero rows and derives percentages', () => {
  const { totalHours, segments } = buildCategoryBreakdown({
    totalHours: 10,
    categories: [
      { categoryId: 'c1', categoryTitle: 'Work', hours: 6, percentage: 60 },
      { categoryId: 'c2', categoryTitle: 'Study', hours: 4 },
      { categoryId: 'c3', categoryTitle: 'Idle', hours: 0 }
    ]
  });
  assert.equal(totalHours, 10);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].title, 'Work');
  assert.equal(segments[0].percentage, 60);
  // percentage derived when the API omits it
  assert.equal(segments[1].percentage, 40);
  assert.equal(segments[0].color, VIZ_COLORS[0]);
});

test('buildCategoryBreakdown computes totalHours when absent', () => {
  const { totalHours } = buildCategoryBreakdown({
    categories: [
      { categoryId: 'c1', categoryTitle: 'Work', hours: 2.5 },
      { categoryId: 'c2', categoryTitle: 'Study', hours: 1.25 }
    ]
  });
  assert.equal(totalHours, 3.75);
});

test('buildCategoryBreakdown handles empty input', () => {
  const result = buildCategoryBreakdown({});
  assert.deepEqual(result, { totalHours: 0, segments: [] });
});

test('buildDonutSegments produces dash geometry that spans the circle', () => {
  const { segments } = buildCategoryBreakdown({
    categories: [
      { categoryId: 'c1', categoryTitle: 'Work', hours: 3 },
      { categoryId: 'c2', categoryTitle: 'Study', hours: 1 }
    ]
  });
  const radius = 60;
  const donut = buildDonutSegments(segments, radius);
  assert.equal(donut.length, 2);
  // fractions add up to 1
  const totalFraction = donut.reduce((sum, s) => sum + s.fraction, 0);
  assert.ok(Math.abs(totalFraction - 1) < 1e-6);
  // first segment starts at offset 0, second is offset by first fraction
  assert.equal(donut[0].dashOffset, 0);
  assert.ok(donut[1].dashOffset < 0);
  assert.equal(donut[0].color, VIZ_COLORS[0]);
});

test('buildDonutSegments is safe with no hours', () => {
  const donut = buildDonutSegments(
    [{ key: 'a', color: '#000', hours: 0 }],
    50
  );
  assert.equal(donut[0].fraction, 0);
});

test('buildTrendSeries scales bars to the max bucket', () => {
  const series = buildTrendSeries({
    bucket: 'day',
    buckets: [
      { periodStart: '2026-01-01', totalHours: 2 },
      { periodStart: '2026-01-02', totalHours: 4 },
      { periodStart: '2026-01-03', totalHours: 0 }
    ]
  });
  assert.equal(series.bucket, 'day');
  assert.equal(series.maxHours, 4);
  assert.equal(series.totalHours, 6);
  assert.equal(series.bars[0].heightRatio, 0.5);
  assert.equal(series.bars[1].heightRatio, 1);
  assert.equal(series.bars[2].heightRatio, 0);
  assert.equal(series.bars[0].label, 'Jan 1');
});

test('buildTrendSeries handles empty buckets', () => {
  const series = buildTrendSeries({ bucket: 'week', buckets: [] });
  assert.deepEqual(series, { bucket: 'week', maxHours: 0, totalHours: 0, bars: [] });
});

test('formatBucketLabel switches format by bucket', () => {
  assert.equal(formatBucketLabel('2026-03-05', 'day'), 'Mar 5');
  assert.equal(formatBucketLabel('2026-03-01', 'month'), 'Mar 2026');
});

test('getAllowedBuckets / getAutoBucket by period mode', () => {
  assert.deepEqual(getAllowedBuckets('week'), ['day']);
  assert.deepEqual(getAllowedBuckets('month'), ['day', 'week']);
  assert.deepEqual(getAllowedBuckets('year'), ['day', 'week', 'month']);
  assert.equal(getAutoBucket('year'), 'month');
  assert.equal(getAutoBucket('month'), 'day');
  assert.equal(getAutoBucket('week'), 'day');
});

test('computeRangeState builds week/month/year ranges', () => {
  const week = computeRangeState('week', '2026-01-14');
  assert.equal(week.from, '2026-01-11');
  assert.equal(week.to, '2026-01-17');

  const month = computeRangeState('month', '2026-01-14');
  assert.equal(month.from, '2026-01-01');
  assert.equal(month.to, '2026-01-31');
  assert.equal(month.label, 'January 2026');

  const year = computeRangeState('year', '2026-06-01');
  assert.equal(year.from, '2026-01-01');
  assert.equal(year.to, '2026-12-31');
  assert.equal(year.label, '2026');
});

test('formatHours appends the unit', () => {
  assert.equal(formatHours(3.5), '3.5h');
  assert.equal(formatHours(), '0h');
});
