/* eslint-env jest */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithPaper } from '../../test-utils';
import ListDetailScreen from '../ListDetailScreen';
import services from '../../api/services';

jest.mock('../../api/services', () => ({
  fetchLists: jest.fn(),
  fetchTasksByListId: jest.fn()
}));

const makeNavigation = () => ({ goBack: jest.fn(), navigate: jest.fn() });

describe('ListDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the list details and its tasks', async () => {
    services.fetchLists.mockResolvedValue([
      { _id: 'list1', title: 'Groceries', description: 'weekly run' }
    ]);
    services.fetchTasksByListId.mockResolvedValue([
      { _id: 't1', title: 'Buy milk', estimatedCompletionTime: 1, timeSpent: 0.5, isComplete: true },
      { _id: 't2', title: 'Buy bread', estimatedCompletionTime: 2, timeSpent: 0, isComplete: false }
    ]);

    renderWithPaper(
      <ListDetailScreen navigation={makeNavigation()} route={{ params: { listId: 'list1' } }} />
    );

    expect(await screen.findByText('Groceries')).toBeTruthy();
    expect(screen.getByText('weekly run')).toBeTruthy();
    expect(screen.getByText('Buy milk')).toBeTruthy();
    expect(screen.getByText('Buy bread')).toBeTruthy();
    expect(screen.getByText('2 tasks')).toBeTruthy();
    expect(screen.getByText('1 done')).toBeTruthy();
  });

  it('opens a task when its card is pressed', async () => {
    const navigation = makeNavigation();
    services.fetchLists.mockResolvedValue([{ _id: 'list1', title: 'Groceries' }]);
    services.fetchTasksByListId.mockResolvedValue([{ _id: 't1', title: 'Buy milk' }]);

    renderWithPaper(
      <ListDetailScreen navigation={navigation} route={{ params: { listId: 'list1' } }} />
    );

    fireEvent.press(await screen.findByText('Buy milk'));
    expect(navigation.navigate).toHaveBeenCalledWith('TaskDetail', { taskId: 't1' });
  });

  it('navigates to the task form with the list preselected', async () => {
    const navigation = makeNavigation();
    services.fetchLists.mockResolvedValue([{ _id: 'list1', title: 'Groceries' }]);
    services.fetchTasksByListId.mockResolvedValue([]);

    renderWithPaper(
      <ListDetailScreen navigation={navigation} route={{ params: { listId: 'list1' } }} />
    );

    fireEvent.press(await screen.findByText('Add task to list'));
    expect(navigation.navigate).toHaveBeenCalledWith('TaskForm', {
      mode: 'create',
      initialListId: 'list1'
    });
  });

  it('shows an error state when loading fails', async () => {
    services.fetchLists.mockRejectedValue(new Error('boom'));
    services.fetchTasksByListId.mockRejectedValue(new Error('boom'));

    renderWithPaper(
      <ListDetailScreen navigation={makeNavigation()} route={{ params: { listId: 'list1' } }} />
    );

    expect(await screen.findByText('Could not load this list.')).toBeTruthy();
  });
});
