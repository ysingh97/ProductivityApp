import React, { useState, useEffect } from 'react';
import { fetchTasks } from '../features/tasks/taskService';
import { fetchLists } from '../features/lists/listService';
import { fetchGoals } from '../features/goals/goalService';
import { Link } from 'react-router-dom';

const TaskBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [lists, setLists] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        console.log("Begin load tasks");
        const taskResponse = await fetchTasks();
        setTasks(taskResponse);
        const listResponse = await fetchLists();
        setLists(listResponse);
        const goalResponse = await fetchGoals();
        setGoals(goalResponse);
      } catch (err) {
        setError('Failed to load tasks');
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  if (loading) return <p>Loading tasks...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '20px' }}>
        <h1>Task Board</h1>
        <ul>
          {tasks.map(task => (
            <li key={task._id}>
              <Link to={`/tasks/${task._id}`}>{task.title}</Link>
            </li>
          ))}
        </ul>
        <ul>
          {lists.map(list => (
            <li key={list._id}>
              <Link to={`/lists/${list._id}`}>{list.title}</Link>
            </li>
          ))}
        </ul>
        <ul>
          {goals.map(goal => (
            <li key={goal._id}>
              <Link to={`/goals/${goal._id}`}>{goal.title}</Link>
            </li>
          ))}
        </ul>
        
      </div>
      <div>
        <Link to="/task/new">Create Task</Link>
        <Link to="/createListPage">Create List</Link>
        <Link to="/createGoalPage">Create Goal</Link>
      </div>
    </div>
    
  );
};

export default TaskBoard;