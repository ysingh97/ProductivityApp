import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn()
  }
}));

jest.mock('./pages/taskboard', () => () => <div>Dashboard</div>);
jest.mock('./features/tasks/createTaskPage', () => () => <div>Create Task Page</div>);
jest.mock('./features/lists/createListPage', () => () => <div>Create List Page</div>);
jest.mock('./features/goals/createGoalPage', () => () => <div>Create Goal Page</div>);
jest.mock('./features/lists/listPage', () => () => <div>List Page</div>);
jest.mock('./features/lists/listsOverview', () => () => <div>Lists Overview</div>);
jest.mock('./features/goals/goalPage', () => () => <div>Goal Page</div>);
jest.mock('./features/tasks/taskPage', () => () => <div>Task Page</div>);
jest.mock('./pages/GoalsOverview', () => () => <div>Goals Overview</div>);
jest.mock('./pages/GoalTreeView', () => () => <div>Goal Tree View</div>);
jest.mock('./pages/CalendarView', () => () => <div>Calendar View</div>);
jest.mock('./pages/Visualizations', () => () => <div>Visualizations</div>);
jest.mock('./pages/GoogleCalendarSettings', () => () => <div>Google Calendar Settings</div>);

const testUser = {
  id: 'user-1',
  googleId: 'test-basic',
  email: 'viz-basic@example.test',
  name: 'Viz Basic',
  picture: ''
};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
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
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.pushState({}, '', '/');
  document.body.innerHTML = '';

  const googleScript = document.createElement('script');
  googleScript.id = 'google-identity-script';
  document.body.appendChild(googleScript);
});

test('renders the sign-in screen for unauthenticated users', () => {
  render(<App />);

  expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  expect(screen.getByText(/productivity hub/i)).toBeInTheDocument();
});

test('shows the session-expired notice when auth is cleared', () => {
  sessionStorage.setItem('authExpired', '1');

  render(<App />);

  expect(screen.getByText(/your session expired/i)).toBeInTheDocument();
  expect(sessionStorage.getItem('authExpired')).toBeNull();
});

test('redirects protected routes back to sign-in when unauthenticated', async () => {
  window.history.pushState({}, '', '/board');

  render(<App />);

  await waitFor(() => expect(window.location.pathname).toBe('/'));
  expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
});

test('allows non-production test auth personas to open protected routes', async () => {
  localStorage.setItem('authToken', 'test:basic');
  localStorage.setItem('authUser', JSON.stringify(testUser));
  window.history.pushState({}, '', '/board');

  render(<App />);

  expect(await screen.findByText(/dashboard/i)).toBeInTheDocument();
  expect(screen.getByText(/viz-basic@example\.test/i)).toBeInTheDocument();
});

test('hydrates the stored color mode preference for authenticated routes', async () => {
  localStorage.setItem('authToken', 'test:basic');
  localStorage.setItem('authUser', JSON.stringify(testUser));
  localStorage.setItem('colorMode', 'dark');
  window.history.pushState({}, '', '/board');

  render(<App />);

  expect(await screen.findByText(/dashboard/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
});

test('persists color mode changes from the app shell toggle', async () => {
  localStorage.setItem('authToken', 'test:basic');
  localStorage.setItem('authUser', JSON.stringify(testUser));
  window.history.pushState({}, '', '/board');

  render(<App />);

  const toggleButton = await screen.findByRole('button', { name: /switch to dark mode/i });
  fireEvent.click(toggleButton);

  await waitFor(() => expect(localStorage.getItem('colorMode')).toBe('dark'));
  expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
});

test('signing out from the app shell clears auth and returns to sign-in', async () => {
  localStorage.setItem('authToken', 'test:basic');
  localStorage.setItem('authUser', JSON.stringify(testUser));
  window.history.pushState({}, '', '/board');

  render(<App />);

  expect(await screen.findByText(/dashboard/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /viz-basic@example\.test/i }));
  fireEvent.click(await screen.findByRole('menuitem', { name: /sign out/i }));

  await waitFor(() => expect(window.location.pathname).toBe('/'));
  expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem('authToken')).toBeNull());
  expect(localStorage.getItem('authUser')).toBeNull();
});
