import TaskForm from './taskForm';
import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { createTask, updateTask, fetchTaskById } from './taskService';
import { useLocation } from "react-router-dom";

const CreateTaskPage = () => {
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState(null);
    const { taskId } = useParams(); // task id if editing
    const [searchParams] = useSearchParams();
    const goalId = searchParams.get("goalId"); // optional parent goal for new task

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(false);

    const isEditing = Boolean(taskId);

    useEffect(() => {
        if (isEditing) {
          setLoading(true);
          const loadTask = async () => {
            try {
              const fetchedTask = await fetchTaskById(taskId);
              setTask(fetchedTask);
            } catch (err) {
              setError('Failed to load task');
              console.error(err.message);
            } finally { setLoading(false); }
          };
          loadTask();
        } else if (goalId) {
          // Creating new task with parent goal
          setTask({ parentGoalId: goalId });
        } else {
          // Creating new task without parent goal
          setTask(null);
        }
    }, [taskId, goalId, isEditing]);
    // const location = useLocation();
    // const task = location.state?.task || null;
    // console.log("CreateTaskPage - task: ", task);
    const handleTaskSubmit = async (taskData) => {
      try {
        if (task) {
          const updatedTask = await updateTask(task._id, taskData);
          setTasks((prevTasks) =>
            prevTasks.map((t) => (t._id === updatedTask._id ? updatedTask : t))
          ); // Update task list
          
        } else {
          const newTask = await createTask(taskData);
          setTasks((prevTasks) => [...prevTasks, newTask]); // Update task list
        }
      } catch (err) {
        setError(err.message);
      }
    };

    console.log("CreateTaskPage, before render")
    return (
        <div>
        <h1>Enter Task</h1>
        <TaskForm task={task} onSubmit={handleTaskSubmit}/>
        <Link to="/board">Back to Taskboard</Link>
        </div>
    );
};

export default CreateTaskPage;
