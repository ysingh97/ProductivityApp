import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Card,
  Checkbox,
  Chip,
  FAB,
  Text
} from 'react-native-paper';
import services from '../api/services';
import ScreenMessage from '../components/ScreenMessage';

const TaskItem = ({ task, onToggle, onPress }) => (
  <Card style={styles.card} mode="outlined">
    <Pressable onPress={() => onPress(task)}>
      <Card.Content style={styles.cardContent}>
        <Checkbox
          status={task.isComplete ? 'checked' : 'unchecked'}
          onPress={() => onToggle(task)}
        />
        <View style={styles.taskText}>
          <Text
            variant="titleMedium"
            style={task.isComplete ? styles.completedTitle : null}
          >
            {task.title}
          </Text>
          {Boolean(task.description) && (
            <Text variant="bodySmall" numberOfLines={2} style={styles.description}>
              {task.description}
            </Text>
          )}
          <View style={styles.metaRow}>
          {typeof task.estimatedCompletionTime === 'number' &&
            task.estimatedCompletionTime > 0 && (
              <Chip compact style={styles.chip}>
                Est {task.estimatedCompletionTime}h
              </Chip>
            )}
          {typeof task.timeSpent === 'number' && task.timeSpent > 0 && (
              <Chip compact style={styles.chip}>
                Logged {task.timeSpent}h
              </Chip>
            )}
          </View>
        </View>
      </Card.Content>
    </Pressable>
  </Card>
);

const BoardScreen = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ({ isRefresh } = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await services.fetchTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Could not load tasks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggle = useCallback(async (task) => {
    const nextComplete = !task.isComplete;
    setTasks((prev) =>
      prev.map((item) =>
        item._id === task._id ? { ...item, isComplete: nextComplete } : item
      )
    );
    try {
      await services.updateTask(task._id, { isComplete: nextComplete });
    } catch (err) {
      setTasks((prev) =>
        prev.map((item) =>
          item._id === task._id ? { ...item, isComplete: task.isComplete } : item
        )
      );
    }
  }, []);

  const openTask = useCallback(
    (task) => navigation.navigate('TaskDetail', { taskId: task._id }),
    [navigation]
  );

  const openCreate = useCallback(
    () => navigation.navigate('TaskForm', { mode: 'create' }),
    [navigation]
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
      {tasks.length === 0 ? (
        <ScreenMessage
          message="No tasks yet. Tap + to create your first task."
          actionLabel="Refresh"
          onAction={load}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={tasks}
          keyExtractor={(item) => String(item._id)}
          renderItem={({ item }) => (
            <TaskItem task={item} onToggle={handleToggle} onPress={openTask} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ isRefresh: true })}
            />
          }
        />
      )}
      <FAB icon="plus" style={styles.fab} onPress={openCreate} accessibilityLabel="Create task" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    padding: 12
  },
  card: {
    marginBottom: 10,
    borderRadius: 14
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  taskText: {
    flex: 1,
    marginLeft: 8
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.6
  },
  description: {
    marginTop: 2,
    opacity: 0.8
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6
  },
  chip: {
    marginRight: 6,
    marginTop: 4
  }
});

export default BoardScreen;
