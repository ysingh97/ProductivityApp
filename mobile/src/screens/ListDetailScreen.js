import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Button, Card, Chip, Text } from 'react-native-paper';
import services from '../api/services';
import ScreenMessage from '../components/ScreenMessage';

const formatHours = (value) => {
  const hours = Number(value) || 0;
  return hours.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const ListDetailScreen = ({ navigation, route }) => {
  const listId = route.params?.listId;
  const [list, setList] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lists, listTasks] = await Promise.all([
        services.fetchLists(),
        services.fetchTasksByListId(listId)
      ]);
      const found = Array.isArray(lists)
        ? lists.find((item) => String(item._id) === String(listId))
        : null;
      setList(found || null);
      setTasks(Array.isArray(listTasks) ? listTasks : []);
    } catch (err) {
      setError('Could not load this list.');
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalTimeSpent = useMemo(
    () => tasks.reduce((sum, task) => sum + (Number(task.timeSpent) || 0), 0),
    [tasks]
  );
  const totalEstimatedTime = useMemo(
    () => tasks.reduce((sum, task) => sum + (Number(task.estimatedCompletionTime) || 0), 0),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => Boolean(task.isComplete)).length,
    [tasks]
  );

  const openTask = useCallback(
    (task) => navigation.navigate('TaskDetail', { taskId: task._id }),
    [navigation]
  );

  const addTask = useCallback(
    () => navigation.navigate('TaskForm', { mode: 'create', initialListId: listId }),
    [navigation, listId]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !list) {
    return (
      <ScreenMessage
        message={error || 'List not found.'}
        actionLabel="Retry"
        onAction={load}
      />
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={tasks}
      keyExtractor={(item) => String(item._id)}
      ListHeaderComponent={
        <View>
          <Card mode="outlined" style={styles.headerCard}>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.title}>
                {list.title || list.name || 'Untitled list'}
              </Text>
              {Boolean(list.description) && (
                <Text variant="bodyMedium" style={styles.description}>
                  {list.description}
                </Text>
              )}
              <View style={styles.metaRow}>
                <Chip compact style={styles.chip} icon="format-list-checks">
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                </Chip>
                <Chip compact style={styles.chip} icon="check-circle-outline">
                  {completedTasks} done
                </Chip>
                <Chip compact style={styles.chip} icon="timer-sand">
                  Est {formatHours(totalEstimatedTime)}h
                </Chip>
                <Chip compact style={styles.chip} icon="clock-outline">
                  Logged {formatHours(totalTimeSpent)}h
                </Chip>
              </View>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            icon="plus"
            onPress={addTask}
            style={styles.addButton}
          >
            Add task to list
          </Button>

          <Text variant="titleMedium" style={styles.sectionHeading}>
            Tasks
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Card style={styles.taskCard} mode="outlined">
          <Pressable onPress={() => openTask(item)}>
            <Card.Content>
              <Text
                variant="titleMedium"
                style={item.isComplete ? styles.completedTitle : null}
              >
                {item.title}
              </Text>
              {Boolean(item.description) && (
                <Text variant="bodySmall" numberOfLines={2} style={styles.taskDescription}>
                  {item.description}
                </Text>
              )}
            </Card.Content>
          </Pressable>
        </Card>
      )}
      ListEmptyComponent={
        <Text variant="bodyMedium" style={styles.emptyTasks}>
          No tasks in this list yet. Tap "Add task to list" to create one.
        </Text>
      }
    />
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerCard: {
    borderRadius: 16
  },
  title: {
    fontWeight: '700'
  },
  description: {
    marginTop: 10,
    opacity: 0.85
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14
  },
  chip: {
    marginRight: 6,
    marginTop: 6
  },
  addButton: {
    marginTop: 16
  },
  sectionHeading: {
    marginTop: 22,
    marginBottom: 6,
    fontWeight: '700'
  },
  taskCard: {
    marginTop: 10,
    borderRadius: 14
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.6
  },
  taskDescription: {
    marginTop: 2,
    opacity: 0.8
  },
  emptyTasks: {
    marginTop: 12,
    opacity: 0.7
  }
});

export default ListDetailScreen;
