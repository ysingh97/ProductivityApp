import React, { useState, useEffect } from 'react';
import { fetchTasks } from '../services/taskService';
import { Link, useParams } from "react-router-dom";

const ListView = () => {
    const [tasks, setTasks] = useState([]); // State to store tasks
    const [loading, setLoading] = useState(true); // State to track loading status
    const [error, setError] = useState(null); // State to track errors

    const listId = useParams().listId;
    console.log(listId);

    useEffect(() => {
        const loadTasks = async () => {
          try {
            console.log("Begin load tasks");
            let taskData = await fetchTasks(); // Fetch tasks using the service
            console.log("task data: ", taskData);
            for (var i = 0; i < taskData.length; i++) {
                console.log(`i: ${i}: `, taskData[i].listId, " type of listid: ", typeof taskData[i].listId, ". listid param: ", listId, "type of listid param: ", typeof listId);
            }
            var filteredTaskData = taskData.filter(task => task.listId && task.listId.toString() === listId);
            console.log("filtered task data: ", filteredTaskData);
            setTasks(filteredTaskData); // Set the fetched tasks into state
          } catch (err) {
            setError('Failed to load tasks');
            console.error(err.message);
          } finally {
            setLoading(false); // Mark loading as finished
          }
        };
    
        loadTasks(); // Call the function on component mount
      }, []); // Empty dependency array ensures it runs once on mount
    console.log(`list ${listId.toString()} view tasks: `, tasks);
    return (
        <div>
            <ul>
                {tasks.map(task => (
                    <li key={task._id}>
                        <h3>{task.title}</h3>
                        <p>{task.description}</p>
                    </li>
                ))}
            </ul>
            <Link to="/">Back to Taskboard</Link>
        </div>
    )
}

export default ListView;