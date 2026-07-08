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
  getGoalEstimateHoursError,
  getGoalTargetCompletionDateError,
  getGoalTargetCompletionDateMinDateTime,
  parseGoalEstimateHours,
  filterEligibleParentGoals,
  getBlockedParentGoalIds,
  mergeGoalsById
} from '@productivity/shared';
import services from '../api/services';
import DateTimeField from '../components/DateTimeField';
import SelectField from '../components/SelectField';

const getCategoryTitle = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.title || '';
};

const GoalFormScreen = ({ navigation, route }) => {
  const goal = route.params?.goal || null;
  const isEditing = route.params?.mode === 'edit' && Boolean(goal);

  const [title, setTitle] = useState(goal?.title || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [category, setCategory] = useState(getCategoryTitle(goal?.category));
  const [estimatedHours, setEstimatedHours] = useState(
    goal?.estimatedHours != null ? String(goal.estimatedHours) : '0'
  );
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    goal?.targetCompletionDate ? dayjs(goal.targetCompletionDate) : null
  );
  const [parentGoalId, setParentGoalId] = useState(
    goal?.parentGoalId || route.params?.initialParentGoalId || null
  );

  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const originalTargetCompletionDate = goal?.targetCompletionDate
    ? dayjs(goal.targetCompletionDate)
    : null;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [goalData, categoryData] = await Promise.all([
          services.fetchGoals(),
          services.fetchCategories()
        ]);
        if (!active) return;
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

  const allKnownGoals = useMemo(() => mergeGoalsById(goals, goal), [goals, goal]);
  const blockedParentGoalIds = useMemo(
    () => getBlockedParentGoalIds(allKnownGoals, goal?._id),
    [allKnownGoals, goal]
  );
  const goalOptions = useMemo(
    () =>
      filterEligibleParentGoals(allKnownGoals, goal?._id).map((option) => ({
        value: option._id,
        label: option.title,
        categoryTitle: getCategoryTitle(option.category),
        targetCompletionDate: option.targetCompletionDate || null
      })),
    [allKnownGoals, goal]
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
  const minimumTargetDate = getGoalTargetCompletionDateMinDateTime({
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
    if (parentGoalId && blockedParentGoalIds.has(String(parentGoalId))) {
      setError('A goal cannot be moved under one of its descendants.');
      return;
    }
    const dateError = getGoalTargetCompletionDateError({
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
    const estimateError = getGoalEstimateHoursError(estimatedHours);
    if (estimateError) {
      setError(estimateError);
      return;
    }

    const payload = {
      title: title.trim(),
      description,
      estimatedHours: parseGoalEstimateHours(estimatedHours),
      parentGoalId: parentGoalId || null,
      targetCompletionDate: targetCompletionDate ? targetCompletionDate.toDate() : null
    };
    if (!parentGoalId) {
      payload.category = category;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await services.updateGoal(goal._id, payload);
      } else {
        await services.createGoal(payload);
      }
      navigation.goBack();
    } catch (err) {
      setError('Could not save the goal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    description,
    category,
    estimatedHours,
    targetCompletionDate,
    parentGoalId,
    blockedParentGoalIds,
    parentDeadline,
    originalTargetCompletionDate,
    isEditing,
    now,
    goal,
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
        label="Parent goal"
        value={parentGoalId}
        options={goalOptions.map(({ value, label }) => ({ value, label }))}
        onChange={setParentGoalId}
        placeholder="Optional — make this a sub-goal"
      />

      <TextInput
        label="Estimated hours"
        accessibilityLabel="Estimated hours"
        value={String(estimatedHours)}
        onChangeText={setEstimatedHours}
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
        {isEditing ? 'Update goal' : 'Create goal'}
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

export default GoalFormScreen;
