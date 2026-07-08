import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { getListTitleError } from '@productivity/shared';
import services from '../api/services';

const ListFormScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    setError('');
    const titleError = getListTitleError(title);
    if (titleError) {
      setError(titleError);
      return;
    }

    setSubmitting(true);
    try {
      await services.createList({
        title: title.trim(),
        description: description.trim()
      });
      navigation.goBack();
    } catch (err) {
      setError('Could not create the list. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [title, description, navigation]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TextInput
        label="Title"
        accessibilityLabel="Title"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        autoFocus
      />

      <TextInput
        label="Description"
        accessibilityLabel="Description"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={[styles.input, styles.multiline]}
      />

      {Boolean(error) && (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        style={styles.submit}
      >
        Create list
      </Button>
    </ScrollView>
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
  input: {
    marginTop: 8
  },
  multiline: {
    minHeight: 100
  },
  submit: {
    marginTop: 20
  }
});

export default ListFormScreen;
