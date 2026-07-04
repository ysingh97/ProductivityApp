import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation
} from "react-router-dom";
import GoogleCalendarSettings from "./GoogleCalendarSettings";
import {
  disconnectGoogleCalendar,
  fetchGoogleCalendarConnectUrl,
  fetchGoogleCalendarStatus,
  fetchGoogleCalendars,
  saveGoogleCalendarSettings,
  syncGoogleCalendarNow
} from "../features/integrations/googleCalendarService";

jest.mock("../features/integrations/googleCalendarService", () => ({
  disconnectGoogleCalendar: jest.fn(),
  fetchGoogleCalendarConnectUrl: jest.fn(),
  fetchGoogleCalendarStatus: jest.fn(),
  fetchGoogleCalendars: jest.fn(),
  saveGoogleCalendarSettings: jest.fn(),
  syncGoogleCalendarNow: jest.fn()
}));

const originalLocation = window.location;

const connectedStatus = {
  connected: true,
  googleEmail: "sync@example.test",
  selectedCalendarId: "calendar-primary",
  selectedCalendarSummary: "Primary Calendar (Primary)",
  syncEnabled: true,
  lastSyncAt: null,
  lastSyncError: "",
  syncSummary: {
    eligibleToSyncCount: 6,
    blockedByConfigurationCount: 0,
    activelySyncingCount: 6,
    missingTargetDateCount: 3,
    completedCount: 2,
    configurationIssue: null
  }
};

const calendarsResponse = [
  {
    id: "calendar-primary",
    summary: "Primary Calendar",
    primary: true
  },
  {
    id: "calendar-team",
    summary: "Team Calendar",
    primary: false
  }
];

const LocationProbe = () => {
  const location = useLocation();

  return (
    <div data-testid="location-display">
      {location.pathname}
      {location.search}
    </div>
  );
};

const renderGoogleCalendarSettings = (
  initialPath = "/settings/google-calendar"
) =>
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/settings/google-calendar"
          element={
            <>
              <LocationProbe />
              <GoogleCalendarSettings />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

const openCalendarOption = async (optionLabel) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: /destination calendar/i }));
  const listbox = await screen.findByRole("listbox");
  fireEvent.click(within(listbox).getByText(optionLabel));
};

describe("GoogleCalendarSettings", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });

    delete window.location;
    window.location = {
      ...originalLocation,
      assign: jest.fn()
    };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    fetchGoogleCalendarStatus.mockResolvedValue({ connected: false });
    fetchGoogleCalendars.mockResolvedValue(calendarsResponse);
    fetchGoogleCalendarConnectUrl.mockResolvedValue({
      url: "https://accounts.google.com/o/oauth2/auth"
    });
    saveGoogleCalendarSettings.mockResolvedValue({
      selectedCalendarId: "calendar-team",
      selectedCalendarSummary: "Team Calendar",
      syncEnabled: false,
      syncSummary: {
        eligibleToSyncCount: 6,
        blockedByConfigurationCount: 6,
        activelySyncingCount: 0,
        missingTargetDateCount: 3,
        completedCount: 2,
        configurationIssue: "syncPaused"
      }
    });
    syncGoogleCalendarNow.mockResolvedValue({});
    disconnectGoogleCalendar.mockResolvedValue({});
  });

  test("shows callback success, clears the query string, and starts the connect flow", async () => {
    renderGoogleCalendarSettings("/settings/google-calendar?googleCalendar=connected");

    expect(
      await screen.findByText(
        /google calendar connected\. choose a calendar and save your sync settings\./i
      )
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/settings/google-calendar"
      )
    );
    expect(screen.getByRole("button", { name: /connect google calendar/i })).toBeInTheDocument();
    expect(fetchGoogleCalendars).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /connect google calendar/i }));

    await waitFor(() =>
      expect(fetchGoogleCalendarConnectUrl).toHaveBeenCalledTimes(1)
    );
    expect(window.location.assign).toHaveBeenCalledWith(
      "https://accounts.google.com/o/oauth2/auth"
    );
  });

  test("shows callback errors and clears the query string", async () => {
    renderGoogleCalendarSettings("/settings/google-calendar?googleCalendar=error");

    expect(
      await screen.findByText(/google calendar connection failed\. please try again\./i)
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/settings/google-calendar"
      )
    );
    expect(screen.getByRole("button", { name: /connect google calendar/i })).toBeInTheDocument();
  });

  test("loads connected settings and saves calendar changes", async () => {
    fetchGoogleCalendarStatus.mockResolvedValue({ ...connectedStatus });

    renderGoogleCalendarSettings();

    expect(await screen.findByText(/connected as sync@example\.test/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /connect one google calendar and keep dated, incomplete goals and tasks synced from the app\./i
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText("Primary Calendar (Primary)").length).toBeGreaterThan(0);
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view 3 items without target dates/i })
    ).toHaveAttribute("href", "/settings/google-calendar/items/missing-target-date");
    expect(
      screen.getByRole("link", { name: /view 2 completed items excluded from sync/i })
    ).toHaveAttribute("href", "/settings/google-calendar/items/completed");
    expect(fetchGoogleCalendars).toHaveBeenCalledTimes(1);

    await openCalendarOption("Team Calendar");
    fireEvent.click(
      screen.getByRole("switch", { name: /enable automatic sync after app changes/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() =>
      expect(saveGoogleCalendarSettings).toHaveBeenCalledWith({
        selectedCalendarId: "calendar-team",
        selectedCalendarSummary: "Team Calendar",
        syncEnabled: false
      })
    );
    expect(
      await screen.findByText(/google calendar settings saved\. a full resync has been queued\./i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("Team Calendar").length).toBeGreaterThan(0);
    expect(screen.getByText("Sync paused")).toBeInTheDocument();
    expect(screen.getByText(/automatic sync paused/i)).toBeInTheDocument();
  });

  test("queues a sync and disconnects an existing connection", async () => {
    fetchGoogleCalendarStatus
      .mockResolvedValueOnce({ ...connectedStatus })
      .mockResolvedValueOnce({
        ...connectedStatus,
        lastSyncAt: "2026-01-14T18:30:00.000Z"
      });

    renderGoogleCalendarSettings();

    expect(await screen.findByText(/connected as sync@example\.test/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() => expect(syncGoogleCalendarNow).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchGoogleCalendarStatus).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/google calendar sync queued\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /disconnect google calendar/i }));

    await waitFor(() => expect(disconnectGoogleCalendar).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/google calendar disconnected\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect google calendar/i })).toBeInTheDocument();
    expect(screen.queryByText(/sync settings/i)).not.toBeInTheDocument();
  });

  test("sync now saves changed settings before queueing when the calendar selection changed", async () => {
    fetchGoogleCalendarStatus.mockResolvedValue({ ...connectedStatus });
    saveGoogleCalendarSettings.mockResolvedValue({
      ...connectedStatus,
      selectedCalendarId: "calendar-team",
      selectedCalendarSummary: "Team Calendar",
      syncEnabled: true
    });

    renderGoogleCalendarSettings();

    expect(await screen.findByText(/connected as sync@example\.test/i)).toBeInTheDocument();

    await openCalendarOption("Team Calendar");
    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));

    await waitFor(() =>
      expect(saveGoogleCalendarSettings).toHaveBeenCalledWith({
        selectedCalendarId: "calendar-team",
        selectedCalendarSummary: "Team Calendar",
        syncEnabled: true
      })
    );
    expect(syncGoogleCalendarNow).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/google calendar settings saved\. a full resync has been queued\./i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("Team Calendar").length).toBeGreaterThan(0);
  });

  test("shows the backend error when loading calendars fails after a successful connection", async () => {
    fetchGoogleCalendarStatus.mockResolvedValue({ ...connectedStatus });
    fetchGoogleCalendars.mockRejectedValue({
      response: {
        data: {
          message: "Google Calendar API has not been used in project 123 before or it is disabled."
        }
      }
    });

    renderGoogleCalendarSettings("/settings/google-calendar?googleCalendar=connected");

    expect(await screen.findByText(/connected as sync@example\.test/i)).toBeInTheDocument();
    expect(
      await screen.findByText(
        /google calendar api has not been used in project 123 before or it is disabled\./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /google calendar connected\. choose a calendar and save your sync settings\./i
      )
    ).toBeInTheDocument();
  });
});
