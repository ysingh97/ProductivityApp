/* eslint-env jest */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithPaper } from '../../test-utils';
import GoalDetailScreen from '../GoalDetailScreen';
import services from '../../api/services';

jest.mock('../../api/services', () => ({
  fetchGoalById: jest.fn(),
  fetchGoals: jest.fn(async () => []),
  fetchTasks: jest.fn(async () => []),
  updateGoal: jest.fn(),
  deleteGoal: jest.fn(async () => ({}))
}));

const goal = {
  _id: 'goal-1',
  title: 'Run a marathon',
  description: 'Train consistently',
  category: { title: 'Fitness' },
  estimatedHours: 100,
  timeSpent: 25,
  isComplete: false,
  targetCompletionDate: '2099-12-31T00:00:00.000Z'
};

const makeNavigation = () => ({
  goBack: jest.fn(),
  navigate: jest.fn(),
  push: jest.fn()
});

describe('GoalDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    services.fetchGoalById.mockResolvedValue(goal);
    services.updateGoal.mockResolvedValue({ ...goal, isComplete: true });
  });

  it('renders the goal details, progress, and linked tasks', async () => {
    const navigation = makeNavigation();
    services.fetchTasks.mockResolvedValueOnce([
      { _id: 't1', title: 'Long run', parentGoalId: 'goal-1' },
      { _id: 't2', title: 'Unrelated', parentGoalId: 'other' }
    ]);
    services.fetchGoals.mockResolvedValueOnce([
      { _id: 'sub1', title: 'Buy shoes', parentGoalId: 'goal-1' }
    ]);

    renderWithPaper(
      <GoalDetailScreen navigation={navigation} route={{ params: { goalId: 'goal-1' } }} />
    );

    expect(await screen.findByText('Run a marathon')).toBeTruthy();
    expect(screen.getByText('Fitness')).toBeTruthy();
    expect(screen.getByText('Progress: 25 / 100 hrs')).toBeTruthy();
    expect(screen.getByText('Long run')).toBeTruthy();
    expect(screen.getByText('Buy shoes')).toBeTruthy();
    expect(screen.queryByText('Unrelated')).toBeNull();
  });

  it('toggles completion via updateGoal', async () => {
    const navigation = makeNavigation();
    renderWithPaper(
      <GoalDetailScreen navigation={navigation} route={{ params: { goalId: 'goal-1' } }} />
    );

    const toggle = await screen.findByText('Mark as complete');
    fireEvent.press(toggle);

    await waitFor(() => expect(services.updateGoal).toHaveBeenCalledWith('goal-1', {
      isComplete: true
    }));
  });

  it('navigates to the edit form', async () => {
    const navigation = makeNavigation();
    renderWithPaper(
      <GoalDetailScreen navigation={navigation} route={{ params: { goalId: 'goal-1' } }} />
    );

    fireEvent.press(await screen.findByText('Edit goal'));
    expect(navigation.navigate).toHaveBeenCalledWith('GoalForm', { mode: 'edit', goal });
  });

  it('shows an error state when loading fails', async () => {
    const navigation = makeNavigation();
    services.fetchGoalById.mockRejectedValueOnce(new Error('boom'));

    renderWithPaper(
      <GoalDetailScreen navigation={navigation} route={{ params: { goalId: 'goal-1' } }} />
    );

    expect(await screen.findByText('Could not load this goal.')).toBeTruthy();
  });
});
