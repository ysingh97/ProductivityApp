import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

const ScreenMessage = ({ message, actionLabel, onAction }) => (
  <View style={styles.container}>
    <Text variant="bodyLarge" style={styles.message}>
      {message}
    </Text>
    {Boolean(actionLabel) && Boolean(onAction) && (
      <Button mode="contained-tonal" onPress={() => onAction()} style={styles.action}>
        {actionLabel}
      </Button>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  message: {
    textAlign: 'center',
    opacity: 0.8
  },
  action: {
    marginTop: 16
  }
});

export default ScreenMessage;
