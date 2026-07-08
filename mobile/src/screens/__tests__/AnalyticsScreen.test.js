/* eslint-env jest */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithPaper } from '../../test-utils';
import AnalyticsScreen from '../AnalyticsScreen';
import services from '../../api/services';

jest.mock('../../api/services', () => ({
  fetchTimeByCategory: jest.fn(),
  fetchTimeSeries: jest.fn()
}));

const summary = {
  totalHours: 10,
  categories: [
    { categoryId: 'c1', categoryTitle: 'Work', hours: 6, percentage: 60 },
    { categoryId: 'c2', categoryTitle: 'Study', hours: 4, percentage: 40 }
  ]
};

const timeSeries = {
  bucket: 'day',
  buckets: [
    { periodStart: '2026-01-01', totalHours: 2, categories: [] },
    { periodStart: '2026-01-02', totalHours: 4, categories: [] }
  ]
};

describe('AnalyticsScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    jest.clearAllMocks();
    services.fetchTimeByCategory.mockResolvedValue(summary);
    services.fetchTimeSeries.mockResolvedValue(timeSeries);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders stats, category legend, and both charts', async () => {
    renderWithPaper(<AnalyticsScreen />);

    // Defaults to the current month.
    expect(await screen.findByText('January 2026')).toBeTruthy();
    // Tracked-hours stat pulls from the summary total.
    expect(await screen.findByText('10h')).toBeTruthy();
    // Top category = highest hours row (appears in the stat card + the legend).
    expect(screen.getAllByText('Work').length).toBeGreaterThan(0);
    expect(screen.getByText('6h (60%)')).toBeTruthy();
    // Legend renders every category.
    expect(screen.getByText('Study')).toBeTruthy();
    // Both SVG charts mount.
    expect(screen.getByTestId('category-donut')).toBeTruthy();
    expect(screen.getByTestId('trend-bars')).toBeTruthy();

    expect(services.fetchTimeByCategory).toHaveBeenCalledWith({
      from: '2026-01-01',
      to: '2026-01-31'
    });
    expect(services.fetchTimeSeries).toHaveBeenCalledWith({
      from: '2026-01-01',
      to: '2026-01-31',
      bucket: 'day'
    });
  });

  it('reloads analytics with a new range when switching to Week', async () => {
    renderWithPaper(<AnalyticsScreen />);
    await screen.findByText('January 2026');

    // "Week" is both the period option and (for Month) a granularity option;
    // the first is the period selector.
    fireEvent.press(screen.getAllByText('Week')[0]);

    await waitFor(() =>
      expect(services.fetchTimeByCategory).toHaveBeenLastCalledWith({
        from: '2026-01-11',
        to: '2026-01-17'
      })
    );
    expect(await screen.findByText('Jan 11 - Jan 17, 2026')).toBeTruthy();
  });

  it('shows an empty state when there is no tracked time', async () => {
    services.fetchTimeByCategory.mockResolvedValue({ totalHours: 0, categories: [] });
    services.fetchTimeSeries.mockResolvedValue({ bucket: 'day', buckets: [] });

    renderWithPaper(<AnalyticsScreen />);

    expect(await screen.findByText('No tracked time in this range yet.')).toBeTruthy();
    expect(screen.queryByTestId('category-donut')).toBeNull();
  });

  it('surfaces an error state with retry', async () => {
    services.fetchTimeByCategory.mockRejectedValue(new Error('boom'));

    renderWithPaper(<AnalyticsScreen />);

    expect(await screen.findByText('Unable to load analytics right now.')).toBeTruthy();
  });
});
