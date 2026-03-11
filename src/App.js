import './App.css';
import TaskBoard from './pages/taskboard';
import CreateTaskPage from './features/tasks/createTaskPage';
import CreateListPage from './features/lists/createListPage';
import CreateGoalPage from './features/goals/createGoalPage';
import ListPage from './features/lists/listPage';
import GoalPage from './features/goals/goalPage';
import TaskPage from './features/tasks/taskPage';
// import EditTaskPage from './features/tasks/editTaskPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignIn from './pages/SignIn';
import GoalsOverview from './pages/GoalsOverview';
import GoalTreeView from './pages/GoalTreeView';
import CalendarView from './pages/CalendarView';
import Visualizations from './pages/Visualizations';
import RequireAuth from './components/RequireAuth';
import AppShell from './components/AppShell';
import { AuthProvider } from './context/AuthContext';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<SignIn />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route path="/board" element={<TaskBoard />} />
                  <Route path="/task/new" element={<CreateTaskPage />} />
                  <Route path="/task/:taskId/edit" element={<CreateTaskPage />} />
                  <Route path="/createListPage" element={<CreateListPage />} />
                  <Route path="/goal/new" element={<CreateGoalPage />} />
                  <Route path="/goal/:goalId/edit" element={<CreateGoalPage />} />
                  <Route path="/lists/:listId" element={<ListPage />} />
                  <Route path="/goals/overview" element={<GoalsOverview />} />
                  <Route path="/goals/:goalId/tree" element={<GoalTreeView />} />
                  <Route path="/goals/:goalId" element={<GoalPage />} />
                  <Route path="/tasks/:taskId" element={<TaskPage />} />
                  <Route path="/calendar" element={<CalendarView />} />
                  <Route path="/visualizations" element={<Visualizations />} />
                </Route>
              </Route>
            </Routes>
            
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
    
  );
}

export default App;
