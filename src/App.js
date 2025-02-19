import './App.css';
import TaskBoard from './pages/taskboard';
import EnterTaskPage from './pages/enterTaskPage';
import CreateListPage from './pages/createListPage';
import ListPage from './pages/listPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TaskBoard />}/>
          <Route path="/enterTaskPage" element={<EnterTaskPage />}/>
          <Route path="/createListPage" element={<CreateListPage/>}/>
          <Route path="/lists/:listId" element={<ListPage/>}/>
        </Routes>
        
      </div>
    </Router>
  );
}

export default App;
