import React, { useState, useEffect } from 'react';
import { fetchTasks } from '../services/taskService';
import { fetchLists } from '../services/listService';
import { Link } from 'react-router-dom';

const TaskBoard = () => {
  const [tasks, setTasks] = useState([]); // State to store tasks
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true); // State to track loading status
  const [error, setError] = useState(null); // State to track errors

  useEffect(() => {
    const loadTasks = async () => {
      try {
        console.log("Begin load tasks");
        const taskData = await fetchTasks(); // Fetch tasks using the service
        setTasks(taskData); // Set the fetched tasks into state
        const listData = await fetchLists();
        setLists(listData);
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
      <ul>
        {lists.map(list => (
          <li key={list._id}>
            <Link to={`/lists/${list._id}`}>{list.title}</Link>
          </li>
        ))}
      </ul>
      <Link to="/enterTaskPage">Create Task</Link>
      <Link to="/createListPage">Create List</Link>
    </div>
  );
};

export default TaskBoard;