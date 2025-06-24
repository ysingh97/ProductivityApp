import './App.css';
import TaskBoard from './pages/taskboard';
import CreateTaskPage from './pages/createTaskPage';
import CreateListPage from './pages/createListPage';
import CreateGoalPage from './pages/createGoalPage';
import ListPage from './pages/listPage';
import GoalPage from './pages/goalPage';
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
