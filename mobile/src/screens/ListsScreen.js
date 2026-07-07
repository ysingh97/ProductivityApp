import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import services from '../api/services';
import ScreenMessage from '../components/ScreenMessage';

const ListsScreen = () => {
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

  if (lists.length === 0) {
    return (
      <ScreenMessage
        message="No lists yet. Create one from the web app to see it here."
        actionLabel="Refresh"
        onAction={load}
      />
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={lists}
      keyExtractor={(item) => String(item._id)}
      renderItem={({ item }) => (
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium">{item.name || item.title || 'Untitled list'}</Text>
            {Boolean(item.description) && (
              <Text variant="bodySmall" style={styles.description}>
                {item.description}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load({ isRefresh: true })}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12 },
  card: { marginBottom: 10, borderRadius: 14 },
  description: { marginTop: 2, opacity: 0.8 }
});

export default ListsScreen;
