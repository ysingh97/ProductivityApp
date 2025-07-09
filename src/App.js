import './App.css';
import TaskBoard from './pages/taskboard';
import CreateTaskPage from './features/tasks/createTaskPage';
import CreateListPage from './features/lists/createListPage';
import CreateGoalPage from './features/goals/createGoalPage';
import ListPage from './features/lists/listPage';
import GoalPage from './features/goals/goalPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TaskBoard />}/>
          <Route path="/createTaskPage" element={<CreateTaskPage />}/>
          <Route path="/createListPage" element={<CreateListPage/>}/>
          <Route path="/createGoalPage" element={<CreateGoalPage/>}/>
          <Route path="/lists/:listId" element={<ListPage/>}/>
          <Route path="/goal/:goalId" element={<GoalPage/>}/>
        </Routes>
        
      </div>
    </Router>
  );
}

export default App;
