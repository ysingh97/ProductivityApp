/* eslint-env jest */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithPaper } from '../../test-utils';
import TaskFormScreen from '../TaskFormScreen';
import services from '../../api/services';

jest.mock('../../api/services', () => ({
  fetchLists: jest.fn(async () => []),
  fetchGoals: jest.fn(async () => []),
  fetchCategories: jest.fn(async () => []),
  createTask: jest.fn(async () => ({})),
  updateTask: jest.fn(async () => ({}))
}));

const makeNavigation = () => ({ goBack: jest.fn(), navigate: jest.fn() });

describe('TaskFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a task with the entered values', async () => {
    const navigation = makeNavigation();
    renderWithPaper(
      <TaskFormScreen navigation={navigation} route={{ params: { mode: 'create' } }} />
    );

    const submit = await screen.findByText('Create task');
    fireEvent.changeText(screen.getByLabelText('Title'), 'Write tests');
    fireEvent.changeText(screen.getByLabelText('Estimated hours'), '3');
    fireEvent.press(submit);

    await waitFor(() => expect(services.createTask).toHaveBeenCalledTimes(1));
    const payload = services.createTask.mock.calls[0][0];
    expect(payload.title).toBe('Write tests');
    expect(payload.estimatedCompletionTime).toBe(3);
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });

  it('blocks submit and shows an error when the title is empty', async () => {
    const navigation = makeNavigation();
    renderWithPaper(
      <TaskFormScreen navigation={navigation} route={{ params: { mode: 'create' } }} />
    );

    const submit = await screen.findByText('Create task');
    fireEvent.press(submit);

    expect(await screen.findByText('Title is required.')).toBeTruthy();
    expect(services.createTask).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('updates an existing task in edit mode', async () => {
    const navigation = makeNavigation();
    const task = {
      _id: 'abc123',
      title: 'Existing task',
      estimatedCompletionTime: 2
    };
    renderWithPaper(
      <TaskFormScreen navigation={navigation} route={{ params: { mode: 'edit', task } }} />
    );

    const submit = await screen.findByText('Update task');
    expect(screen.getByDisplayValue('Existing task')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Estimated hours'), '5');
    fireEvent.press(submit);

    await waitFor(() => expect(services.updateTask).toHaveBeenCalledTimes(1));
    expect(services.updateTask.mock.calls[0][0]).toBe('abc123');
    expect(services.updateTask.mock.calls[0][1].estimatedCompletionTime).toBe(5);
  });
});
