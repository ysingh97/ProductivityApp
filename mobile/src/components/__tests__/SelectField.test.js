/* eslint-env jest */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithPaper } from '../../test-utils';
import SelectField from '../SelectField';

const options = [
  { value: '1', label: 'Mobile Launch' },
  { value: '2', label: 'Personal' }
];

describe('SelectField', () => {
  it('shows the placeholder when nothing is selected', () => {
    renderWithPaper(
      <SelectField label="List" value={null} options={options} onChange={() => {}} placeholder="Pick one" />
    );
    expect(screen.getByText('Pick one')).toBeTruthy();
  });

  it('shows the selected option label', () => {
    renderWithPaper(
      <SelectField label="List" value="2" options={options} onChange={() => {}} />
    );
    expect(screen.getByText('Personal')).toBeTruthy();
  });

  it('calls onChange with the chosen value', () => {
    const onChange = jest.fn();
    renderWithPaper(
      <SelectField label="List" value={null} options={options} onChange={onChange} placeholder="Pick one" />
    );
    fireEvent.press(screen.getByLabelText('List selector'));
    fireEvent.press(screen.getByText('Mobile Launch'));
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('calls onChange with null when None is chosen', () => {
    const onChange = jest.fn();
    renderWithPaper(
      <SelectField label="List" value="1" options={options} onChange={onChange} />
    );
    fireEvent.press(screen.getByLabelText('List selector'));
    fireEvent.press(screen.getByText('None'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
