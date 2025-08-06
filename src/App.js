import './App.css';
import TaskBoard from './pages/taskboard';
import CreateTaskPage from './features/tasks/createTaskPage';
import CreateListPage from './features/lists/createListPage';
import CreateGoalPage from './features/goals/createGoalPage';
import ListPage from './features/lists/listPage';
import GoalPage from './features/goals/goalPage';
import TaskPage from './features/tasks/taskPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<TaskBoard />}/>
            <Route path="/createTaskPage" element={<CreateTaskPage />}/>
            <Route path="/createListPage" element={<CreateListPage/>}/>
            <Route path="/createGoalPage" element={<CreateGoalPage/>}/>
            <Route path="/lists/:listId" element={<ListPage/>}/>
            <Route path="/goals/:goalId" element={<GoalPage/>}/>
            <Route path="/tasks/:taskId" element={<TaskPage/>}/>
          </Routes>
          
        </div>
      </Router>
    </ThemeProvider>
    
  );
}

export default App;
