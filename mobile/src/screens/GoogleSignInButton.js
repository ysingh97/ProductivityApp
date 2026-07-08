import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Button } from 'react-native-paper';
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID
} from '../config/env';

WebBrowser.maybeCompleteAuthSession();

// Isolated so the Google auth hook (which throws when the current platform's
// client id is missing) is only ever mounted when Google sign-in is actually
// configured for this platform. The parent gates rendering on that.
const GoogleSignInButton = ({ disabled, onIdToken, onError }) => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      if (idToken) {
        onIdToken(idToken);
      } else {
        onError('Google did not return an ID token.');
      }
    } else if (response?.type === 'error') {
      onError('Google sign-in was cancelled or failed.');
    }
  }, [response, onIdToken, onError]);

  return (
    <Button
      mode="contained"
      icon="google"
      style={styles.button}
      disabled={!request || disabled}
      onPress={() => promptAsync()}
    >
      Sign in with Google
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: 12
  }
});

export default GoogleSignInButton;
