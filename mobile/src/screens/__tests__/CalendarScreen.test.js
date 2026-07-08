/* eslint-env jest */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithPaper } from '../../test-utils';
import CalendarScreen from '../CalendarScreen';
import services from '../../api/services';

jest.mock('../../api/services', () => ({
  fetchGoals: jest.fn(),
  fetchTasks: jest.fn()
}));

const makeNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn()
});

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    jest.clearAllMocks();

    services.fetchGoals.mockResolvedValue([
      {
        _id: 'goal-root-1',
        title: 'Launch Goal',
        parentGoalId: null,
        targetCompletionDate: '2026-01-14T10:00:00.000Z'
      },
      {
        _id: 'goal-child-1',
        title: 'Launch Subgoal',
        parentGoalId: 'goal-root-1',
        targetCompletionDate: '2026-01-16T10:00:00.000Z'
      },
      {
        _id: 'goal-root-2',
        title: 'Health Goal',
        parentGoalId: null,
        targetCompletionDate: '2026-01-15T10:00:00.000Z'
      }
    ]);
    services.fetchTasks.mockResolvedValue([
      {
        _id: 'task-1',
        title: 'Launch Task',
        parentGoalId: 'goal-child-1',
        targetCompletionDate: '2026-01-13T10:00:00.000Z'
      },
      {
        _id: 'task-2',
        title: 'Standalone Task',
        parentGoalId: null,
        targetCompletionDate: '2026-01-17T10:00:00.000Z'
      }
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders due goals and tasks for the current week', async () => {
    renderWithPaper(<CalendarScreen navigation={makeNavigation()} />);

    expect(await screen.findByText('Jan 11 - Jan 17, 2026')).toBeTruthy();
    expect(await screen.findByTestId('calendar-item-goal-goal-root-1')).toBeTruthy();
    expect(await screen.findByText('Launch Task')).toBeTruthy();
    expect(await screen.findByText('Standalone Task')).toBeTruthy();
  });

  it('hides tasks when the Tasks toggle is turned off', async () => {
    renderWithPaper(<CalendarScreen navigation={makeNavigation()} />);

    expect(await screen.findByText('Launch Task')).toBeTruthy();

    fireEvent.press(screen.getByTestId('toggle-tasks'));

    await waitFor(() => {
      expect(screen.queryByText('Launch Task')).toBeNull();
      expect(screen.queryByText('Standalone Task')).toBeNull();
    });
    expect(screen.getByTestId('calendar-item-goal-goal-root-1')).toBeTruthy();
  });

  it('filters by goal tree when a chip is toggled off', async () => {
    renderWithPaper(<CalendarScreen navigation={makeNavigation()} />);

    expect(await screen.findByText('Launch Task')).toBeTruthy();

    // Toggle off the "Launch Goal" tree; its goals + linked tasks disappear,
    // the unassigned task stays.
    fireEvent.press(screen.getByTestId('filter-chip-goal-root-1'));

    await waitFor(() => {
      expect(screen.queryByText('Launch Task')).toBeNull();
      expect(screen.getByText('Standalone Task')).toBeTruthy();
    });
  });

  it('navigates to goal and task detail on item press', async () => {
    const navigation = makeNavigation();
    renderWithPaper(<CalendarScreen navigation={navigation} />);

    await screen.findByText('Launch Task');
    fireEvent.press(screen.getByTestId('calendar-item-task-task-1'));
    expect(navigation.navigate).toHaveBeenCalledWith('TaskDetail', { taskId: 'task-1' });

    fireEvent.press(screen.getByTestId('calendar-item-goal-goal-root-2'));
    expect(navigation.navigate).toHaveBeenCalledWith('GoalDetail', { goalId: 'goal-root-2' });
  });
});
