import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./features/tasks/taskService', () => ({
  fetchTasks: jest.fn(async () => [])
}));

jest.mock('./features/lists/listService', () => ({
  fetchLists: jest.fn(async () => [])
}));

jest.mock('./features/goals/goalService', () => ({
  fetchGoals: jest.fn(async () => [])
}));

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
