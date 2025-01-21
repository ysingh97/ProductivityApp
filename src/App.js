import './App.css';
import TaskBoard from './pages/taskboard';
import EnterTaskPage from './pages/enterTaskPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TaskBoard />}/>
          <Route path="/enterTaskPage" element={<EnterTaskPage />}/>
        </Routes>
        
      </div>
    </Router>
  );
}

export default App;
