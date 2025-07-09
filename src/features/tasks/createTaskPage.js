import TaskForm from './taskForm';
import React, { useState } from "react";
import { Link } from 'react-router-dom';
import { createTask } from './taskService';

const CreateTaskPage = () => {
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState(null);

    const handleTaskSubmit = async (taskData) => {
        setError(null); // Clear any previous errors
    
        try {
          // POST request to the backend
          
          const response = await createTask(taskData);
          const newTask = await response.data;
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

export default CreateTaskPage;