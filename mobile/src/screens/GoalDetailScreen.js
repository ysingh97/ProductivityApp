import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  List,
  Portal,
  ProgressBar,
  Text
} from 'react-native-paper';
import services from '../api/services';
import ScreenMessage from '../components/ScreenMessage';

const formatHours = (value) => {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return String(rounded);
};

const getCategoryTitle = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.title || '';
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text variant="labelMedium" style={styles.detailLabel}>
      {label}
    </Text>
    <Text variant="bodyMedium" style={styles.detailValue}>
      {value}
    </Text>
  </View>
);

const GoalDetailScreen = ({ navigation, route }) => {
  const goalId = route.params?.goalId;
  const [goal, setGoal] = useState(null);
  const [subGoals, setSubGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [goalData, allGoals, allTasks] = await Promise.all([
        services.fetchGoalById(goalId),
        services.fetchGoals(),
        services.fetchTasks()
      ]);
      setGoal(goalData);
      const goals = Array.isArray(allGoals) ? allGoals : [];
      const taskList = Array.isArray(allTasks) ? allTasks : [];
      setSubGoals(goals.filter((g) => String(g.parentGoalId) === String(goalId)));
      setTasks(taskList.filter((t) => String(t.parentGoalId) === String(goalId)));
    } catch (err) {
      setError('Could not load this goal.');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggleComplete = useCallback(async () => {
    if (!goal) return;
    setStatusUpdating(true);
    try {
      const updated = await services.updateGoal(goal._id, {
        isComplete: !goal.isComplete
      });
      setGoal(updated);
    } catch (err) {
      setError('Could not update completion status.');
    } finally {
      setStatusUpdating(false);
    }
  }, [goal]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await services.deleteGoal(goalId);
      setConfirmVisible(false);
      navigation.goBack();
    } catch (err) {
      setDeleting(false);
      setConfirmVisible(false);
      setError('Could not delete this goal.');
    }
  }, [goalId, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !goal) {
    return (
      <ScreenMessage
        message={error || 'Goal not found.'}
        actionLabel="Retry"
        onAction={load}
      />
    );
  }

  const categoryTitle = getCategoryTitle(goal.category);
  const estimatedHours = Number(goal.estimatedHours) || 0;
  const timeSpent = Number(goal.timeSpent) || 0;
  const progress = estimatedHours > 0 ? Math.min(timeSpent / estimatedHours, 1) : 0;
  const dueDate = goal.targetCompletionDate ? dayjs(goal.targetCompletionDate) : null;
  const isOverdue = Boolean(dueDate && dueDate.isBefore(dayjs(), 'day') && !goal.isComplete);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            {goal.title}
          </Text>
          <View style={styles.chipRow}>
            <Chip
              compact
              icon={goal.isComplete ? 'check-circle' : 'progress-clock'}
              style={styles.statusChip}
            >
              {goal.isComplete ? 'Complete' : 'In progress'}
            </Chip>
            {isOverdue && (
              <Chip compact icon="alert" style={styles.overdueChip}>
                Overdue
              </Chip>
            )}
          </View>

          {Boolean(goal.description) && (
            <Text variant="bodyMedium" style={styles.description}>
              {goal.description}
            </Text>
          )}

          <Divider style={styles.divider} />

          {Boolean(categoryTitle) && (
            <DetailRow label="Category" value={categoryTitle} />
          )}
          <DetailRow
            label="Target date"
            value={dueDate ? dueDate.format('MMM D, YYYY h:mm A') : 'None'}
          />

          <View style={styles.progressBlock}>
            <Text variant="labelMedium" style={styles.detailLabel}>
              {estimatedHours > 0
                ? `Progress: ${formatHours(timeSpent)} / ${formatHours(estimatedHours)} hrs`
                : 'Add an estimate to track remaining time.'}
            </Text>
            {estimatedHours > 0 && (
              <ProgressBar progress={progress} style={styles.progressBar} />
            )}
          </View>
        </Card.Content>
      </Card>

      {subGoals.length > 0 && (
        <Card mode="outlined" style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Sub-goals
            </Text>
            {subGoals.map((sub) => (
              <List.Item
                key={String(sub._id)}
                title={sub.title}
                titleStyle={sub.isComplete ? styles.completedText : null}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={sub.isComplete ? 'check-circle' : 'target'}
                  />
                )}
                onPress={() =>
                  navigation.push('GoalDetail', { goalId: sub._id })
                }
              />
            ))}
          </Card.Content>
        </Card>
      )}

      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Linked tasks
          </Text>
          {tasks.length === 0 ? (
            <Text variant="bodySmall" style={styles.emptyText}>
              No tasks linked to this goal yet.
            </Text>
          ) : (
            tasks.map((task) => (
              <List.Item
                key={String(task._id)}
                title={task.title}
                titleStyle={task.isComplete ? styles.completedText : null}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={task.isComplete ? 'check-circle' : 'checkbox-blank-circle-outline'}
                  />
                )}
                onPress={() => navigation.navigate('TaskDetail', { taskId: task._id })}
              />
            ))
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon={goal.isComplete ? 'undo' : 'check'}
        style={styles.actionButton}
        loading={statusUpdating}
        disabled={statusUpdating}
        onPress={handleToggleComplete}
      >
        {goal.isComplete ? 'Mark as in progress' : 'Mark as complete'}
      </Button>
      <Button
        mode="outlined"
        icon="plus"
        style={styles.actionButton}
        onPress={() =>
          navigation.navigate('GoalForm', { initialParentGoalId: goal._id })
        }
      >
        Add sub-goal
      </Button>
      <Button
        mode="outlined"
        icon="pencil"
        style={styles.actionButton}
        onPress={() => navigation.navigate('GoalForm', { mode: 'edit', goal })}
      >
        Edit goal
      </Button>
      <Button
        mode="outlined"
        icon="delete"
        textColor="#b3261e"
        style={styles.actionButton}
        onPress={() => setConfirmVisible(true)}
      >
        Delete goal
      </Button>

      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Delete goal?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              "{goal.title}" will be permanently removed. Sub-goals and tasks will be
              unlinked, not deleted. This cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button onPress={handleDelete} loading={deleting} textColor="#b3261e">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 16, marginBottom: 14 },
  title: { fontWeight: '700' },
  chipRow: { flexDirection: 'row', marginTop: 10 },
  statusChip: { alignSelf: 'flex-start' },
  overdueChip: { alignSelf: 'flex-start', marginLeft: 8 },
  description: { marginTop: 14, opacity: 0.85 },
  divider: { marginVertical: 16 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  detailLabel: { opacity: 0.6 },
  detailValue: { fontWeight: '600' },
  progressBlock: { marginTop: 6 },
  progressBar: { marginTop: 8, height: 8, borderRadius: 999 },
  sectionTitle: { fontWeight: '700', marginBottom: 4 },
  completedText: { textDecorationLine: 'line-through', opacity: 0.6 },
  emptyText: { opacity: 0.7, marginTop: 4 },
  actionButton: { marginTop: 12 }
});

export default GoalDetailScreen;
