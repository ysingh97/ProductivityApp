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
  Portal,
  Text
} from 'react-native-paper';
import services from '../api/services';
import ScreenMessage from '../components/ScreenMessage';

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

const TaskDetailScreen = ({ navigation, route }) => {
  const taskId = route.params?.taskId;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await services.fetchTaskById(taskId);
      setTask(data);
    } catch (err) {
      setError('Could not load this task.');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await services.deleteTask(taskId);
      setConfirmVisible(false);
      navigation.goBack();
    } catch (err) {
      setDeleting(false);
      setConfirmVisible(false);
      setError('Could not delete this task.');
    }
  }, [taskId, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !task) {
    return (
      <ScreenMessage
        message={error || 'Task not found.'}
        actionLabel="Retry"
        onAction={load}
      />
    );
  }

  const categoryTitle =
    task.category && typeof task.category === 'object'
      ? task.category.title
      : task.category;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            {task.title}
          </Text>
          <Chip
            compact
            style={styles.statusChip}
            icon={task.isComplete ? 'check-circle' : 'progress-clock'}
          >
            {task.isComplete ? 'Completed' : 'In progress'}
          </Chip>

          {Boolean(task.description) && (
            <Text variant="bodyMedium" style={styles.description}>
              {task.description}
            </Text>
          )}

          <Divider style={styles.divider} />

          {Boolean(categoryTitle) && (
            <DetailRow label="Category" value={categoryTitle} />
          )}
          <DetailRow
            label="Estimated"
            value={`${task.estimatedCompletionTime || 0} hrs`}
          />
          {typeof task.timeSpent === 'number' && (
            <DetailRow label="Logged" value={`${task.timeSpent} hrs`} />
          )}
          <DetailRow
            label="Target date"
            value={
              task.targetCompletionDate
                ? dayjs(task.targetCompletionDate).format('MMM D, YYYY h:mm A')
                : 'None'
            }
          />
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon="pencil"
        style={styles.actionButton}
        onPress={() => navigation.navigate('TaskForm', { mode: 'edit', task })}
      >
        Edit task
      </Button>
      <Button
        mode="outlined"
        icon="delete"
        textColor="#b3261e"
        style={styles.actionButton}
        onPress={() => setConfirmVisible(true)}
      >
        Delete task
      </Button>

      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Delete task?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              "{task.title}" will be permanently removed. This cannot be undone.
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
  screen: {
    flex: 1
  },
  content: {
    padding: 16
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    borderRadius: 16
  },
  title: {
    fontWeight: '700'
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 10
  },
  description: {
    marginTop: 14,
    opacity: 0.85
  },
  divider: {
    marginVertical: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  detailLabel: {
    opacity: 0.6
  },
  detailValue: {
    fontWeight: '600'
  },
  actionButton: {
    marginTop: 14
  }
});

export default TaskDetailScreen;
