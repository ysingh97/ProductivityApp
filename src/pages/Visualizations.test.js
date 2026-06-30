import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import Visualizations from "./Visualizations";
import {
  fetchTimeByCategory,
  fetchTimeSeries
} from "../features/analytics/analyticsService";

const mockPieChart = jest.fn(() => <div data-testid="pie-chart">Pie chart</div>);
const mockLineChart = jest.fn(() => <div data-testid="line-chart">Line chart</div>);
const mockBarChart = jest.fn(() => <div data-testid="bar-chart">Bar chart</div>);

jest.mock("../features/analytics/analyticsService", () => ({
  fetchTimeByCategory: jest.fn(),
  fetchTimeSeries: jest.fn()
}));

jest.mock("@mui/x-charts/PieChart", () => ({
  PieChart: (props) => {
    mockPieChart(props);
    return <div data-testid="pie-chart">Pie chart</div>;
  }
}));

jest.mock("@mui/x-charts/LineChart", () => ({
  LineChart: (props) => {
    mockLineChart(props);
    return <div data-testid="line-chart">Line chart</div>;
  }
}));

jest.mock("@mui/x-charts/BarChart", () => ({
  BarChart: (props) => {
    mockBarChart(props);
    return <div data-testid="bar-chart">Bar chart</div>;
  }
}));

const summaryResponse = {
  totalHours: 6,
  categories: [
    {
      categoryId: "cat-1",
      categoryTitle: "Work",
      hours: 4,
      percentage: 66.67
    },
    {
      categoryId: "cat-2",
      categoryTitle: "Health",
      hours: 2,
      percentage: 33.33
    }
  ]
};

const timeSeriesResponse = {
  bucket: "day",
  buckets: [
    {
      periodStart: "2026-01-01",
      totalHours: 2,
      categories: [
        {
          categoryId: "cat-1",
          categoryTitle: "Work",
          hours: 2
        }
      ]
    },
    {
      periodStart: "2026-01-02",
      totalHours: 4,
      categories: [
        {
          categoryId: "cat-1",
          categoryTitle: "Work",
          hours: 2,
        },
        {
          categoryId: "cat-2",
          categoryTitle: "Health",
          hours: 2
        }
      ]
    }
  ]
};

const getPeriodControls = () => screen.getAllByRole("group")[0];
const getGranularityControls = () => screen.getAllByRole("group")[1];
const flushUpdates = async (interaction) => {
  await act(async () => {
    if (interaction) {
      interaction();
    }

    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("Visualizations", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    jest.clearAllMocks();

    fetchTimeByCategory.mockResolvedValue(summaryResponse);
    fetchTimeSeries.mockResolvedValue(timeSeriesResponse);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("changes period modes and trend granularity controls", async () => {
    await flushUpdates(() => {
      render(<Visualizations />);
    });

    expect(await screen.findByTestId("pie-chart")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchTimeSeries).toHaveBeenLastCalledWith({
        from: "2026-01-01",
        to: "2026-01-31",
        bucket: "day"
      });
    });
    expect(screen.getAllByText("January 2026").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /^day$/i })).toHaveAttribute("aria-pressed", "true");

    await flushUpdates(() => {
      fireEvent.click(within(getPeriodControls()).getByRole("button", { name: /^year$/i }));
    });

    expect(screen.getAllByText("2026").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(fetchTimeSeries).toHaveBeenLastCalledWith({
        from: "2026-01-01",
        to: "2026-12-31",
        bucket: "month"
      });
    });
    expect(
      within(getGranularityControls()).getByRole("button", { name: /^month$/i })
    ).toHaveAttribute("aria-pressed", "true");

    await flushUpdates(() => {
      fireEvent.click(within(getPeriodControls()).getByRole("button", { name: /^week$/i }));
    });
    expect(screen.getAllByText("Jan 11 - Jan 17, 2026").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(fetchTimeSeries).toHaveBeenLastCalledWith({
        from: "2026-01-11",
        to: "2026-01-17",
        bucket: "day"
      });
    });
  });

  test("blocks invalid custom ranges without refetching analytics", async () => {
    await flushUpdates(() => {
      render(<Visualizations />);
    });

    expect(await screen.findByTestId("pie-chart")).toBeInTheDocument();

    await flushUpdates(() => {
      fireEvent.click(screen.getByRole("button", { name: /^custom$/i }));
    });
    expect(await screen.findByLabelText(/start date/i)).toBeInTheDocument();

    await flushUpdates(() => {
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: "2026-01-10" }
      });
    });
    await waitFor(() => expect(fetchTimeByCategory).toHaveBeenCalled());
    await waitFor(() => expect(fetchTimeSeries).toHaveBeenCalled());

    fetchTimeByCategory.mockClear();
    fetchTimeSeries.mockClear();

    await flushUpdates(() => {
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: "2026-01-20" }
      });
    });

    expect(
      await screen.findAllByText(/start date must be on or before end date\./i)
    ).not.toHaveLength(0);
    expect(fetchTimeByCategory).not.toHaveBeenCalled();
    expect(fetchTimeSeries).not.toHaveBeenCalled();
  });

  test("switches chart modes and exposes the no-visible-series state", async () => {
    await flushUpdates(() => {
      render(<Visualizations />);
    });

    expect(await screen.findByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();

    await flushUpdates(() => {
      fireEvent.click(screen.getByRole("button", { name: /^bars$/i }));
    });
    await waitFor(() => expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument());

    await flushUpdates(() => {
      fireEvent.click(screen.getByRole("button", { name: /^stacked$/i }));
    });
    expect(await screen.findByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();

    await flushUpdates(() => {
      fireEvent.click(screen.getByRole("button", { name: /^lines$/i }));
    });
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();

    await flushUpdates(() => {
      fireEvent.click(screen.getByRole("button", { name: /^total hours$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^work$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^health$/i }));
    });

    expect(await screen.findByText(/no visible trend series selected\./i)).toBeInTheDocument();
  });

  test("shows empty states when the selected range has no analytics data", async () => {
    fetchTimeByCategory.mockResolvedValue({
      totalHours: 0,
      categories: []
    });
    fetchTimeSeries.mockResolvedValue({
      bucket: "day",
      buckets: [
        {
          periodStart: "2026-01-01",
          totalHours: 0,
          categories: []
        }
      ]
    });

    await flushUpdates(() => {
      render(<Visualizations />);
    });

    expect(
      await screen.findAllByText(/no time entry data is available for this range\./i)
    ).toHaveLength(2);
  });

  test("hides built-in chart legends so the custom summaries own the layout", async () => {
    await flushUpdates(() => {
      render(<Visualizations />);
    });

    expect(await screen.findByTestId("pie-chart")).toBeInTheDocument();

    expect(mockPieChart.mock.calls.some(([props]) => props.hideLegend === true)).toBe(true);
    expect(mockLineChart.mock.calls.some(([props]) => props.hideLegend === true)).toBe(true);

    await flushUpdates(() => {
      fireEvent.click(screen.getByRole("button", { name: /^stacked$/i }));
    });

    expect(await screen.findByTestId("bar-chart")).toBeInTheDocument();
    expect(mockBarChart.mock.calls.some(([props]) => props.hideLegend === true)).toBe(true);
  });
});
