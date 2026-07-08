import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Card, FAB, Text } from 'react-native-paper';
import services from '../api/services';
import ScreenMessage from '../components/ScreenMessage';

const ListsScreen = ({ navigation }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ({ isRefresh } = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await services.fetchLists();
      setLists(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Could not load lists.');
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

  const openList = useCallback(
    (list) => navigation.navigate('ListDetail', { listId: list._id }),
    [navigation]
  );

  const openCreate = useCallback(
    () => navigation.navigate('ListForm'),
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
      {lists.length === 0 ? (
        <ScreenMessage
          message="No lists yet. Tap + to create your first list."
          actionLabel="Refresh"
          onAction={load}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={lists}
          keyExtractor={(item) => String(item._id)}
          renderItem={({ item }) => (
            <Card style={styles.card} mode="outlined">
              <Pressable onPress={() => openList(item)}>
                <Card.Content>
                  <Text variant="titleMedium">
                    {item.title || item.name || 'Untitled list'}
                  </Text>
                  {Boolean(item.description) && (
                    <Text variant="bodySmall" style={styles.description}>
                      {item.description}
                    </Text>
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
      <FAB icon="plus" style={styles.fab} onPress={openCreate} accessibilityLabel="Create list" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12 },
  card: { marginBottom: 10, borderRadius: 14 },
  description: { marginTop: 2, opacity: 0.8 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16
  }
});

export default ListsScreen;
