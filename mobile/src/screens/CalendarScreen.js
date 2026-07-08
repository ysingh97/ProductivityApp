import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import {
  ActivityIndicator,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  SegmentedButtons,
  Text
} from 'react-native-paper';
import {
  UNASSIGNED_ID,
  resolveTopLevelGoalIds,
  buildGoalColorMap,
  buildGoalCalendarItems,
  buildTaskCalendarItems,
  describeCalendarGroup
} from '@productivity/shared';
import services from '../api/services';
import ScreenMessage from '../components/ScreenMessage';

dayjs.extend(isBetween);

const formatDayKey = (value) => dayjs(value).format('YYYY-MM-DD');

const CalendarScreen = ({ navigation }) => {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('week');
  const [activeDate, setActiveDate] = useState(() => dayjs());
  const [selectedGoalIds, setSelectedGoalIds] = useState(() => new Set());
  const [hasUserFiltered, setHasUserFiltered] = useState(false);
  const [showGoals, setShowGoals] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [goalData, taskData] = await Promise.all([
        services.fetchGoals(),
        services.fetchTasks()
      ]);
      setGoals(Array.isArray(goalData) ? goalData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
    } catch (err) {
      setError('Unable to load calendar data right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const today = useMemo(() => dayjs(), []);

  const viewStart = useMemo(
    () =>
      viewMode === 'month'
        ? activeDate.startOf('month')
        : activeDate.startOf('week'),
    [activeDate, viewMode]
  );

  const viewEnd = useMemo(
    () =>
      viewMode === 'month' ? activeDate.endOf('month') : activeDate.endOf('week'),
    [activeDate, viewMode]
  );

  const rangeLabel = useMemo(() => {
    if (viewMode === 'month') {
      return activeDate.format('MMMM YYYY');
    }
    return `${viewStart.format('MMM D')} - ${viewEnd.format('MMM D, YYYY')}`;
  }, [activeDate, viewEnd, viewMode, viewStart]);

  const goalsById = useMemo(() => {
    const map = new Map();
    goals.forEach((goal) => map.set(String(goal._id), goal));
    return map;
  }, [goals]);

  const topLevelByGoalId = useMemo(() => resolveTopLevelGoalIds(goals), [goals]);

  const goalColorMap = useMemo(
    () => buildGoalColorMap(goals, topLevelByGoalId),
    [goals, topLevelByGoalId]
  );

  const goalsInRange = useMemo(
    () =>
      goals.filter(
        (goal) =>
          goal.targetCompletionDate &&
          dayjs(goal.targetCompletionDate).isBetween(viewStart, viewEnd, null, '[]')
      ),
    [goals, viewEnd, viewStart]
  );

  const tasksInRange = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.targetCompletionDate &&
          dayjs(task.targetCompletionDate).isBetween(viewStart, viewEnd, null, '[]')
      ),
    [tasks, viewEnd, viewStart]
  );

  const itemsForDisplay = useMemo(() => {
    const items = [];
    if (showGoals) {
      items.push(...buildGoalCalendarItems(goalsInRange, topLevelByGoalId));
    }
    if (showTasks) {
      items.push(...buildTaskCalendarItems(tasksInRange, topLevelByGoalId));
    }
    return items;
  }, [goalsInRange, showGoals, showTasks, tasksInRange, topLevelByGoalId]);

  const availableGoalIds = useMemo(() => {
    const ids = new Set();
    itemsForDisplay.forEach((item) => ids.add(item.topLevelId || UNASSIGNED_ID));
    return Array.from(ids);
  }, [itemsForDisplay]);

  const availableGoals = useMemo(
    () =>
      availableGoalIds
        .map((id) => describeCalendarGroup(id, goalsById))
        .sort((a, b) => {
          if (a.isPseudo) return 1;
          if (b.isPseudo) return -1;
          return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        }),
    [availableGoalIds, goalsById]
  );

  useEffect(() => {
    setSelectedGoalIds((prev) => {
      if (availableGoalIds.length === 0) {
        return new Set();
      }
      if (!hasUserFiltered) {
        return new Set(availableGoalIds);
      }
      const next = new Set();
      availableGoalIds.forEach((id) => {
        if (prev.has(id)) next.add(id);
      });
      return next;
    });
  }, [availableGoalIds, hasUserFiltered]);

  const sections = useMemo(() => {
    const byDay = new Map();
    itemsForDisplay
      .filter((item) => selectedGoalIds.has(item.topLevelId || UNASSIGNED_ID))
      .forEach((item) => {
        const key = formatDayKey(item.date);
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(item);
      });

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({
        key,
        title: dayjs(key).format('ddd, MMM D'),
        isToday: dayjs(key).isSame(today, 'day'),
        data: items.sort((a, b) => {
          if (a.type === b.type) {
            return (a.title || '').localeCompare(b.title || '', undefined, {
              sensitivity: 'base'
            });
          }
          return a.type === 'goal' ? -1 : 1;
        })
      }));
  }, [itemsForDisplay, selectedGoalIds, today]);

  const shift = (direction) =>
    setActiveDate((prev) =>
      viewMode === 'month'
        ? prev.add(direction, 'month')
        : prev.add(direction, 'week')
    );

  const toggleGoal = (goalId) => {
    setHasUserFiltered(true);
    setSelectedGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };

  const selectAll = () => {
    setHasUserFiltered(false);
    setSelectedGoalIds(new Set(availableGoalIds));
  };

  const clearAll = () => {
    setHasUserFiltered(true);
    setSelectedGoalIds(new Set());
  };

  const openItem = (item) => {
    if (item.type === 'goal') {
      navigation.navigate('GoalDetail', { goalId: item.id });
    } else {
      navigation.navigate('TaskDetail', { taskId: item.id });
    }
  };

  const header = (
    <View style={styles.header}>
      <SegmentedButtons
        value={viewMode}
        onValueChange={setViewMode}
        buttons={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' }
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
        {rangeLabel}
      </Text>

      <View style={styles.toggleRow}>
        <Checkbox.Item
          label="Goals"
          testID="toggle-goals"
          position="leading"
          status={showGoals ? 'checked' : 'unchecked'}
          onPress={() => setShowGoals((prev) => !prev)}
          style={styles.toggleItem}
        />
        <Checkbox.Item
          label="Tasks"
          testID="toggle-tasks"
          position="leading"
          status={showTasks ? 'checked' : 'unchecked'}
          onPress={() => setShowTasks((prev) => !prev)}
          style={styles.toggleItem}
        />
      </View>

      {availableGoals.length > 0 && (
        <View style={styles.filters}>
          <View style={styles.filterHeaderRow}>
            <Text variant="labelLarge">Goal trees</Text>
            <View style={styles.filterActions}>
              <Button compact onPress={selectAll}>
                All
              </Button>
              <Button compact onPress={clearAll}>
                Clear
              </Button>
            </View>
          </View>
          <View style={styles.chips}>
            {availableGoals.map((goal) => {
              const selected = selectedGoalIds.has(goal.id);
              const color = goalColorMap.get(goal.id) || '#64748b';
              return (
                <Chip
                  key={goal.id}
                  testID={`filter-chip-${goal.id}`}
                  compact
                  selected={selected}
                  showSelectedCheck={false}
                  onPress={() => toggleGoal(goal.id)}
                  style={[
                    styles.chip,
                    { borderColor: color },
                    selected && { backgroundColor: `${color}22` }
                  ]}
                  icon={() => <View style={[styles.dot, { backgroundColor: color }]} />}
                >
                  {goal.title}
                </Chip>
              );
            })}
          </View>
        </View>
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

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        initialNumToRender={50}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No goals or tasks due in this range.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text
            variant="labelLarge"
            style={[styles.sectionHeader, section.isToday && styles.sectionHeaderToday]}
          >
            {section.title}
            {section.isToday ? ' · Today' : ''}
          </Text>
        )}
        renderItem={({ item }) => {
          const color = goalColorMap.get(item.topLevelId) || '#64748b';
          return (
            <Card
              mode="outlined"
              testID={`calendar-item-${item.type}-${item.id}`}
              style={[styles.itemCard, { borderLeftColor: color }]}
              onPress={() => openItem(item)}
            >
              <Card.Content style={styles.itemContent}>
                <View style={styles.itemText}>
                  <Text variant="bodyMedium" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text variant="labelSmall" style={styles.itemMeta}>
                    {item.type === 'goal'
                      ? item.isTopLevel
                        ? 'Top-level goal'
                        : 'Goal'
                      : 'Task'}
                  </Text>
                </View>
                <Chip compact style={styles.typeChip}>
                  {item.type === 'goal' ? 'Goal' : 'Task'}
                </Chip>
              </Card.Content>
            </Card>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 12, paddingBottom: 32 },
  header: { gap: 12, marginBottom: 4 },
  navRow: { flexDirection: 'row', gap: 8 },
  rangeLabel: { textAlign: 'center' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-around' },
  toggleItem: { flex: 1, paddingHorizontal: 0 },
  filters: { gap: 8 },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  filterActions: { flexDirection: 'row' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  divider: { marginTop: 4 },
  sectionHeader: { marginTop: 16, marginBottom: 8, opacity: 0.7 },
  sectionHeaderToday: { opacity: 1, fontWeight: '700' },
  itemCard: { marginBottom: 8, borderLeftWidth: 4, borderRadius: 12 },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  itemText: { flex: 1 },
  itemMeta: { marginTop: 2, opacity: 0.6 },
  typeChip: { alignSelf: 'center' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { opacity: 0.6 }
});

export default CalendarScreen;
