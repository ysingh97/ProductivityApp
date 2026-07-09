import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import Svg, { Circle, G, Rect, Line, Text as SvgText } from 'react-native-svg';
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  SegmentedButtons,
  Text
} from 'react-native-paper';
import {
  buildCategoryBreakdown,
  buildDonutSegments,
  buildTrendSeries,
  computeRangeState,
  getAllowedBuckets,
  getAutoBucket,
  formatHours,
  TOTAL_TREND_COLOR
} from '@productivity/shared';
import services from '../api/services';
import ScreenMessage from '../components/ScreenMessage';

const DONUT_RADIUS = 60;
const DONUT_STROKE = 22;
const DONUT_SIZE = (DONUT_RADIUS + DONUT_STROKE) * 2;

const DonutChart = ({ segments }) => {
  const arcs = useMemo(() => buildDonutSegments(segments, DONUT_RADIUS), [segments]);
  const center = DONUT_SIZE / 2;

  return (
    <Svg width={DONUT_SIZE} height={DONUT_SIZE} testID="category-donut">
      {/* Rotate -90° so the first slice starts at the top. */}
      <G rotation={-90} originX={center} originY={center}>
        <Circle
          cx={center}
          cy={center}
          r={DONUT_RADIUS}
          stroke="#e5e1d8"
          strokeWidth={DONUT_STROKE}
          fill="none"
        />
        {arcs.map((arc) => (
          <Circle
            key={arc.key}
            cx={center}
            cy={center}
            r={DONUT_RADIUS}
            stroke={arc.color}
            strokeWidth={DONUT_STROKE}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            fill="none"
          />
        ))}
      </G>
    </Svg>
  );
};

const TrendBars = ({ series }) => {
  const width = 320;
  const height = 180;
  const paddingBottom = 28;
  const paddingTop = 8;
  const chartHeight = height - paddingBottom - paddingTop;
  const bars = series.bars;
  const count = bars.length;
  const slot = count > 0 ? width / count : width;
  const barWidth = Math.max(4, Math.min(28, slot * 0.6));
  // With many buckets, only label a subset to avoid overlap.
  const labelEvery = Math.max(1, Math.ceil(count / 6));

  return (
    <Svg width={width} height={height} testID="trend-bars">
      <Line
        x1={0}
        y1={paddingTop + chartHeight}
        x2={width}
        y2={paddingTop + chartHeight}
        stroke="#d8d2c6"
        strokeWidth={1}
      />
      {bars.map((bar, index) => {
        const barHeight = Math.max(bar.totalHours > 0 ? 2 : 0, bar.heightRatio * chartHeight);
        const x = index * slot + (slot - barWidth) / 2;
        const y = paddingTop + chartHeight - barHeight;
        return (
          <G key={bar.periodStart}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={3}
              fill={TOTAL_TREND_COLOR}
            />
            {index % labelEvery === 0 && (
              <SvgText
                x={index * slot + slot / 2}
                y={height - 10}
                fontSize={10}
                fill="#6b6355"
                textAnchor="middle"
              >
                {bar.label}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
};

const StatCard = ({ title, value, caption }) => (
  <Card mode="outlined" style={styles.statCard}>
    <Card.Content>
      <Text variant="labelMedium" style={styles.statTitle}>
        {title}
      </Text>
      <Text variant="headlineSmall" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="bodySmall" style={styles.statCaption}>
        {caption}
      </Text>
    </Card.Content>
  </Card>
);

const AnalyticsScreen = () => {
  const [periodMode, setPeriodMode] = useState('month');
  const [granularity, setGranularity] = useState('day');
  const [activeDate, setActiveDate] = useState(() => dayjs());
  const [summary, setSummary] = useState({ totalHours: 0, categories: [] });
  const [timeSeries, setTimeSeries] = useState({ bucket: 'day', buckets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const range = useMemo(
    () => computeRangeState(periodMode, activeDate),
    [activeDate, periodMode]
  );

  const allowedBuckets = useMemo(() => getAllowedBuckets(periodMode), [periodMode]);
  const selectedBucket = allowedBuckets.includes(granularity)
    ? granularity
    : getAutoBucket(periodMode);

  // Reset the trend granularity to the sensible default whenever the period
  // changes (e.g. Year → month buckets) so a stale choice doesn't over-crowd.
  useEffect(() => {
    setGranularity(getAutoBucket(periodMode));
  }, [periodMode]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [categoryData, seriesData] = await Promise.all([
        services.fetchTimeByCategory({ from: range.from, to: range.to }),
        services.fetchTimeSeries({
          from: range.from,
          to: range.to,
          bucket: selectedBucket
        })
      ]);
      setSummary(categoryData || { totalHours: 0, categories: [] });
      setTimeSeries(seriesData || { bucket: selectedBucket, buckets: [] });
    } catch (err) {
      setError('Unable to load analytics right now.');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, selectedBucket]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const breakdown = useMemo(() => buildCategoryBreakdown(summary), [summary]);
  const trend = useMemo(() => buildTrendSeries(timeSeries), [timeSeries]);
  const topCategory = breakdown.segments[0] || null;

  const shift = (direction) =>
    setActiveDate((prev) => prev.add(direction, periodMode));

  const header = (
    <View style={styles.header}>
      <SegmentedButtons
        value={periodMode}
        onValueChange={setPeriodMode}
        buttons={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' }
        ]}
      />

      <View style={styles.navRow}>
        <Button mode="outlined" compact onPress={() => shift(-1)}>
          Prev
        </Button>
        <Button mode="outlined" compact onPress={() => setActiveDate(dayjs())}>
          Today
        </Button>
        <Button mode="outlined" compact onPress={() => shift(1)}>
          Next
        </Button>
      </View>

      <Text variant="titleMedium" style={styles.rangeLabel}>
        {range.label}
      </Text>

      {allowedBuckets.length > 1 && (
        <SegmentedButtons
          value={selectedBucket}
          onValueChange={setGranularity}
          buttons={allowedBuckets.map((bucket) => ({
            value: bucket,
            label: bucket.charAt(0).toUpperCase() + bucket.slice(1)
          }))}
        />
      )}
      <Divider style={styles.divider} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return <ScreenMessage message={error} actionLabel="Retry" onAction={load} />;
  }

  const hasData = breakdown.segments.length > 0 || trend.totalHours > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="analytics-scroll"
    >
      {header}

      <View style={styles.statRow}>
        <StatCard
          title="Tracked hours"
          value={formatHours(breakdown.totalHours)}
          caption="Total time from recorded entries."
        />
        <StatCard
          title="Top category"
          value={topCategory ? topCategory.title : 'None yet'}
          caption={
            topCategory
              ? `${formatHours(topCategory.hours)} (${topCategory.percentage}%)`
              : 'Log time to see a leader.'
          }
        />
      </View>

      {!hasData ? (
        <View style={styles.empty}>
          <Text variant="bodyMedium" style={styles.emptyText}>
            No tracked time in this range yet.
          </Text>
        </View>
      ) : (
        <>
          <Card mode="outlined" style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.chartTitle}>
                Time by category
              </Text>
              {breakdown.segments.length > 0 ? (
                <View style={styles.donutRow}>
                  <DonutChart segments={breakdown.segments} />
                  <View style={styles.legend}>
                    {breakdown.segments.map((segment) => (
                      <View key={segment.key} style={styles.legendRow}>
                        <View
                          style={[styles.legendDot, { backgroundColor: segment.color }]}
                        />
                        <Text variant="bodySmall" style={styles.legendText} numberOfLines={1}>
                          {segment.title}
                        </Text>
                        <Text variant="bodySmall" style={styles.legendValue}>
                          {formatHours(segment.hours)} · {segment.percentage}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text variant="bodySmall" style={styles.emptyText}>
                  No category breakdown for this range.
                </Text>
              )}
            </Card.Content>
          </Card>

          <Card mode="outlined" style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.chartTitle}>
                Trend ({selectedBucket})
              </Text>
              {trend.bars.length > 0 ? (
                <View style={styles.trendWrap}>
                  <TrendBars series={trend} />
                </View>
              ) : (
                <Text variant="bodySmall" style={styles.emptyText}>
                  No trend data for this range.
                </Text>
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 12, paddingBottom: 32, gap: 12 },
  header: { gap: 12 },
  navRow: { flexDirection: 'row', gap: 8 },
  rangeLabel: { textAlign: 'center' },
  divider: { marginTop: 4 },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1 },
  statTitle: { opacity: 0.6 },
  statValue: { marginTop: 4 },
  statCaption: { marginTop: 4, opacity: 0.6 },
  chartCard: { borderRadius: 12 },
  chartTitle: { marginBottom: 12 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1 },
  legendValue: { opacity: 0.7 },
  trendWrap: { alignItems: 'center' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { opacity: 0.6 }
});

export default AnalyticsScreen;
