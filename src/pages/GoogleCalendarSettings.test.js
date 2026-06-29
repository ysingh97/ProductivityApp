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
  lastSyncError: ""
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
      syncEnabled: false
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
    expect(screen.getAllByText("Primary Calendar (Primary)").length).toBeGreaterThan(0);
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
});
