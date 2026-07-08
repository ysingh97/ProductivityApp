/* eslint-env jest */
// Native modules that have no JS implementation under jest are mocked here.
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {})
}));

// useFocusEffect needs a navigation context at runtime; under jest we run the
// effect like a plain useEffect so screens can be tested in isolation.
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const React = require('react');
  return {
    ...actual,
    useFocusEffect: (callback) => React.useEffect(callback, [callback])
  };
});
