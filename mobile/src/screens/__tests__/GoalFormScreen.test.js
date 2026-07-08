/* eslint-env jest */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithPaper } from '../../test-utils';
import GoalFormScreen from '../GoalFormScreen';
import services from '../../api/services';

jest.mock('../../api/services', () => ({
  fetchGoals: jest.fn(async () => []),
  fetchCategories: jest.fn(async () => []),
  createGoal: jest.fn(async () => ({})),
  updateGoal: jest.fn(async () => ({}))
}));

const makeNavigation = () => ({ goBack: jest.fn(), navigate: jest.fn() });

describe('GoalFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a goal with the entered values', async () => {
    const navigation = makeNavigation();
    renderWithPaper(
      <GoalFormScreen navigation={navigation} route={{ params: { mode: 'create' } }} />
    );

    const submit = await screen.findByText('Create goal');
    fireEvent.changeText(screen.getByLabelText('Title'), 'Learn guitar');
    fireEvent.changeText(screen.getByLabelText('Estimated hours'), '40');
    fireEvent.press(submit);

    await waitFor(() => expect(services.createGoal).toHaveBeenCalledTimes(1));
    const payload = services.createGoal.mock.calls[0][0];
    expect(payload.title).toBe('Learn guitar');
    expect(payload.estimatedHours).toBe(40);
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });

  it('blocks submit and shows an error when the title is empty', async () => {
    const navigation = makeNavigation();
    renderWithPaper(
      <GoalFormScreen navigation={navigation} route={{ params: { mode: 'create' } }} />
    );

    const submit = await screen.findByText('Create goal');
    fireEvent.press(submit);

    expect(await screen.findByText('Title is required.')).toBeTruthy();
    expect(services.createGoal).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('updates an existing goal in edit mode', async () => {
    const navigation = makeNavigation();
    const goal = { _id: 'g1', title: 'Existing goal', estimatedHours: 10 };
    renderWithPaper(
      <GoalFormScreen navigation={navigation} route={{ params: { mode: 'edit', goal } }} />
    );

    const submit = await screen.findByText('Update goal');
    expect(screen.getByDisplayValue('Existing goal')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Estimated hours'), '20');
    fireEvent.press(submit);

    await waitFor(() => expect(services.updateGoal).toHaveBeenCalledTimes(1));
    expect(services.updateGoal.mock.calls[0][0]).toBe('g1');
    expect(services.updateGoal.mock.calls[0][1].estimatedHours).toBe(20);
  });
});
