import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import {
  ActivityIndicator,
  Button,
  HelperText,
  TextInput
} from 'react-native-paper';
import {
  getTaskEstimateHoursError,
  getTaskTargetCompletionDateError,
  getTaskTargetCompletionDateMinDateTime
} from '@productivity/shared';
import services from '../api/services';
import DateTimeField from '../components/DateTimeField';
import SelectField from '../components/SelectField';

const getCategoryTitle = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.title || '';
};

const TaskFormScreen = ({ navigation, route }) => {
  const task = route.params?.task || null;
  const isEditing = route.params?.mode === 'edit' && Boolean(task);

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [category, setCategory] = useState(getCategoryTitle(task?.category));
  const [estimatedCompletionTime, setEstimatedCompletionTime] = useState(
    task?.estimatedCompletionTime != null ? String(task.estimatedCompletionTime) : '0'
  );
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    task?.targetCompletionDate ? dayjs(task.targetCompletionDate) : null
  );
  const [listId, setListId] = useState(
    task?.listId || task?.list?._id || route.params?.initialListId || null
  );
  const [parentGoalId, setParentGoalId] = useState(
    task?.parentGoalId || task?.parentGoal?._id || null
  );

  const [lists, setLists] = useState([]);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const originalTargetCompletionDate = task?.targetCompletionDate
    ? dayjs(task.targetCompletionDate)
    : null;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [listData, goalData, categoryData] = await Promise.all([
          services.fetchLists(),
          services.fetchGoals(),
          services.fetchCategories()
        ]);
        if (!active) return;
        setLists(Array.isArray(listData) ? listData : []);
        setGoals(Array.isArray(goalData) ? goalData : []);
        setCategories(Array.isArray(categoryData) ? categoryData : []);
      } catch (err) {
        if (active) setError('Failed to load form options.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const listOptions = useMemo(
    () => lists.map((list) => ({ value: list._id, label: list.title })),
    [lists]
  );
  const goalOptions = useMemo(
    () =>
      goals.map((goal) => ({
        value: goal._id,
        label: goal.title,
        categoryTitle: getCategoryTitle(goal.category),
        targetCompletionDate: goal.targetCompletionDate || null
      })),
    [goals]
  );

  const selectedGoal = goalOptions.find((option) => option.value === parentGoalId) || null;

  useEffect(() => {
    if (selectedGoal) {
      setCategory(selectedGoal.categoryTitle || '');
    }
  }, [selectedGoal]);

  const parentDeadline = selectedGoal?.targetCompletionDate
    ? dayjs(selectedGoal.targetCompletionDate)
    : null;

  const now = dayjs();
  const minimumTargetDate = getTaskTargetCompletionDateMinDateTime({
    now,
    originalTargetCompletionDate,
    allowUnchangedPastDate: isEditing
  });

  const handleSubmit = useCallback(async () => {
    setError('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    const estimateError = getTaskEstimateHoursError(estimatedCompletionTime);
    if (estimateError) {
      setError(estimateError);
      return;
    }
    const dateError = getTaskTargetCompletionDateError({
      targetCompletionDate,
      now,
      parentDeadline,
      originalTargetCompletionDate,
      allowUnchangedPastDate: isEditing
    });
    if (dateError) {
      setError(dateError);
      return;
    }

    const payload = {
      title: title.trim(),
      description,
      listId: listId || undefined,
      parentGoalId: parentGoalId || undefined,
      estimatedCompletionTime: Number(estimatedCompletionTime) || 0,
      targetCompletionDate: targetCompletionDate ? targetCompletionDate.toDate() : null
    };
    if (!parentGoalId) {
      payload.category = category;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await services.updateTask(task._id, payload);
      } else {
        await services.createTask(payload);
      }
      navigation.goBack();
    } catch (err) {
      setError('Could not save the task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    description,
    category,
    estimatedCompletionTime,
    targetCompletionDate,
    listId,
    parentGoalId,
    parentDeadline,
    originalTargetCompletionDate,
    isEditing,
    now,
    task,
    navigation
  ]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

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
      />

      <TextInput
        label="Category"
        value={category}
        onChangeText={setCategory}
        mode="outlined"
        style={styles.input}
        disabled={Boolean(selectedGoal)}
      />
      {Boolean(selectedGoal) && (
        <HelperText type="info" visible>
          Inherited from the selected parent goal.
        </HelperText>
      )}

      <SelectField
        label="List"
        value={listId}
        options={listOptions}
        onChange={setListId}
        placeholder="Optional — add to a list"
      />

      <SelectField
        label="Parent goal"
        value={parentGoalId}
        options={goalOptions.map(({ value, label }) => ({ value, label }))}
        onChange={setParentGoalId}
        placeholder="Optional — link into a goal"
      />

      <TextInput
        label="Estimated hours"
        accessibilityLabel="Estimated hours"
        value={String(estimatedCompletionTime)}
        onChangeText={setEstimatedCompletionTime}
        keyboardType="decimal-pad"
        mode="outlined"
        style={styles.input}
        right={<TextInput.Affix text="hrs" />}
      />

      <DateTimeField
        label="Target completion date"
        value={targetCompletionDate}
        onChange={setTargetCompletionDate}
        minimumDate={minimumTargetDate}
        helperText={
          parentDeadline
            ? `Must be on or before ${parentDeadline.format('MMM D, YYYY h:mm A')}.`
            : 'Optional. Choose a future target date.'
        }
      />

      <TextInput
        label="Description"
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
        {isEditing ? 'Update task' : 'Create task'}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
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

export default TaskFormScreen;
