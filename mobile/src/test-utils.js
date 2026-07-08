/* eslint-env jest */
import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

// Paper components (Menu/Portal/Dialog) require a PaperProvider ancestor.
export const renderWithPaper = (ui, options) =>
  render(<PaperProvider>{ui}</PaperProvider>, options);
