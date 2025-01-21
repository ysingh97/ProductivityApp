import TaskForm from '../features/taskForm';
import React, { useState } from "react";
import { Link } from 'react-router-dom';

const EnterTaskPage = () => {
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState(null);

    const handleTaskSubmit = async (taskData) => {
        setError(null); // Clear any previous errors
    
        try {
          // POST request to the backend
          const response = await fetch("http://localhost:5000/api/tasks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(taskData),
          });
    
          if (!response.ok) {
            throw new Error("Failed to add task");
          }
    
          const newTask = await response.json();
          setTasks((prevTasks) => [...prevTasks, newTask]); // Update task list
        } catch (err) {
          setError(err.message);
        }
    };


    return (
        <div>
        <h1>Enter Task</h1>
        <TaskForm onSubmit={handleTaskSubmit}/>
        <Link to="/">Back to Taskboard</Link>
        </div>
    );
};

export default EnterTaskPage;