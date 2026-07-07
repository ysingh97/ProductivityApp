/* eslint-env jest */
// Native modules that have no JS implementation under jest are mocked here.
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {})
}));
