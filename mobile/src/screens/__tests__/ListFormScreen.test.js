/* eslint-env jest */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithPaper } from '../../test-utils';
import ListFormScreen from '../ListFormScreen';
import services from '../../api/services';

jest.mock('../../api/services', () => ({
  createList: jest.fn(async () => ({ data: { _id: 'list1' } }))
}));

const makeNavigation = () => ({ goBack: jest.fn(), navigate: jest.fn() });

describe('ListFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a list with the entered values', async () => {
    const navigation = makeNavigation();
    renderWithPaper(<ListFormScreen navigation={navigation} route={{ params: {} }} />);

    fireEvent.changeText(screen.getByLabelText('Title'), '  Groceries  ');
    fireEvent.changeText(screen.getByLabelText('Description'), '  weekly run  ');
    fireEvent.press(screen.getByText('Create list'));

    await waitFor(() => expect(services.createList).toHaveBeenCalledTimes(1));
    expect(services.createList.mock.calls[0][0]).toEqual({
      title: 'Groceries',
      description: 'weekly run'
    });
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });

  it('blocks submit and shows an error when the title is empty', async () => {
    const navigation = makeNavigation();
    renderWithPaper(<ListFormScreen navigation={navigation} route={{ params: {} }} />);

    fireEvent.press(screen.getByText('Create list'));

    expect(await screen.findByText('List title is required.')).toBeTruthy();
    expect(services.createList).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
