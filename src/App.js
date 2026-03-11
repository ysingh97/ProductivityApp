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

import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

function App() {
  const [colorMode, setColorMode] = useState("light");

  useEffect(() => {
    const storedMode = localStorage.getItem("colorMode");
    if (storedMode === "light" || storedMode === "dark") {
      setColorMode(storedMode);
      return;
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    setColorMode(prefersDark ? "dark" : "light");
  }, []);

  const theme = useMemo(
    () => {
      const isDark = colorMode === "dark";
      return createTheme({
        palette: {
          mode: colorMode,
          primary: {
            main: isDark ? "#d07a58" : "#c24b2f"
          },
          secondary: {
            main: isDark ? "#7aa193" : "#4c6a5f"
          },
          background: isDark
            ? { default: "#141310", paper: "#1d1b17" }
            : { default: "#f6efe6", paper: "#fbf7f0" },
          text: isDark
            ? { primary: "#f5efe6", secondary: "#c7bfb4" }
            : { primary: "#1f2933", secondary: "#5a6668" },
          divider: isDark ? "rgba(245, 239, 230, 0.16)" : "#e1d4c2"
        },
        shape: {
          borderRadius: 16
        },
        typography: {
          fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
          h1: { fontFamily: '"Fraunces", serif', fontWeight: 700 },
          h2: { fontFamily: '"Fraunces", serif', fontWeight: 700 },
          h3: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
          h4: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
          h5: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
          h6: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
          subtitle1: { fontWeight: 600 },
          button: { fontWeight: 600 }
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: isDark ? "#141310" : "#f6efe6",
                backgroundImage: isDark
                  ? "radial-gradient(circle at top left, rgba(54, 44, 35, 0.9), rgba(20, 19, 16, 0.95) 55%)"
                  : "radial-gradient(circle at top left, rgba(242, 221, 198, 0.9), rgba(246, 239, 230, 0.95) 55%)",
                backgroundAttachment: "fixed"
              }
            }
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none"
              }
            }
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                textTransform: "none"
              },
              containedPrimary: {
                boxShadow: isDark
                  ? "0 12px 28px rgba(208, 122, 88, 0.25)"
                  : "0 12px 28px rgba(194, 75, 47, 0.25)"
              }
            }
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                fontWeight: 600
              }
            }
          },
          MuiToggleButton: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 600
              }
            }
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundImage: "none"
              }
            }
          }
        }
      });
    },
    [colorMode]
  );

  const handleToggleColorMode = () => {
    setColorMode((prevMode) => {
      const nextMode = prevMode === "light" ? "dark" : "light";
      localStorage.setItem("colorMode", nextMode);
      return nextMode;
    });
  };

  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<SignIn />} />
              <Route element={<RequireAuth />}>
                <Route
                  element={
                    <AppShell colorMode={colorMode} onToggleColorMode={handleToggleColorMode} />
                  }
                >
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
