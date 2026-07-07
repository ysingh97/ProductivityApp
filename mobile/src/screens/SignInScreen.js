import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  HelperText,
  Text
} from 'react-native-paper';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ALLOW_DEV_SIGN_IN, DEV_AUTH_TOKEN, GOOGLE_SIGN_IN_CONFIGURED } from '../config/env';
import GoogleSignInButton from './GoogleSignInButton';

const SignInScreen = () => {
  const { saveAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authenticate = useCallback(
    async (credential) => {
      setError('');
      setLoading(true);
      try {
        const { data } = await apiClient.post('/auth/google', { credential });
        await saveAuth(data.token, data.user);
      } catch (err) {
        setError('Sign-in failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [saveAuth]
  );

  return (
    <View style={styles.container}>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="labelLarge" style={styles.overline}>
            WELCOME BACK
          </Text>
          <Text variant="headlineMedium" style={styles.title}>
            Branchwork
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sign in with Google to keep your tasks, lists, and goals synced to your
            account.
          </Text>

          {GOOGLE_SIGN_IN_CONFIGURED ? (
            <GoogleSignInButton
              disabled={loading}
              onIdToken={authenticate}
              onError={setError}
            />
          ) : (
            <HelperText type="info" visible>
              Set EXPO_PUBLIC_GOOGLE_* client IDs to enable Google sign-in.
            </HelperText>
          )}

          {ALLOW_DEV_SIGN_IN && (
            <Button
              mode="outlined"
              icon="account-cog"
              style={styles.button}
              disabled={loading}
              onPress={() => authenticate(DEV_AUTH_TOKEN)}
            >
              Developer sign-in
            </Button>
          )}

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Signing you in...</Text>
            </View>
          )}

          {Boolean(error) && (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  card: {
    borderRadius: 20
  },
  overline: {
    letterSpacing: 1,
    opacity: 0.7
  },
  title: {
    marginTop: 4,
    marginBottom: 8,
    fontWeight: '700'
  },
  subtitle: {
    marginBottom: 20,
    opacity: 0.8
  },
  button: {
    marginTop: 12
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16
  },
  loadingText: {
    marginLeft: 8
  }
});

export default SignInScreen;
