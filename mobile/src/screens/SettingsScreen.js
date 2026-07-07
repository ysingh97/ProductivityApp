import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Text } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';

const initialsOf = (name) =>
  String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

const SettingsScreen = () => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.profileRow}>
          <Avatar.Text size={48} label={initialsOf(user?.name)} />
          <View style={styles.profileText}>
            <Text variant="titleMedium">{user?.name || 'Signed in'}</Text>
            {Boolean(user?.email) && (
              <Text variant="bodySmall" style={styles.email}>
                {user.email}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon="logout"
        style={styles.signOut}
        onPress={() => logout()}
      >
        Sign out
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderRadius: 14 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileText: { marginLeft: 12, flex: 1 },
  email: { opacity: 0.7, marginTop: 2 },
  signOut: { marginTop: 20 }
});

export default SettingsScreen;
