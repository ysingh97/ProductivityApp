import GoalForm from './goalForm';
import React, { useState } from "react";
import { Link } from 'react-router-dom';
import { createGoal } from './goalService';

const CreateGoalPage = () => {
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState(null);

    const handleGoalSubmit = async (taskData) => {
        setError(null); // Clear any previous errors
    
        try {
          // POST request to the backend
          
          const response = await createGoal(taskData);
          const newTask = await response.data;
          setTasks((prevTasks) => [...prevTasks, newTask]); // Update task list
        } catch (err) {
          setError(err.message);
        }
    };


    return (
        <div>
        <h1>Create Goal</h1>
        <GoalForm onSubmit={handleGoalSubmit}/>
        <Link to="/">Back to Taskboard</Link>
        </div>
    );
};

export default CreateGoalPage;