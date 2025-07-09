import React from 'react';
import { Link, useParams } from "react-router-dom";

const ListView = ({ tasks, handleTaskDelete }) => {

    const listId = useParams().listId;
    //console.log("ListView: list: ", listId, ". tasks: ", tasks);

    const onDeletePressed = (e, taskId, taskTitle) => {
        //console.log("delete pressed, taskId: ", taskId, ". taskTitle: ", taskTitle);
        handleTaskDelete(taskId);
    }
    
    if (!tasks | tasks.length === 0) {
        //console.log("listview: no tasks");
        return (
            <div>
                <p>No tasks found</p>
                <Link to="/">Back to Taskboard</Link>
            </div>
            
        );
    }

    return (
        <div>
            <ul>
                {tasks.map(task => (
                    <li key={task._id}>
                        <h3>{task.title}</h3>
                        <p>{task.description}</p>
                        <button onClick={(e) => onDeletePressed(e, task._id, task.title)}>Delete task</button>
                    </li>
                ))}
            </ul>
            <Link to="/">Back to Taskboard</Link>
        </div>
    )
}

export default ListView;