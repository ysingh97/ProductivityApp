import React, { useState, useEffect } from 'react';
import { fetchTasks, deleteTask } from '../services/taskService';
import ListView from '../features/listView';
import { useParams } from "react-router-dom";

const ListPage = () => {
    const [tasks, setTasks] = useState([]); // State to store tasks
    const [forceRerender, setForceRerender] = useState(true);

    const listId = useParams().listId;
    console.log("ListPage: ", listId);

    const handleTaskDelete = async (taskId) => {
      const response = await deleteTask(taskId);
      setTasks((prevTasks) => prevTasks.filter(task => task._id !== taskId));
    }

    useEffect(() => {
        console.log("List useEffect");
        const loadTasks = async () => {
          try {
            let response = await fetchTasks();
            let taskData = response.data;
            var filteredTaskData = taskData.filter(task => task.listId && task.listId.toString() === listId);
            setTasks(filteredTaskData);
          } catch (err) {
            console.error(err.message);
          }
        };
    
         loadTasks();
      }, []);

    return (
        <div>
          <button onClick={() => setForceRerender(prev => !prev)}>Force Re-Render</button>
          <ListView tasks={tasks} handleTaskDelete={handleTaskDelete} />
        </div>
        
    )
}

export default ListPage;