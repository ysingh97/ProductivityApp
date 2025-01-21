import React, { useState, useEffect } from 'react';
import { fetchTasks } from '../services/taskService';
import { Link } from 'react-router-dom';

const TaskBoard = () => {
  const [tasks, setTasks] = useState([]); // State to store tasks
  const [loading, setLoading] = useState(true); // State to track loading status
  const [error, setError] = useState(null); // State to track errors

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchTasks(); // Fetch tasks using the service
        setTasks(data); // Set the fetched tasks into state
      } catch (err) {
        setError('Failed to load tasks');
        console.error(err.message);
      } finally {
        setLoading(false); // Mark loading as finished
      }
    };

    loadTasks(); // Call the function on component mount
  }, []); // Empty dependency array ensures it runs once on mount

  if (loading) return <p>Loading tasks...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Task Board</h1>
      <ul>
        {tasks.map(task => (
          <li key={task._id}>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
          </li>
        ))}
      </ul>
      <Link to="/enterTaskpage">Create Task</Link>
    </div>
  );
};

export default TaskBoard;