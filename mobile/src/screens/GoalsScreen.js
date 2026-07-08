import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Card, Chip, FAB, Text } from 'react-native-paper';
import services from '../api/services';
import ScreenMessage from '../components/ScreenMessage';

const GoalsScreen = ({ navigation }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ({ isRefresh } = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await services.fetchGoals();
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Could not load goals.');
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

  const openGoal = useCallback(
    (goal) => navigation.navigate('GoalDetail', { goalId: goal._id }),
    [navigation]
  );

  const openCreate = useCallback(
    () => navigation.navigate('GoalForm', { mode: 'create' }),
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
      {goals.length === 0 ? (
        <ScreenMessage
          message="No goals yet. Tap + to create your first goal."
          actionLabel="Refresh"
          onAction={load}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={goals}
          keyExtractor={(item) => String(item._id)}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Pressable onPress={() => openGoal(item)}>
                <Card.Content>
                  <Text
                    variant="titleMedium"
                    style={item.isComplete ? styles.completedTitle : null}
                  >
                    {item.title}
                  </Text>
                  {Boolean(item.description) && (
                    <Text variant="bodySmall" numberOfLines={2} style={styles.description}>
                      {item.description}
                    </Text>
                  )}
                  {typeof item.estimatedHours === 'number' && item.estimatedHours > 0 && (
                    <Chip compact style={styles.chip}>
                      Est {item.estimatedHours}h
                    </Chip>
                  )}
                </Card.Content>
              </Pressable>
            </Card>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ isRefresh: true })}
            />
          }
        />
      )}
      <FAB icon="plus" style={styles.fab} onPress={openCreate} accessibilityLabel="Create goal" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12 },
  card: { marginBottom: 10, borderRadius: 14 },
  completedTitle: { textDecorationLine: 'line-through', opacity: 0.6 },
  description: { marginTop: 2, opacity: 0.8 },
  chip: { alignSelf: 'flex-start', marginTop: 8 }
});

export default GoalsScreen;
